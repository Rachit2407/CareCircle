import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../users/user.model.js';
import { env } from '../../config/env.js';
import { ConflictError, UnauthenticatedError } from '../../utils/errors.js';
import { RegisterInput } from './auth.schemas.js';
import { AuthUserPayload } from '../../middleware/auth.js';
import { AuditService } from '../../services/audit.service.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateTokens(user: IUser | { _id: any; id?: string; email: string; displayName: string; role: UserRole; timezone: string }): TokenPair {
    const userId = (user as any)._id?.toString() || (user as any).id;
    const payload: AuthUserPayload = {
      id: userId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      timezone: user.timezone || 'UTC',
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_EXPIRES_IN,
    };
  }

  public static async register(data: RegisterInput, requestId?: string): Promise<{ user: IUser; tokens: TokenPair }> {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new ConflictError('An account with this email already exists', 'CONFLICT', [
        { field: 'email', message: 'An account with this email already exists' },
      ]);
    }

    const passwordHash = await this.hashPassword(data.password);
    const user = await User.create({
      displayName: data.displayName,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      phone: data.phone,
      timezone: data.timezone,
    });

    const tokens = this.generateTokens(user);

    await AuditService.log({
      actorId: user._id,
      actorRole: user.role,
      action: 'USER_REGISTERED',
      targetType: 'user',
      targetId: user._id.toString(),
      result: 'SUCCESS',
      requestId,
      metadata: { role: user.role, email: user.email },
    });

    return { user, tokens };
  }

  public static async login(email: string, password: string, requestId?: string): Promise<{ user: IUser; tokens: TokenPair }> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      await AuditService.log({
        action: 'USER_LOGIN_FAILED',
        targetType: 'user',
        result: 'FAILED',
        requestId,
        metadata: { attemptedEmail: email, reason: 'User not found' },
      });
      throw new UnauthenticatedError('Invalid email or password');
    }

    const isMatch = await this.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      await AuditService.log({
        actorId: user._id,
        actorRole: user.role,
        action: 'USER_LOGIN_FAILED',
        targetType: 'user',
        targetId: user._id.toString(),
        result: 'FAILED',
        requestId,
        metadata: { email, reason: 'Incorrect password' },
      });
      throw new UnauthenticatedError('Invalid email or password');
    }

    const tokens = this.generateTokens(user);

    await AuditService.log({
      actorId: user._id,
      actorRole: user.role,
      action: 'USER_LOGGED_IN',
      targetType: 'user',
      targetId: user._id.toString(),
      result: 'SUCCESS',
      requestId,
    });

    return { user, tokens };
  }

  public static async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new UnauthenticatedError('User no longer exists');
      }
      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthenticatedError('Invalid or expired refresh token');
    }
  }
}
