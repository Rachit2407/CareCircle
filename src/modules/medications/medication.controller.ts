import { Request, Response, NextFunction } from 'express';
import { MedicationSchedule, DoseLog } from './medication.model.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { ForbiddenScopeError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { AuditService } from '../../services/audit.service.js';
import mongoose from 'mongoose';

export class MedicationController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.body.patientId;
      const user = req.user!;

      if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
        throw new ForbiddenScopeError('Not permitted to create medication schedules for this patient');
      }

      const schedule = await MedicationSchedule.create({
        patientId: new mongoose.Types.ObjectId(patientId),
        medicationName: req.body.medicationName,
        dosage: req.body.dosage,
        instructions: req.body.instructions,
        recurrence: req.body.recurrence,
        timezone: req.body.timezone || 'UTC',
        startAt: new Date(req.body.startAt),
        endAt: req.body.endAt ? new Date(req.body.endAt) : undefined,
        active: req.body.active !== undefined ? req.body.active : true,
        reminderPreferences: req.body.reminderPreferences || {
          enabled: true,
          advanceMinutes: 15,
          channels: ['voice_sarvam', 'push'],
        },
        prescribedBy: req.body.prescribedBy,
      });

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        action: 'CREATE_MEDICATION_SCHEDULE',
        targetType: 'medicationSchedule',
        targetId: schedule._id.toString(),
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { medicationName: schedule.medicationName, active: schedule.active },
      });

      sendSuccess(res, { schedule }, 201);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter: any = {};
      const { patientId, activeOnly } = req.query as any;

      if (patientId) {
        if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
          throw new ForbiddenScopeError('Not permitted to view medications for this patient');
        }
        filter.patientId = new mongoose.Types.ObjectId(patientId);
      } else if (req.authorizedPatientIds) {
        filter.patientId = { $in: req.authorizedPatientIds.map((id) => new mongoose.Types.ObjectId(id)) };
      }

      if (activeOnly) {
        filter.active = true;
      }

      const schedules = await MedicationSchedule.find(filter)
        .populate('patientId', 'displayName email timezone')
        .sort({ active: -1, startAt: 1 });

      sendSuccess(res, { schedules });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const user = req.user!;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid medication schedule ID');
      }

      const schedule = await MedicationSchedule.findById(id);
      if (!schedule) {
        throw new NotFoundError('Medication schedule not found');
      }

      const patientId = schedule.patientId.toString();
      if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
        throw new ForbiddenScopeError('Not permitted to modify medications for this patient');
      }

      const b = req.body;
      if (b.medicationName) schedule.medicationName = b.medicationName;
      if (b.dosage) schedule.dosage = b.dosage;
      if (b.instructions) schedule.instructions = b.instructions;
      if (b.recurrence) schedule.recurrence = b.recurrence;
      if (b.timezone) schedule.timezone = b.timezone;
      if (b.startAt) schedule.startAt = new Date(b.startAt);
      if (b.endAt !== undefined) schedule.endAt = b.endAt ? new Date(b.endAt) : undefined;
      if (b.active !== undefined) schedule.active = b.active;
      if (b.reminderPreferences) schedule.reminderPreferences = b.reminderPreferences;
      if (b.prescribedBy !== undefined) schedule.prescribedBy = b.prescribedBy;

      await schedule.save();

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        action: 'UPDATE_MEDICATION_SCHEDULE',
        targetType: 'medicationSchedule',
        targetId: schedule._id.toString(),
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { updatedFields: Object.keys(b), active: schedule.active },
      });

      sendSuccess(res, { schedule });
    } catch (error) {
      next(error);
    }
  }

  public static async confirmDose(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, medicationScheduleId, scheduledFor, doseStatus, takenAt, notes } = req.body;
      const user = req.user!;

      if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
        throw new ForbiddenScopeError('Not permitted to confirm doses for this patient');
      }

      const schedule = await MedicationSchedule.findById(medicationScheduleId);
      if (!schedule || schedule.patientId.toString() !== patientId) {
        throw new NotFoundError('Medication schedule not found for this patient');
      }

      const scheduledDate = new Date(scheduledFor);

      const doseLog = await DoseLog.findOneAndUpdate(
        {
          patientId: new mongoose.Types.ObjectId(patientId),
          medicationScheduleId: new mongoose.Types.ObjectId(medicationScheduleId),
          scheduledFor: scheduledDate,
        },
        {
          $set: {
            doseStatus,
            takenAt: doseStatus === 'taken' ? (takenAt ? new Date(takenAt) : new Date()) : undefined,
            confirmedBy: new mongoose.Types.ObjectId(user.id),
            notes,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        action: 'CONFIRM_MEDICATION_DOSE',
        targetType: 'doseLog',
        targetId: doseLog._id.toString(),
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { medicationScheduleId, scheduledFor, doseStatus },
      });

      sendSuccess(res, { doseLog });
    } catch (error) {
      next(error);
    }
  }
}
