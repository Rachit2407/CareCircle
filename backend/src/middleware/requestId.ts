import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = req.headers['x-request-id'] as string;
  const requestId = existingId && existingId.trim().length > 0 ? existingId : uuidv4();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};
