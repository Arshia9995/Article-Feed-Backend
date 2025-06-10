import { Request, Response, NextFunction } from 'express';
import { SignupRequest } from '../utils/SignupRequest';

export const validateSignup = (req: Request, res: Response, next: NextFunction): void => {
  const { firstName, lastName, phone, email, dob, password, preferences }: SignupRequest = req.body;

  if (!firstName || !lastName || !phone || !email || !dob || !password || !preferences) {
    res.status(400).json({ message: 'All fields are required' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ message: 'Invalid email format' });
    return;
  }


  
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    res.status(400).json({ message: 'Invalid phone number' });
    return;
  }

  if (new Date(dob) >= new Date()) {
    res.status(400).json({ message: 'Invalid date of birth' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: 'Password must be at least 8 characters' });
    return;
  }

  next();
};