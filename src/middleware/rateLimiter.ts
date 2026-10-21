import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { RateLimitError } from '../utils/errors.js';
import { AuditService } from '../services/audit.service.js';
import { Request, Response } from 'express';

export const standardRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response, next) => {
    if (!res.getHeader('Retry-After')) {
      res.setHeader('Retry-After', String(Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000)));
    }
    next(new RateLimitError('Too many requests. Please slow down and try again later.'));
  },
});

export const alertRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.ALERT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response, next) => {
    if (!res.getHeader('Retry-After')) {
      res.setHeader('Retry-After', '60');
    }
    // Log audit event for rate limit violations on alerts
    await AuditService.log({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      patientId: req.body?.patientId,
      action: 'ALERT_RATE_LIMIT_EXCEEDED',
      targetType: 'caregiver_alert',
      result: 'DENIED',
      requestId: req.requestId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { limit: env.ALERT_RATE_LIMIT_MAX, window: '1m' },
    });

    next(new RateLimitError('Caregiver alert rate limit exceeded. Please wait before issuing new alerts.'));
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: () =>
    env.NODE_ENV === 'production' ? (env.AUTH_RATE_LIMIT_MAX || 10) : (env.AUTH_RATE_LIMIT_MAX || 200),
  max: () =>
    env.NODE_ENV === 'production' ? (env.AUTH_RATE_LIMIT_MAX || 10) : (env.AUTH_RATE_LIMIT_MAX || 200),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => {
    if (env.AUTH_RATE_LIMIT_ENABLED !== undefined) {
      return !env.AUTH_RATE_LIMIT_ENABLED;
    }
    return env.NODE_ENV === 'test';
  },
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const email = (req.body?.email || '').toLowerCase().trim();
    return `${ip}_${email}`;
  },
  handler: (_req: Request, res: Response, next) => {
    if (!res.getHeader('Retry-After')) {
      res.setHeader('Retry-After', '900');
    }
    next(new RateLimitError('Too many authentication attempts. Please try again later.'));
  },
});
