import { Document } from 'mongoose';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: Date;
  password: string;
  preferences: string[];
  verified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}