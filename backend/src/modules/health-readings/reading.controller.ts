import { Request, Response, NextFunction } from 'express';
import { HealthReading } from './reading.model.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { ForbiddenScopeError } from '../../utils/errors.js';
import { AuditService } from '../../services/audit.service.js';
import mongoose from 'mongoose';

export class HealthReadingController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, type, value, unit, measuredAt, source, notes } = req.body;
      const user = req.user!;

      if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
        throw new ForbiddenScopeError('Not permitted to record health readings for this patient');
      }

      const reading = await HealthReading.create({
        patientId: new mongoose.Types.ObjectId(patientId),
        type,
        value,
        unit,
        measuredAt: new Date(measuredAt),
        source: source || 'manual',
        notes,
        recordedBy: new mongoose.Types.ObjectId(user.id),
      });

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        action: 'ADD_HEALTH_READING',
        targetType: 'healthReading',
        targetId: reading._id.toString(),
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { type, unit, source },
      });

      sendSuccess(res, { reading }, 201);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter: any = {};
      const { patientId, type, from, to, limit } = req.query as any;

      if (patientId) {
        if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
          throw new ForbiddenScopeError('Not permitted to view health readings for this patient');
        }
        filter.patientId = new mongoose.Types.ObjectId(patientId);
      } else if (req.authorizedPatientIds) {
        filter.patientId = { $in: req.authorizedPatientIds.map((id) => new mongoose.Types.ObjectId(id)) };
      }

      if (type) {
        filter.type = type;
      }

      if (from || to) {
        filter.measuredAt = {};
        if (from) filter.measuredAt.$gte = new Date(from);
        if (to) filter.measuredAt.$lte = new Date(to);
      }

      const readings = await HealthReading.find(filter)
        .populate('recordedBy', 'displayName role')
        .sort({ measuredAt: -1 })
        .limit(Number(limit) || 50);

      sendSuccess(res, { readings });
    } catch (error) {
      next(error);
    }
  }
}
