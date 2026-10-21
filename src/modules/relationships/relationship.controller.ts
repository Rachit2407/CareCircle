import { Request, Response, NextFunction } from 'express';
import { CareRelationship } from './careRelationship.model.js';
import { User } from '../users/user.model.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { ForbiddenScopeError, NotFoundError, ConflictError, ValidationError } from '../../utils/errors.js';
import { AuditService } from '../../services/audit.service.js';
import mongoose from 'mongoose';

export class RelationshipController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, caregiverId, permissions, relationshipType, consentStatus, notes } = req.body;
      const user = req.user!;

      // Verify that user is either the patient consenting, the caregiver, or admin
      if (user.role === 'patient' && user.id !== patientId) {
        throw new ForbiddenScopeError('Patients can only establish care relationships for themselves');
      }

      if (user.role === 'caregiver' && user.id !== caregiverId) {
        throw new ForbiddenScopeError('Caregivers can only establish relationships with themselves as the caregiver');
      }

      const patient = await User.findById(patientId);
      if (!patient || patient.role !== 'patient') {
        throw new NotFoundError('Patient account not found');
      }

      const caregiver = await User.findById(caregiverId);
      if (!caregiver || caregiver.role !== 'caregiver') {
        throw new NotFoundError('Caregiver account not found');
      }

      const existing = await CareRelationship.findOne({
        patientId: new mongoose.Types.ObjectId(patientId),
        caregiverId: new mongoose.Types.ObjectId(caregiverId),
      });

      if (existing) {
        throw new ConflictError('A care relationship already exists between this patient and caregiver');
      }

      const relationship = await CareRelationship.create({
        patientId: new mongoose.Types.ObjectId(patientId),
        caregiverId: new mongoose.Types.ObjectId(caregiverId),
        permissions,
        relationshipType,
        consentStatus: consentStatus || 'active',
        notes,
      });

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        action: 'CARE_RELATIONSHIP_CREATED',
        targetType: 'care_relationship',
        targetId: relationship._id.toString(),
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { caregiverId, permissions, consentStatus },
      });

      sendSuccess(res, { relationship }, 201);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      let query: any = {};

      if (user.role === 'patient') {
        query = { patientId: new mongoose.Types.ObjectId(user.id) };
      } else if (user.role === 'caregiver') {
        query = { caregiverId: new mongoose.Types.ObjectId(user.id) };
      }

      const relationships = await CareRelationship.find(query)
        .populate('patientId', 'displayName email phone timezone role')
        .populate('caregiverId', 'displayName email phone timezone role')
        .sort({ createdAt: -1 });

      sendSuccess(res, { relationships });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const { permissions, consentStatus, notes } = req.body;
      const user = req.user!;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid relationship ID');
      }

      const relationship = await CareRelationship.findById(id);
      if (!relationship) {
        throw new NotFoundError('Care relationship not found');
      }

      // Check authorization: only the patient or admin can revoke/change consent; caregiver can update notes
      const isPatient = relationship.patientId.toString() === user.id;
      const isCaregiver = relationship.caregiverId.toString() === user.id;
      const isAdmin = user.role === 'admin';

      if (!isPatient && !isCaregiver && !isAdmin) {
        throw new ForbiddenScopeError('Not authorized to modify this care relationship');
      }

      if (consentStatus && !isPatient && !isAdmin) {
        throw new ForbiddenScopeError('Only the patient or admin may modify consent status');
      }

      if (permissions && !isPatient && !isAdmin) {
        throw new ForbiddenScopeError('Only the patient or admin may modify permissions');
      }

      if (permissions) relationship.permissions = permissions;
      if (consentStatus) relationship.consentStatus = consentStatus;
      if (notes !== undefined) relationship.notes = notes;

      await relationship.save();

      await AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        patientId: relationship.patientId.toString(),
        action: 'CARE_RELATIONSHIP_UPDATED',
        targetType: 'care_relationship',
        targetId: relationship._id.toString(),
        result: 'SUCCESS',
        requestId: req.requestId,
        metadata: { permissions, consentStatus },
      });

      sendSuccess(res, { relationship });
    } catch (error) {
      next(error);
    }
  }
}
