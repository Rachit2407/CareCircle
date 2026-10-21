import { env } from '../config/env.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'symptoms',
  'painscore',
  'feeling',
  'medicationname',
  'instructions',
  'notes',
  'phonenumber',
  'ssn',
]);

const redactObject = (obj: any, depth = 0): any => {
  if (depth > 5 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, depth + 1));
  }

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
};

export const logger = {
  info: (message: string, meta?: any) => {
    if (env.LOG_LEVEL !== 'warn' && env.LOG_LEVEL !== 'error') {
      const sanitizedMeta = meta ? redactObject(meta) : '';
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, sanitizedMeta ? JSON.stringify(sanitizedMeta) : '');
    }
  },
  warn: (message: string, meta?: any) => {
    if (env.LOG_LEVEL !== 'error') {
      const sanitizedMeta = meta ? redactObject(meta) : '';
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, sanitizedMeta ? JSON.stringify(sanitizedMeta) : '');
    }
  },
  error: (message: string, error?: any) => {
    const sanitized = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : redactObject(error);
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, sanitized ? JSON.stringify(sanitized) : '');
  },
  debug: (message: string, meta?: any) => {
    if (env.LOG_LEVEL === 'debug' || env.LOG_LEVEL === 'trace') {
      const sanitizedMeta = meta ? redactObject(meta) : '';
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, sanitizedMeta ? JSON.stringify(sanitizedMeta) : '');
    }
  },
};
