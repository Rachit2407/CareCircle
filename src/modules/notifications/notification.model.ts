import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationChannel = 'voice_sarvam' | 'sms' | 'push' | 'email';
export type NotificationEventType =
  | 'medication_reminder'
  | 'task_reminder'
  | 'appointment_reminder'
  | 'caregiver_alert'
  | 'check_in_prompt';
export type NotificationStatus = 'queued' | 'sent' | 'failed' | 'retried';

export interface INotification extends Document {
  patientId: Types.ObjectId;
  recipientId: Types.ObjectId;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: Date;
  providerReference?: string;
  payload: Record<string, any>;
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    channel: {
      type: String,
      required: true,
      enum: ['voice_sarvam', 'sms', 'push', 'email'],
    },
    eventType: {
      type: String,
      required: true,
      enum: ['medication_reminder', 'task_reminder', 'appointment_reminder', 'caregiver_alert', 'check_in_prompt'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['queued', 'sent', 'failed', 'retried'],
      default: 'queued',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    nextAttemptAt: { type: Date, index: true },
    providerReference: { type: String, trim: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    errorMessage: { type: String, trim: true },
    sentAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ status: 1, nextAttemptAt: 1 });
NotificationSchema.index({ patientId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
