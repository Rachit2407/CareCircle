import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';

export const aiGuard = (_req: Request, res: Response, next: NextFunction): void => {
  if (!env.AI_ENABLED) {
    sendError(res, 503, 'AI_DISABLED', 'AI features are not enabled.');
    return;
  }
  next();
};
