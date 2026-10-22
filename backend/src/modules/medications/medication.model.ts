import mongoose, { Schema, Document, Types } from 'mongoose';

export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed';
export type ReminderStatus = 'none' | 'queued' | 'sent' | 'failed';

export interface IMedicationSchedule extends Document {
  patientId: Types.ObjectId;
  medicationName: string;
  dosage: string;
  instructions: string; // Clinician-entered instructions preserved verbatim
  recurrence: {
    frequency: 'once' | 'daily' | 'twice_daily' | 'thrice_daily' | 'weekly' | 'custom';
    times: string[]; // e.g., ["08:00", "20:00"]
    daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  };
  timezone: string;
  startAt: Date;
  endAt?: Date;
  active: boolean;
  reminderPreferences: {
    enabled: boolean;
    advanceMinutes: number;
    channels: ('voice_sarvam' | 'sms' | 'push' | 'email')[];
  };
  prescribedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicationScheduleSchema = new Schema<IMedicationSchedule>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    medicationName: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    instructions: { type: String, required: true, trim: true },
    recurrence: {
      frequency: {
        type: String,
        enum: ['once', 'daily', 'twice_daily', 'thrice_daily', 'weekly', 'custom'],
        default: 'daily',
      },
      times: { type: [String], default: ['09:00'] },
      daysOfWeek: { type: [Number], default: [] },
    },
    timezone: { type: String, default: 'UTC', trim: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date },
    active: { type: Boolean, default: true, index: true },
    reminderPreferences: {
      enabled: { type: Boolean, default: true },
      advanceMinutes: { type: Number, default: 15 },
      channels: {
        type: [String],
        enum: ['voice_sarvam', 'sms', 'push', 'email'],
        default: ['voice_sarvam', 'push'],
      },
    },
    prescribedBy: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

MedicationScheduleSchema.index({ patientId: 1, active: 1 });
MedicationScheduleSchema.index({ patientId: 1, startAt: 1 });

export const MedicationSchedule = mongoose.model<IMedicationSchedule>('MedicationSchedule', MedicationScheduleSchema);

// Separate collection for dose events to decouple reminder delivery from user-confirmed dose status
export interface IDoseLog extends Document {
  patientId: Types.ObjectId;
  medicationScheduleId: Types.ObjectId;
  scheduledFor: Date;
  reminderStatus: ReminderStatus;
  doseStatus: DoseStatus;
  takenAt?: Date;
  confirmedBy?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DoseLogSchema = new Schema<IDoseLog>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    medicationScheduleId: { type: Schema.Types.ObjectId, ref: 'MedicationSchedule', required: true, index: true },
    scheduledFor: { type: Date, required: true, index: true },
    reminderStatus: {
      type: String,
      enum: ['none', 'queued', 'sent', 'failed'],
      default: 'none',
      index: true,
    },
    doseStatus: {
      type: String,
      enum: ['pending', 'taken', 'skipped', 'missed'],
      default: 'pending',
      index: true,
    },
    takenAt: { type: Date },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

DoseLogSchema.index({ patientId: 1, scheduledFor: 1 });
DoseLogSchema.index({ medicationScheduleId: 1, scheduledFor: 1 }, { unique: true });

export const DoseLog = mongoose.model<IDoseLog>('DoseLog', DoseLogSchema);
