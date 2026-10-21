import mongoose, { Schema, Document, Types } from 'mongoose';

export type HealthReadingType =
  | 'blood_pressure_systolic'
  | 'blood_pressure_diastolic'
  | 'heart_rate'
  | 'blood_glucose'
  | 'weight'
  | 'oxygen_saturation'
  | 'temperature'
  | 'respiratory_rate'
  | 'other';

export type HealthReadingSource =
  | 'manual'
  | 'voice_sarvam'
  | 'device_sync'
  | 'caregiver_entry'
  | 'other';

export interface IHealthReading extends Document {
  patientId: Types.ObjectId;
  type: HealthReadingType;
  value: number;
  unit: string;
  measuredAt: Date;
  source: HealthReadingSource;
  notes?: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HealthReadingSchema = new Schema<IHealthReading>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'blood_pressure_systolic',
        'blood_pressure_diastolic',
        'heart_rate',
        'blood_glucose',
        'weight',
        'oxygen_saturation',
        'temperature',
        'respiratory_rate',
        'other',
      ],
      index: true,
    },
    value: { type: Number, required: true },
    unit: { type: String, required: true, trim: true },
    measuredAt: { type: Date, required: true, index: true },
    source: {
      type: String,
      enum: ['manual', 'voice_sarvam', 'device_sync', 'caregiver_entry', 'other'],
      default: 'manual',
    },
    notes: { type: String, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

HealthReadingSchema.index({ patientId: 1, measuredAt: -1 });
HealthReadingSchema.index({ patientId: 1, type: 1, measuredAt: -1 });

export const HealthReading = mongoose.model<IHealthReading>('HealthReading', HealthReadingSchema);
