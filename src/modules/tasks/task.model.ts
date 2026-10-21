import mongoose, { Schema, Document, Types } from 'mongoose';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface ICareTask extends Document {
  patientId: Types.ObjectId;
  title: string;
  description?: string;
  assigneeId?: Types.ObjectId;
  dueAt: Date;
  recurrence: TaskRecurrence;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CareTaskSchema = new Schema<ICareTask>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    dueAt: { type: Date, required: true, index: true },
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

CareTaskSchema.index({ patientId: 1, status: 1, dueAt: 1 });
CareTaskSchema.index({ assigneeId: 1, status: 1, dueAt: 1 });

export const CareTask = mongoose.model<ICareTask>('CareTask', CareTaskSchema);
