import { Response } from 'express';
import { ErrorCode } from './errors.js';

export interface SuccessEnvelope<T> {
  data: T;
  requestId?: string;
  meta?: Record<string, unknown>;
}

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>
): Response => {
  const requestId = (res.req as any)?.requestId || (res.getHeader('X-Request-ID') as string);
  const payload: any = {
    data,
    requestId,
    ...(meta ? { meta } : {}),
  };

  // If data is an object, merge properties at root for frontend unnested schema compatibility
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    Object.assign(payload, data);
  }

  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: unknown
): Response => {
  const requestId = (res.req as any)?.requestId || (res.getHeader('X-Request-ID') as string);

  // Extract fieldErrors dictionary for frontend forms
  let fieldErrors: Record<string, string> | undefined;
  if (Array.isArray(details)) {
    fieldErrors = {};
    for (const item of details) {
      if (item && typeof item === 'object' && 'field' in item && 'message' in item) {
        fieldErrors[item.field] = String(item.message);
      }
    }
  }

  const payload: any = {
    code,
    ...(fieldErrors ? { fieldErrors } : {}),
    error: {
      code,
      message,
      requestId,
      ...(details ? { details } : {}),
      ...(fieldErrors ? { fieldErrors } : {}),
    },
  };
  return res.status(statusCode).json(payload);
};
