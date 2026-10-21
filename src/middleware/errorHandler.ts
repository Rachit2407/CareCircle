import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.requestId || (req.headers['x-request-id'] as string);

  // If already an operational AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${err.code}] ${err.message}`, { requestId, details: err.details, stack: err.stack });
    } else {
      logger.warn(`[${err.code}] ${err.message}`, { requestId, path: req.path, details: err.details });
    }

    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    logger.warn(`Mongoose CastError for path ${err.path}`, { requestId });
    sendError(res, 400, 'VALIDATION_ERROR', `Invalid format for field '${err.path}'`);
    return;
  }

  // Handle Mongoose duplicate key error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'email';
    logger.warn(`Duplicate key error on ${field}`, { requestId });
    sendError(res, 409, 'CONFLICT', `An account with this ${field} already exists`, [
      { field, message: `An account with this ${field} already exists` },
    ]);
    return;
  }

  // Handle JSON body parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn('Malformed JSON request body', { requestId });
    sendError(res, 400, 'VALIDATION_ERROR', 'Malformed JSON in request body');
    return;
  }

  // Unhandled / unexpected 500 server errors
  logger.error('Unhandled internal server error', {
    requestId,
    message: err.message,
    stack: err.stack,
  });

  const message = env.NODE_ENV === 'production'
    ? 'An unexpected server error occurred'
    : err.message || 'Internal server error';

  sendError(res, 500, 'INTERNAL_SERVER_ERROR', message);
};
