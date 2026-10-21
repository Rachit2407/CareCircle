import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthenticatedError } from '../utils/errors.js';
import { UserRole } from '../modules/users/user.model.js';

export interface AuthUserPayload {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  timezone: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    // 1. Check for Internal Service Token (AI Engine / internal MCP client calls)
    const serviceToken = req.headers['x-internal-service-token'];
    if (serviceToken && serviceToken === env.INTERNAL_SERVICE_TOKEN) {
      req.user = {
        id: (req.headers['x-actor-id'] as string) || 'system_ai_engine',
        email: 'ai-engine@carecircle.internal',
        displayName: 'CareCircle AI Engine',
        role: 'admin',
        timezone: 'UTC',
      };
      return next();
    }

    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if ((req as any).cookies?.accessToken) {
      token = (req as any).cookies.accessToken;
    } else if (req.headers.cookie) {
      // Parse cookie string
      const cookies = Object.fromEntries(
        req.headers.cookie.split(';').map((c) => {
          const [k, ...v] = c.trim().split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      );
      token = cookies.accessToken;
    }

    if (!token) {
      throw new UnauthenticatedError('Missing authorization token');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
    if (!decoded || !decoded.id || !decoded.role) {
      throw new UnauthenticatedError('Invalid token payload');
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      displayName: decoded.displayName,
      role: decoded.role,
      timezone: decoded.timezone || 'UTC',
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new UnauthenticatedError('Token expired. Please refresh your session.'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new UnauthenticatedError('Invalid or corrupted authorization token'));
    } else {
      next(error);
    }
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthenticatedError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new UnauthenticatedError('You do not possess the required role'));
    }

    next();
  };
};
