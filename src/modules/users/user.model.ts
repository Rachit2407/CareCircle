import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'patient' | 'caregiver' | 'admin';

export interface IUser extends Document {
  displayName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  timezone: string;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    displayName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['patient', 'caregiver', 'admin'], default: 'patient', index: true },
    phone: { type: String, trim: true },
    timezone: { type: String, default: 'UTC', trim: true },
    tokenVersion: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
