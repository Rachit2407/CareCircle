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
    const actorId =
      req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id)
        ? new mongoose.Types.ObjectId(req.user.id)
        : new mongoose.Types.ObjectId('000000000000000000000000');

    // Hash the request body to verify payload integrity
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body || {}))
      .digest('hex');

    try {
      // 1. Check existing record scoped by { actorId, key }
      const existingRecord = await IdempotencyRecord.findOne({ actorId, key });
      if (existingRecord) {
        if (existingRecord.endpoint !== endpoint) {
          throw new ConflictError(
            'Idempotency key has already been used on a different endpoint',
            'IDEMPOTENCY_CONFLICT'
          );
        }

        if (existingRecord.requestHash !== requestHash) {
          throw new ConflictError(
            'Idempotency key has already been used with a different request payload',
            'IDEMPOTENCY_CONFLICT'
          );
        }

        if (existingRecord.status === 'processing') {
          throw new ConflictError(
            'A request with this idempotency key is currently processing',
            'IDEMPOTENCY_CONFLICT'
          );
        }

        if (existingRecord.status === 'completed') {
          // Return stored idempotent response
          res.setHeader('X-Cache-Lookup', 'HIT');
          res.setHeader('X-Idempotent-Replay', 'true');
          res.status(existingRecord.statusCode || 200).json(existingRecord.responseBody);
          return;
        }

        // If previous attempt failed, clean up and allow retry
        await IdempotencyRecord.deleteOne({ _id: existingRecord._id });
      }

      // 2. Insert 'processing' record to prevent concurrent duplicate execution
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      try {
        await IdempotencyRecord.create({
          key,
          actorId,
          endpoint,
          requestHash,
          status: 'processing',
          expiresAt,
        });
      } catch (createErr: any) {
        if (createErr.code === 11000) {
          // Another request acquired the processing lock concurrently
          throw new ConflictError(
            'A request with this idempotency key is currently processing',
            'IDEMPOTENCY_CONFLICT'
          );
        }
        throw createErr;
      }

      // 3. Intercept res.json to capture response on completion
      const originalJson = res.json.bind(res);
      let captured = false;

      res.json = (body: any): Response => {
        if (!captured) {
          captured = true;
          if (res.statusCode >= 200 && res.statusCode < 500) {
            IdempotencyRecord.updateOne(
              { actorId, key },
              {
                status: 'completed',
                statusCode: res.statusCode,
                responseBody: body,
              }
            ).catch((err) => {
              console.error('Failed to update idempotency record:', err);
            });
          } else {
            // For 5xx server crashes, release the lock so the client can retry
            IdempotencyRecord.deleteOne({ actorId, key }).catch(() => {});
          }
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};
