import { Request, Response, NextFunction } from 'express';
import { CareRelationship } from '../relationships/careRelationship.model.js';
import { NotificationService } from '../../services/notification.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { ForbiddenScopeError } from '../../utils/errors.js';
import { AuditService } from '../../services/audit.service.js';
import mongoose from 'mongoose';

export class AlertController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, severity, title, message, suggestedAction, channels, source } = req.body;
      const user = req.user!;

      // Verify caller is authorized for this patient scope
      if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
        await AuditService.log({
          actorId: user.id,
          actorRole: user.role,
          patientId,
          action: 'CREATE_ALERT_DENIED',
          targetType: 'caregiver_alert',
          result: 'DENIED',
          requestId: req.requestId,
          metadata: { reason: 'Caller not authorized for patient' },
        });
        throw new ForbiddenScopeError('Not permitted to trigger alerts for this patient');
      }

      // Find all active caregivers with receive_alerts permission for this patient
      const relationships = await CareRelationship.find({
        patientId: new mongoose.Types.ObjectId(patientId),
        consentStatus: 'active',
        $or: [{ permissions: 'receive_alerts' }, { permissions: 'all' }],
      });

      const recipientIds = relationships.map((r) => r.caregiverId.toString());

      // If user is caregiver triggering alert, also notify patient or other caregivers
      const dispatches: any[] = [];
      const alertPayload = {
        title,
        message,
        severity,
        suggestedAction,
        source: source || 'manual',
        triggeredBy: user.id,
      };

      for (const recipientId of recipientIds) {
        for (const channel of channels || ['push']) {
          const notification = await NotificationService.enqueue({
            patientId,
            recipientId,
            channel,
            eventType: 'caregiver_alert',
            payload: alertPayload,
          });
          dispatches.push({
            notificationId: notification._id,
            recipientId,
            channel,
            status: notification.status,
          });
        }
      }

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        action: 'CREATE_CAREGIVER_ALERT',
        targetType: 'caregiver_alert',
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { severity, recipientCount: recipientIds.length, channels },
      });

      sendSuccess(
        res,
        {
          alert: {
            patientId,
            severity,
            title,
            message,
            suggestedAction,
            recipientsNotified: recipientIds.length,
            notifications: dispatches,
          },
        },
        201
      );
    } catch (error) {
      next(error);
    }
  }
}
