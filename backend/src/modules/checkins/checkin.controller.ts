import { Request, Response, NextFunction } from 'express';
import { CheckIn } from './checkin.model.js';
import { Appointment } from '../appointments/appointment.model.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { ForbiddenScopeError, NotFoundError, BusinessRuleError, ValidationError } from '../../utils/errors.js';
import { AuditService } from '../../services/audit.service.js';
import mongoose from 'mongoose';

export class CheckInController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, appointmentId, feeling, painScore, symptoms, notes, aiSummary, respondentType } = req.body;
      const user = req.user!;

      if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
        throw new ForbiddenScopeError('Not permitted to record check-ins for this patient');
      }

      // If linked appointment is provided, validate it belongs to this patient
      let appointmentObjectId: mongoose.Types.ObjectId | undefined;
      if (appointmentId) {
        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
          throw new ValidationError('Invalid appointmentId format');
        }
        const appt = await Appointment.findById(appointmentId);
        if (!appt) {
          throw new NotFoundError('Linked appointment not found');
        }
        if (appt.patientId.toString() !== patientId) {
          throw new BusinessRuleError('Linked appointment does not belong to the specified patient');
        }
        appointmentObjectId = new mongoose.Types.ObjectId(appointmentId);
      }

      const checkIn = await CheckIn.create({
        patientId: new mongoose.Types.ObjectId(patientId),
        appointmentId: appointmentObjectId,
        feeling,
        painScore,
        symptoms: symptoms || [],
        notes, // Preserved verbatim
        aiSummary: aiSummary ? `[AI GENERATED - NON-CLINICAL]: ${aiSummary}` : undefined,
        respondentType: respondentType || 'patient',
        recordedBy: new mongoose.Types.ObjectId(user.id),
      });

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        action: 'CREATE_CHECK_IN',
        targetType: 'checkIn',
        targetId: checkIn._id.toString(),
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { feeling, painScore, linkedAppointment: appointmentId ? true : false },
      });

      sendSuccess(res, { checkIn }, 201);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter: any = {};
      const { patientId, appointmentId, limit } = req.query as any;

      if (patientId) {
        if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
          throw new ForbiddenScopeError('Not permitted to view check-ins for this patient');
        }
        filter.patientId = new mongoose.Types.ObjectId(patientId);
      } else if (req.authorizedPatientIds) {
        filter.patientId = { $in: req.authorizedPatientIds.map((id) => new mongoose.Types.ObjectId(id)) };
      }

      if (appointmentId) {
        filter.appointmentId = new mongoose.Types.ObjectId(appointmentId);
      }

      const checkIns = await CheckIn.find(filter)
        .populate('appointmentId', 'provider startsAt location status')
        .populate('recordedBy', 'displayName role')
        .sort({ createdAt: -1 })
        .limit(Number(limit) || 50);

      sendSuccess(res, { checkIns });
    } catch (error) {
      next(error);
    }
  }
}
