import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { IdempotencyRecord } from '../modules/idempotency/idempotency.model.js';
import { ConflictError } from '../utils/errors.js';
import mongoose from 'mongoose';

export const idempotency = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only apply idempotency to mutating requests (POST, PUT, PATCH)
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      return next();
    }

    const key = idempotencyKey.trim();
    const endpoint = `${req.method} ${req.baseUrl || ''}${req.path}`;
    const actorId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;

    // Hash the request body to verify payload integrity
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body || {}))
      .digest('hex');

    try {
      const existingRecord = await IdempotencyRecord.findOne({ key });
      if (existingRecord) {
        if (existingRecord.requestHash !== requestHash) {
          throw new ConflictError(
            'Idempotency key has already been used with a different request payload',
            'IDEMPOTENCY_CONFLICT'
          );
        }

        // Return stored idempotent response
        res.setHeader('X-Cache-Lookup', 'HIT');
        res.setHeader('X-Idempotent-Replay', 'true');
        res.status(existingRecord.statusCode).json(existingRecord.responseBody);
        return;
      }

      // Intercept res.json to capture response
      const originalJson = res.json.bind(res);
      res.json = (body: any): Response => {
        // Only cache 2xx and 4xx responses, don't cache 5xx server crashes
        if (res.statusCode >= 200 && res.statusCode < 500) {
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          IdempotencyRecord.create({
            key,
            actorId,
            endpoint,
            requestHash,
            statusCode: res.statusCode,
            responseBody: body,
            expiresAt,
          }).catch((err) => {
            // Log error without breaking current response
            console.error('Failed to save idempotency record:', err);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};
