import { Request, Response, NextFunction } from 'express';
import { AuditEvent } from './audit.model.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { ForbiddenScopeError } from '../../utils/errors.js';
import mongoose from 'mongoose';

export class AuditController {
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter: any = {};
      const { patientId, action, result, limit } = req.query as any;

      if (patientId) {
        if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
          throw new ForbiddenScopeError('Not permitted to view audit logs for this patient');
        }
        filter.patientId = new mongoose.Types.ObjectId(patientId);
      } else if (req.authorizedPatientIds) {
        filter.patientId = { $in: req.authorizedPatientIds.map((id) => new mongoose.Types.ObjectId(id)) };
      }

      if (action) filter.action = action;
      if (result) filter.result = result;

      const events = await AuditEvent.find(filter)
        .populate('actorId', 'displayName email role')
        .sort({ createdAt: -1 })
        .limit(Number(limit) || 50);

      sendSuccess(res, { events });
    } catch (error) {
      next(error);
    }
  }
}
