import mongoose, { Schema, Document, Types } from 'mongoose';

export type ConsentStatus = 'active' | 'pending' | 'revoked';

export type CaregiverPermission =
  | 'manage_tasks'
  | 'manage_medications'
  | 'manage_appointments'
  | 'manage_health_readings'
  | 'view_records'
  | 'upload_records'
  | 'receive_alerts'
  | 'all';

export interface ICareRelationship extends Document {
  patientId: Types.ObjectId;
  caregiverId: Types.ObjectId;
  permissions: CaregiverPermission[];
  consentStatus: ConsentStatus;
  relationshipType?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CareRelationshipSchema = new Schema<ICareRelationship>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    caregiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    permissions: {
      type: [String],
      default: ['manage_tasks', 'manage_medications', 'manage_appointments', 'manage_health_readings', 'view_records', 'receive_alerts'],
    },
    consentStatus: {
      type: String,
      enum: ['active', 'pending', 'revoked'],
      default: 'active',
      index: true,
    },
    relationshipType: { type: String, default: 'family' },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

CareRelationshipSchema.index({ patientId: 1, caregiverId: 1 }, { unique: true });
CareRelationshipSchema.index({ caregiverId: 1, consentStatus: 1 });

export const CareRelationship = mongoose.model<ICareRelationship>('CareRelationship', CareRelationshipSchema);
