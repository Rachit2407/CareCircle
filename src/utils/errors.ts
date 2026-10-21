export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_SCOPE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'BUSINESS_RULE_VIOLATION'
  | 'RATE_LIMITED'
  | 'INTERNAL_SERVER_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Check the submitted fields', details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required or token expired') {
    super(401, 'UNAUTHENTICATED', message);
  }
}

export class ForbiddenScopeError extends AppError {
  constructor(message = 'You do not have permission to access or modify this patient scope') {
    super(403, 'FORBIDDEN_SCOPE', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Requested resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict or concurrent modification', code: ErrorCode = 'CONFLICT', details?: unknown) {
    super(409, code, message, details);
  }
}


export class BusinessRuleError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, 'BUSINESS_RULE_VIOLATION', message, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded. Please try again later.') {
    super(429, 'RATE_LIMITED', message);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'An unexpected server error occurred') {
    super(500, 'INTERNAL_SERVER_ERROR', message);
  }
}
