import { z } from 'zod';
import { ApiError, type ApiErrorKind } from './api-error';

/**
 * The ONLY module allowed to call fetch (ESLint enforces this). It centralises base URL,
 * credentials, runtime validation, error normalisation, timeouts and cancellation.
 * It never retries: retrying a write could duplicate it.
 */

type Transport = (url: string, init: RequestInit) => Promise<Response>;
type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type Schema<T> = z.ZodType<T, z.ZodTypeDef, unknown>;

const DEFAULT_TIMEOUT_MS = 15_000;
const timeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
/** Exported so the mock transport can strip the same prefix the client adds. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');

let transport: Transport = (url, init) => fetch(url, init);
let unauthorizedHandler: (() => void) | null = null;

/** Used by the mock layer only. App code never calls this. */
export function setTransport(next: Transport): void {
  transport = next;
}

/** Called when a signed-in request comes back 401, so the session guard can react once. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  signal?: AbortSignal;
  /** For auth endpoints, where a 401 means "wrong credentials" rather than "session ended". */
  suppressUnauthorized?: boolean;
}

const errorBodySchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  fieldErrors: z.record(z.union([z.string(), z.array(z.string())])).optional(),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().optional(),
      fieldErrors: z.record(z.union([z.string(), z.array(z.string())])).optional(),
    })
    .optional(),
});

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'client';
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const parsed = errorBodySchema.safeParse(await readJson(response));
  const body = parsed.success ? parsed.data : {};
  const code = body.code ?? body.error?.code;
  const rawFieldErrors = body.fieldErrors ?? body.error?.fieldErrors ?? {};
  const fieldErrors: Record<string, string> = {};
  for (const [field, value] of Object.entries(rawFieldErrors)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) fieldErrors[field] = first;
  }
  return new ApiError(kindFromStatus(response.status), {
    status: response.status,
    code,
    fieldErrors,
  });
}

async function send(
  method: Method,
  path: string,
  body: unknown,
  options: RequestOptions,
): Promise<Response> {
  const isWrite = method !== 'GET';
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const relayAbort = (): void => controller.abort();
  options.signal?.addEventListener('abort', relayAbort, { once: true });

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await transport(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      signal: controller.signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.ok) return response;
    throw await toApiError(response);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.kind === 'unauthorized' && !options.suppressUnauthorized) unauthorizedHandler?.();
      throw error;
    }
    // The caller cancelled (for example a query unmounted): not a failure, let it pass through.
    if (options.signal?.aborted) throw error;
    // No response arrived. For a write we cannot know whether it was saved.
    if (timedOut) throw new ApiError(isWrite ? 'unconfirmed' : 'timeout');
    throw new ApiError(isWrite ? 'unconfirmed' : 'offline');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', relayAbort);
  }
}

async function parse<T>(response: Response, schema: Schema<T>, isWrite: boolean): Promise<T> {
  const result = schema.safeParse(await readJson(response));
  // A 2xx we cannot read means the write may well have been saved, so it is "unconfirmed".
  if (!result.success) throw new ApiError(isWrite ? 'unconfirmed' : 'invalid_response');
  return result.data;
}

export const api = {
  async get<T>(path: string, schema: Schema<T>, options: RequestOptions = {}): Promise<T> {
    return parse(await send('GET', path, undefined, options), schema, false);
  },
  async post<T>(
    path: string,
    body: unknown,
    schema: Schema<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    return parse(await send('POST', path, body, options), schema, true);
  },
  async postVoid(path: string, body: unknown, options: RequestOptions = {}): Promise<void> {
    await send('POST', path, body, options);
  },
  async patch<T>(
    path: string,
    body: unknown,
    schema: Schema<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    return parse(await send('PATCH', path, body, options), schema, true);
  },
  async patchVoid(path: string, body: unknown, options: RequestOptions = {}): Promise<void> {
    await send('PATCH', path, body, options);
  },
  async putVoid(path: string, body: unknown, options: RequestOptions = {}): Promise<void> {
    await send('PUT', path, body, options);
  },
  async deleteVoid(path: string, options: RequestOptions = {}): Promise<void> {
    await send('DELETE', path, undefined, options);
  },
};
