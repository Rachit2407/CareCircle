import mongoose, { Schema, Document, Types } from 'mongoose';

export type AuditResult = 'SUCCESS' | 'DENIED' | 'FAILED';

export interface IAuditEvent extends Document {
  actorId?: Types.ObjectId;
  actorRole?: string;
  patientId?: Types.ObjectId;
  action: string;
  targetType: string;
  targetId?: string;
  result: AuditResult;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AuditEventSchema = new Schema<IAuditEvent>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: { type: String },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true, index: true },
    targetId: { type: String },
    result: { type: String, enum: ['SUCCESS', 'DENIED', 'FAILED'], required: true, index: true },
    requestId: { type: String, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditEventSchema.index({ patientId: 1, createdAt: -1 });
AuditEventSchema.index({ actorId: 1, createdAt: -1 });

export const AuditEvent = mongoose.model<IAuditEvent>('AuditEvent', AuditEventSchema);
