import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { UnauthenticatedError, ForbiddenScopeError } from '../utils/errors.js';
import { User, UserRole } from '../modules/users/user.model.js';

export interface AuthUserPayload {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  timezone: string;
  tokenVersion?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Check for Internal Service Token (AI Engine / internal MCP client calls)
    const serviceToken = req.headers['x-internal-service-token'];
    if (env.AI_ENABLED && env.INTERNAL_SERVICE_TOKEN && typeof serviceToken === 'string') {
      const expectedBuf = Buffer.from(env.INTERNAL_SERVICE_TOKEN);
      const providedBuf = Buffer.from(serviceToken);
      if (expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf)) {
        req.user = {
          id: (req.headers['x-actor-id'] as string) || '000000000000000000000001',
          email: 'ai-engine@carecircle.internal',
          displayName: 'CareCircle AI Engine',
          role: 'admin',
          timezone: 'UTC',
        };
        return next();
      }
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

    // Check token revocation if tokenVersion is present
    if (decoded.tokenVersion !== undefined) {
      const user = await User.findById(decoded.id).select('tokenVersion');
      if (!user) {
        throw new UnauthenticatedError('User no longer exists');
      }
      if (user.tokenVersion > decoded.tokenVersion) {
        throw new UnauthenticatedError('Token revoked. Please login again.');
      }
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      displayName: decoded.displayName,
      role: decoded.role,
      timezone: decoded.timezone || 'UTC',
      tokenVersion: decoded.tokenVersion,
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
      return next(new ForbiddenScopeError('You do not possess the required role'));
    }

    next();
  };
};
