import { Request, Response, NextFunction } from 'express';
import { CareRelationship, CaregiverPermission } from '../modules/relationships/careRelationship.model.js';
import { ForbiddenScopeError, UnauthenticatedError, ValidationError } from '../utils/errors.js';
import { AuditService } from '../services/audit.service.js';
import mongoose from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      targetPatientId?: string;
      authorizedPatientIds?: string[];
    }
  }
}

export const authorizePatientAccess = (requiredPermission?: CaregiverPermission) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        throw new UnauthenticatedError();
      }

      // 1. Identify target patientId if present in request (body, query, or params)
      const rawPatientId =
        req.body?.patientId ||
        req.query?.patientId ||
        req.params?.patientId;

      let targetPatientId: string | undefined = rawPatientId ? String(rawPatientId).trim() : undefined;

      // Validate ObjectId format if a patientId was supplied
      if (targetPatientId && !mongoose.Types.ObjectId.isValid(targetPatientId)) {
        throw new ValidationError(`Invalid patientId format: '${targetPatientId}'`);
      }

      // 2. Admin role bypasses scoping
      if (user.role === 'admin') {
        req.targetPatientId = targetPatientId;
        return next();
      }

      // 3. Patient role handling
      if (user.role === 'patient') {
        // A patient can ONLY access their own records
        if (targetPatientId && targetPatientId !== user.id) {
          await AuditService.log({
            actorId: user.id,
            actorRole: user.role,
            patientId: targetPatientId,
            action: 'SCOPE_ACCESS_DENIED',
            targetType: 'patient_scope',
            result: 'DENIED',
            requestId: req.requestId,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            metadata: { attemptedPatientId: targetPatientId, reason: 'Patient attempting to access another patient' },
          });
          throw new ForbiddenScopeError('Patients are only authorized to access their own care records');
        }

        req.targetPatientId = user.id;
        req.authorizedPatientIds = [user.id];
        return next();
      }

      // 4. Caregiver role handling
      if (user.role === 'caregiver') {
        if (targetPatientId) {
          // Explicit patient specified - verify relationship and consent
          const relationship = await CareRelationship.findOne({
            patientId: new mongoose.Types.ObjectId(targetPatientId),
            caregiverId: new mongoose.Types.ObjectId(user.id),
            consentStatus: 'active',
          });

          if (!relationship) {
            await AuditService.log({
              actorId: user.id,
              actorRole: user.role,
              patientId: targetPatientId,
              action: 'CAREGIVER_SCOPE_DENIED',
              targetType: 'care_relationship',
              result: 'DENIED',
              requestId: req.requestId,
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
              metadata: { targetPatientId, reason: 'No active consent relationship found' },
            });
            throw new ForbiddenScopeError('No active care relationship or consent granted for this patient');
          }

          if (
            requiredPermission &&
            !relationship.permissions.includes('all') &&
            !relationship.permissions.includes(requiredPermission)
          ) {
            await AuditService.log({
              actorId: user.id,
              actorRole: user.role,
              patientId: targetPatientId,
              action: 'PERMISSION_CHECK_FAILED',
              targetType: 'care_relationship',
              result: 'DENIED',
              requestId: req.requestId,
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
              metadata: { targetPatientId, requiredPermission, actualPermissions: relationship.permissions },
            });
            throw new ForbiddenScopeError(`Caregiver lacks required permission: '${requiredPermission}'`);
          }

          req.targetPatientId = targetPatientId;
          req.authorizedPatientIds = [targetPatientId];
          return next();
        } else {
          // List request without single patient specified: load all authorized patient IDs for this caregiver
          const relationships = await CareRelationship.find({
            caregiverId: new mongoose.Types.ObjectId(user.id),
            consentStatus: 'active',
          }).select('patientId permissions');

          const permittedIds: string[] = [];
          for (const rel of relationships) {
            if (
              !requiredPermission ||
              rel.permissions.includes('all') ||
              rel.permissions.includes(requiredPermission)
            ) {
              permittedIds.push(rel.patientId.toString());
            }
          }

          req.authorizedPatientIds = permittedIds;
          return next();
        }
      }

      throw new ForbiddenScopeError('Role not recognized for patient scoping');
    } catch (error) {
      next(error);
    }
  };
};
