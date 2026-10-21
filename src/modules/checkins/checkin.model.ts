import mongoose, { Schema, Document, Types } from 'mongoose';

export type RespondentType = 'patient' | 'caregiver';
export type FeelingType = 'great' | 'good' | 'fair' | 'poor' | 'terrible';

export interface ICheckIn extends Document {
  patientId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  feeling: FeelingType;
  painScore: number; // 0 to 10
  symptoms: string[];
  notes?: string; // Raw answers preserved verbatim
  aiSummary?: string; // AI summary kept separate and non-authoritative
  respondentType: RespondentType;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CheckInSchema = new Schema<ICheckIn>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', index: true },
    feeling: {
      type: String,
      required: true,
      enum: ['great', 'good', 'fair', 'poor', 'terrible'],
    },
    painScore: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    notes: { type: String, trim: true },
    aiSummary: { type: String, trim: true },
    respondentType: {
      type: String,
      required: true,
      enum: ['patient', 'caregiver'],
      default: 'patient',
    },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

CheckInSchema.index({ patientId: 1, createdAt: -1 });

export const CheckIn = mongoose.model<ICheckIn>('CheckIn', CheckInSchema);
