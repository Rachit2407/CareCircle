import { Request, Response, NextFunction } from 'express';
import { Appointment } from './appointment.model.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { ForbiddenScopeError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { AuditService } from '../../services/audit.service.js';
import mongoose from 'mongoose';

export class AppointmentController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.body.patientId;
      const user = req.user!;

      if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
        throw new ForbiddenScopeError('Not permitted to create appointments for this patient');
      }

      const appointment = await Appointment.create({
        patientId: new mongoose.Types.ObjectId(patientId),
        provider: req.body.provider,
        specialty: req.body.specialty,
        startsAt: new Date(req.body.startsAt),
        endsAt: req.body.endsAt ? new Date(req.body.endsAt) : undefined,
        timezone: req.body.timezone || 'UTC',
        location: req.body.location,
        status: 'scheduled',
        notes: req.body.notes,
        createdBy: new mongoose.Types.ObjectId(user.id),
      });

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        action: 'CREATE_APPOINTMENT',
        targetType: 'appointment',
        targetId: appointment._id.toString(),
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { provider: appointment.provider, startsAt: appointment.startsAt },
      });

      sendSuccess(res, { appointment }, 201);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter: any = {};
      const { patientId, status, upcomingOnly } = req.query as any;

      if (patientId) {
        if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
          throw new ForbiddenScopeError('Not permitted to view appointments for this patient');
        }
        filter.patientId = new mongoose.Types.ObjectId(patientId);
      } else if (req.authorizedPatientIds) {
        filter.patientId = { $in: req.authorizedPatientIds.map((id) => new mongoose.Types.ObjectId(id)) };
      }

      if (status) {
        filter.status = status;
      }

      if (upcomingOnly) {
        filter.startsAt = { $gte: new Date() };
      }

      const appointments = await Appointment.find(filter)
        .populate('patientId', 'displayName email timezone')
        .populate('createdBy', 'displayName role')
        .sort({ startsAt: 1 });

      sendSuccess(res, { appointments });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const user = req.user!;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid appointment ID');
      }

      const appointment = await Appointment.findById(id);
      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      const patientId = appointment.patientId.toString();
      if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
        throw new ForbiddenScopeError('Not permitted to modify this appointment');
      }

      const b = req.body;
      if (b.provider) appointment.provider = b.provider;
      if (b.specialty !== undefined) appointment.specialty = b.specialty;
      if (b.startsAt) appointment.startsAt = new Date(b.startsAt);
      if (b.endsAt !== undefined) appointment.endsAt = b.endsAt ? new Date(b.endsAt) : undefined;
      if (b.timezone) appointment.timezone = b.timezone;
      if (b.location) appointment.location = b.location;
      if (b.status) appointment.status = b.status;
      if (b.notes !== undefined) appointment.notes = b.notes;

      await appointment.save();

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        action: 'UPDATE_APPOINTMENT',
        targetType: 'appointment',
        targetId: appointment._id.toString(),
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { updatedFields: Object.keys(b), status: appointment.status },
      });

      sendSuccess(res, { appointment });
    } catch (error) {
      next(error);
    }
  }
}
