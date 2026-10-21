import mongoose, { Schema, Document, Types } from 'mongoose';

export type IdempotencyStatus = 'processing' | 'completed' | 'failed';

export interface IIdempotencyRecord extends Document {
  key: string;
  actorId: Types.ObjectId;
  endpoint: string;
  requestHash: string;
  status: IdempotencyStatus;
  statusCode?: number;
  responseBody?: any;
  expiresAt: Date;
  createdAt: Date;
}

const IdempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    key: { type: String, required: true },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      default: () => new mongoose.Types.ObjectId('000000000000000000000000'),
    },
    endpoint: { type: String, required: true },
    requestHash: { type: String, required: true },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
      required: true,
      index: true,
    },
    statusCode: { type: Number },
    responseBody: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound unique index by actorId and key (no global unique on key alone)
IdempotencyRecordSchema.index({ actorId: 1, key: 1 }, { unique: true });

export const IdempotencyRecord = mongoose.model<IIdempotencyRecord>('IdempotencyRecord', IdempotencyRecordSchema);
