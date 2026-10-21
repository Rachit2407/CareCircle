import mongoose, { Schema, Document, Types } from 'mongoose';

export type HealthRecordType =
  | 'lab_result'
  | 'prescription'
  | 'discharge_summary'
  | 'imaging'
  | 'clinical_note'
  | 'vaccination'
  | 'other';

export interface IHealthRecord extends Document {
  patientId: Types.ObjectId;
  recordType: HealthRecordType;
  storageKey: string; // Internal private storage key
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedBy: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HealthRecordSchema = new Schema<IHealthRecord>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recordType: {
      type: String,
      required: true,
      enum: ['lab_result', 'prescription', 'discharge_summary', 'imaging', 'clinical_note', 'vaccination', 'other'],
      index: true,
    },
    storageKey: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    contentType: { type: String, required: true, trim: true },
    fileSizeBytes: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

HealthRecordSchema.index({ patientId: 1, createdAt: -1 });

export const HealthRecord = mongoose.model<IHealthRecord>('HealthRecord', HealthRecordSchema);
