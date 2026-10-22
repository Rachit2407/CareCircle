import mongoose, { Schema, Document, Types } from 'mongoose';

export type AppointmentStatus = 'scheduled' | 'rescheduled' | 'cancelled' | 'completed';

export interface IAppointment extends Document {
  patientId: Types.ObjectId;
  provider: string;
  specialty?: string;
  startsAt: Date;
  endsAt?: Date;
  timezone: string;
  location: string;
  status: AppointmentStatus;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, required: true, trim: true },
    specialty: { type: String, trim: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date },
    timezone: { type: String, default: 'UTC', trim: true },
    location: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['scheduled', 'rescheduled', 'cancelled', 'completed'],
      default: 'scheduled',
      index: true,
    },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

AppointmentSchema.index({ patientId: 1, startsAt: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
