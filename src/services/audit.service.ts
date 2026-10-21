import { AuditEvent, AuditResult, IAuditEvent } from '../modules/audit/audit.model.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Types } from 'mongoose';

export interface AuditLogParams {
  actorId?: Types.ObjectId | string;
  actorRole?: string;
  patientId?: Types.ObjectId | string;
  action: string;
  targetType: string;
  targetId?: string;
  result: AuditResult;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  public static async log(params: AuditLogParams): Promise<IAuditEvent | null> {
    if (!env.AUDIT_LOG_ENABLED) {
      return null;
    }

    try {
      const record = await AuditEvent.create({
        actorId:
          params.actorId && Types.ObjectId.isValid(params.actorId.toString())
            ? new Types.ObjectId(params.actorId.toString())
            : undefined,
        actorRole: params.actorRole,
        patientId:
          params.patientId && Types.ObjectId.isValid(params.patientId.toString())
            ? new Types.ObjectId(params.patientId.toString())
            : undefined,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        result: params.result,
        requestId: params.requestId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata || {},
      });
      return record;
    } catch (error) {
      logger.error('Failed to persist audit event', error);
      return null;
    }
  }
}
