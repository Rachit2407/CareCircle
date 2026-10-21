import { API_BASE_URL } from '../api-client';
import { getScenario, type MockScenario } from './scenario';
import { mockDb } from './state';

export interface MockRequest {
  method: string;
  path: string;
  body: unknown;
  params: Record<string, string>;
}

export interface MockReply {
  status: number;
  body?: unknown;
}

export interface MockRoute {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  pattern: string;
  /** True when the route needs a signed-in session. */
  requiresSession: boolean;
  /** What the "422 validation" scenario returns for this write route. */
  demoFieldErrors?: Record<string, string>;
  handle: (request: MockRequest, scenario: MockScenario) => MockReply;
}

type MockFetch = (url: string, init: RequestInit) => Promise<Response>;

const SLOW_MS = 3500;
const abortError = (): DOMException => new DOMException('The operation was aborted.', 'AbortError');

function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Never answers. It only ends when the client's own timeout aborts the request. */
function hang(signal?: AbortSignal | null): Promise<never> {
  return new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => reject(abortError()), { once: true });
  });
}

function toResponse(reply: MockReply): Response {
  const hasBody = reply.body !== undefined && reply.status !== 204;
  return new Response(hasBody ? JSON.stringify(reply.body) : null, {
    status: reply.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function compile(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const source = pattern.replace(/:[A-Za-z]+/g, (token) => {
    keys.push(token.slice(1));
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${source}$`), keys };
}

function parseBody(init: RequestInit): unknown {
  if (typeof init.body !== 'string') return undefined;
  try {
    return JSON.parse(init.body);
  } catch {
    return undefined;
  }
}

/** Builds a fake `fetch` that behaves like the real backend, including every failure mode. */
export function createMockFetch(routes: readonly MockRoute[]): MockFetch {
  const compiled = routes.map((route) => ({ route, ...compile(route.pattern) }));

  return async (url, init) => {
    const signal = init.signal;
    const method = (init.method ?? 'GET').toUpperCase();
    const path = new URL(url, window.location.origin).pathname.replace(API_BASE_URL, '');

    const scenario = getScenario();
    await sleep(scenario === 'slow' ? SLOW_MS : 350 + Math.random() * 400, signal);

    let match: { route: MockRoute; params: Record<string, string> } | null = null;
    for (const entry of compiled) {
      const found = entry.regex.exec(path);
      if (entry.route.method === method && found) {
        const params: Record<string, string> = {};
        entry.keys.forEach((key, index) => {
          params[key] = found[index + 1] ?? '';
        });
        match = { route: entry.route, params };
        break;
      }
    }
    if (!match) return toResponse({ status: 404, body: { code: 'not_found' } });
    const { route, params } = match;

    if (scenario === 'timeout') return hang(signal);
    if (scenario === 'server_error')
      return toResponse({ status: 500, body: { code: 'server_error' } });
    if (scenario === 'unauthorized') {
      const code = route.requiresSession ? 'session_expired' : 'invalid_credentials';
      return toResponse({ status: 401, body: { code } });
    }
    if (scenario === 'validation' && method !== 'GET' && route.demoFieldErrors) {
      const body = { code: 'validation_failed', fieldErrors: route.demoFieldErrors };
      return toResponse({ status: 422, body });
    }
    if (route.requiresSession && mockDb.currentSession() === null) {
      return toResponse({ status: 401, body: { code: 'session_required' } });
    }
    return toResponse(route.handle({ method, path, body: parseBody(init), params }, scenario));
  };
}
