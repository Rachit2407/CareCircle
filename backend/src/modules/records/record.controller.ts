import { Request, Response, NextFunction } from 'express';
import { HealthRecord } from './record.model.js';
import { StorageService } from '../../services/storage.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { ForbiddenScopeError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { AuditService } from '../../services/audit.service.js';
import mongoose from 'mongoose';

export class RecordController {
  public static async requestUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, fileName, contentType, fileSizeBytes, recordType, notes } = req.body;
      const user = req.user!;

      if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
        throw new ForbiddenScopeError('Not permitted to upload health records for this patient');
      }

      const signed = StorageService.generateSignedUploadUrl(patientId, fileName, contentType, fileSizeBytes);

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        action: 'REQUEST_RECORD_UPLOAD_URL',
        targetType: 'healthRecord',
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { fileName, recordType, contentType, fileSizeBytes },
      });

      sendSuccess(res, {
        uploadUrl: signed.uploadUrl,
        storageKey: signed.storageKey,
        expiresAt: signed.expiresAt,
        expiresInSeconds: signed.expiresInSeconds,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async confirmRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, storageKey, fileName, contentType, fileSizeBytes, recordType, notes } = req.body;
      const user = req.user!;

      if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
        throw new ForbiddenScopeError('Not permitted to register health records for this patient');
      }

      const record = await HealthRecord.create({
        patientId: new mongoose.Types.ObjectId(patientId),
        recordType,
        storageKey,
        fileName,
        contentType,
        fileSizeBytes,
        uploadedBy: new mongoose.Types.ObjectId(user.id),
        notes,
      });

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        action: 'CONFIRM_HEALTH_RECORD',
        targetType: 'healthRecord',
        targetId: record._id.toString(),
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { recordType, fileName },
      });

      sendSuccess(res, {
        record: {
          id: record._id,
          patientId: record.patientId,
          recordType: record.recordType,
          fileName: record.fileName,
          contentType: record.contentType,
          fileSizeBytes: record.fileSizeBytes,
          uploadedBy: record.uploadedBy,
          notes: record.notes,
          createdAt: record.createdAt,
        },
      }, 201);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter: any = {};
      const { patientId, recordType, limit } = req.query as any;

      if (patientId) {
        if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
          throw new ForbiddenScopeError('Not permitted to view health records for this patient');
        }
        filter.patientId = new mongoose.Types.ObjectId(patientId);
      } else if (req.authorizedPatientIds) {
        filter.patientId = { $in: req.authorizedPatientIds.map((id) => new mongoose.Types.ObjectId(id)) };
      }

      if (recordType) {
        filter.recordType = recordType;
      }

      // Explicitly exclude internal storageKey from public list output
      const records = await HealthRecord.find(filter)
        .select('-storageKey')
        .populate('uploadedBy', 'displayName role')
        .sort({ createdAt: -1 })
        .limit(Number(limit) || 50);

      sendSuccess(res, { records });
    } catch (error) {
      next(error);
    }
  }

  public static async getDownloadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const user = req.user!;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid health record ID');
      }

      const record = await HealthRecord.findById(id);
      if (!record) {
        throw new NotFoundError('Health record not found');
      }

      const patientId = record.patientId.toString();
      if (req.authorizedPatientIds && !req.authorizedPatientIds.includes(patientId)) {
        await AuditService.log({
          actorId: user.id,
          actorRole: user.role,
          patientId,
          action: 'DOWNLOAD_RECORD_DENIED',
          targetType: 'healthRecord',
          targetId: id,
          result: 'DENIED',
          requestId: req.requestId,
          metadata: { reason: 'Unauthorized patient scope' },
        });
        throw new ForbiddenScopeError('Not permitted to download health records for this patient');
      }

      const signed = StorageService.generateSignedDownloadUrl(record.storageKey);

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        action: 'DOWNLOAD_RECORD_URL_GENERATED',
        targetType: 'healthRecord',
        targetId: id,
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { fileName: record.fileName, recordType: record.recordType },
      });

      sendSuccess(res, {
        downloadUrl: signed.downloadUrl,
        fileName: record.fileName,
        contentType: record.contentType,
        expiresAt: signed.expiresAt,
        expiresInSeconds: signed.expiresInSeconds,
      });
    } catch (error) {
      next(error);
    }
  }
}
