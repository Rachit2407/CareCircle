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
  handler: (_req: Request, _res: Response, next) => {
    next(new RateLimitError('Too many requests. Please slow down and try again later.'));
  },
});

export const alertRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.ALERT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, _res: Response, next) => {
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
