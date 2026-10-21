import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IIdempotencyRecord extends Document {
  key: string;
  actorId?: Types.ObjectId;
  endpoint: string;
  requestHash: string;
  statusCode: number;
  responseBody: any;
  expiresAt: Date;
  createdAt: Date;
}

const IdempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    key: { type: String, required: true, unique: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    endpoint: { type: String, required: true },
    requestHash: { type: String, required: true },
    statusCode: { type: Number, required: true },
    responseBody: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const IdempotencyRecord = mongoose.model<IIdempotencyRecord>('IdempotencyRecord', IdempotencyRecordSchema);
