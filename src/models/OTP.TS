import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types/IUser';

export interface IOTP extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  tempUser: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>;
}

const OTPSchema: Schema = new Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  tempUser: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    dob: { type: Date, required: true },
    password: { type: String, required: true },
    preferences: [{ type: String }],
  },
}, { timestamps: true });

// Add TTL index
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IOTP>('OTP', OTPSchema);