import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { User, IUser } from '../users/user.model.js';
import { CareRelationship } from '../relationships/careRelationship.model.js';
import { UnauthenticatedError } from '../../utils/errors.js';
import { env } from '../../config/env.js';

interface FormattedSessionUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  timezone: string;
  timeZone: string;
  phone?: string;
  createdAt: Date;
}

interface FormattedCircle {
  id: string;
  name: string;
  recipientName: string;
  role: string;
}

export class AuthController {
  private static formatSessionUser(user: any): FormattedSessionUser {
    const tz = user.timezone || 'Asia/Kolkata';
    return {
      id: user._id ? user._id.toString() : user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      timezone: tz,
      timeZone: tz,
      phone: user.phone,
      createdAt: user.createdAt,
    };
  }

  private static async getCircleForUser(user: any): Promise<FormattedCircle | null> {
    try {
      const userId = user._id || user.id;
      if (user.role === 'caregiver') {
        const rel = await CareRelationship.findOne({
          caregiverId: userId,
          consentStatus: 'active',
        }).populate('patientId');

        if (rel && rel.patientId) {
          const patient = rel.patientId as any;
          return {
            id: rel._id.toString(),
            name: `${patient.displayName || 'Family'}'s Circle`,
            recipientName: patient.displayName || 'Care Recipient',
            role: rel.relationshipType || 'Primary caregiver',
          };
        }
      } else if (user.role === 'patient') {
        const rel = await CareRelationship.findOne({
          patientId: userId,
          consentStatus: 'active',
        });

        return {
          id: rel ? rel._id.toString() : userId.toString(),
          name: `${user.displayName}'s Circle`,
          recipientName: user.displayName,
          role: 'Patient',
        };
      }
    } catch {
      // Fallback if relationship collection query fails
    }
    return null;
  }

  private static setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private static buildAuthResponse(
    req: Request,
    userSafe: FormattedSessionUser,
    circle: FormattedCircle | null,
    tokens: any
  ) {
    const includeTokens =
      env.RETURN_TOKENS_IN_BODY ||
      req.headers['x-client-type'] === 'native';

    if (includeTokens) {
      return { user: userSafe, circle, tokens };
    }
    return { user: userSafe, circle };
  }

  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await AuthService.register(req.body, req.requestId);
      const userSafe = AuthController.formatSessionUser(user);
      const circle = await AuthController.getCircleForUser(user);

      AuthController.setAuthCookies(res, tokens);
      const responsePayload = AuthController.buildAuthResponse(req, userSafe, circle, tokens);
      sendSuccess(res, responsePayload, 201);
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const { user, tokens } = await AuthService.login(email, password, req.requestId);
      const userSafe = AuthController.formatSessionUser(user);
      const circle = await AuthController.getCircleForUser(user);

      AuthController.setAuthCookies(res, tokens);
      const responsePayload = AuthController.buildAuthResponse(req, userSafe, circle, tokens);
      sendSuccess(res, responsePayload, 200);
    } catch (error) {
      next(error);
    }
  }

  public static async session(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById(req.user?.id).select('-passwordHash');
      if (!user) {
        throw new UnauthenticatedError('User session not found');
      }

      const userSafe = AuthController.formatSessionUser(user);
      const circle = await AuthController.getCircleForUser(user);

      sendSuccess(res, { user: userSafe, circle }, 200);
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Bumping tokenVersion revokes issued JWTs
      if (req.user?.id) {
        await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
      }

      res.clearCookie('accessToken', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });
      res.clearCookie('refreshToken', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });
      sendSuccess(res, { ok: true, message: 'Logged out successfully' }, 200);
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let refreshToken = req.body?.refreshToken;
      if (!refreshToken) {
        if ((req as any).cookies?.refreshToken) {
          refreshToken = (req as any).cookies.refreshToken;
        } else if (req.headers.cookie) {
          const cookies = Object.fromEntries(
            req.headers.cookie.split(';').map((c) => {
              const [k, ...v] = c.trim().split('=');
              return [k, decodeURIComponent(v.join('='))];
            })
          );
          refreshToken = cookies.refreshToken;
        }
      }

      if (!refreshToken) {
        throw new UnauthenticatedError('Refresh token is required');
      }

      const tokens = await AuthService.refresh(refreshToken);
      AuthController.setAuthCookies(res, tokens);

      const includeTokens =
        env.RETURN_TOKENS_IN_BODY ||
        req.headers['x-client-type'] === 'native';

      if (includeTokens) {
        sendSuccess(res, { tokens }, 200);
      } else {
        sendSuccess(res, { message: 'Token refreshed successfully' }, 200);
      }
    } catch (error) {
      next(error);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById(req.user?.id).select('-passwordHash');
      if (!user) {
        throw new UnauthenticatedError('User profile not found');
      }

      const userSafe = AuthController.formatSessionUser(user);
      const circle = await AuthController.getCircleForUser(user);
      sendSuccess(res, { user: userSafe, circle }, 200);
    } catch (error) {
      next(error);
    }
  }
}
