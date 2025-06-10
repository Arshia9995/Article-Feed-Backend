import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { IUser } from '../types/IUser';
import OTP from '../models/OTP';
import { createAccessToken, createRefreshToken } from '../utils/jwt';
import { sendOTPEmail } from '../utils/sendEmail';
import { SignupRequest } from '../utils/SignupRequest';



// Simplified signature without NextFunction since we're not using it
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, phone, email, dob, password, preferences }: SignupRequest = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      res.status(400).json({ message: 'Email or phone already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated OTP for ${email}: ${otp}`);


    // Store temporary user data in OTP document
    const otpDoc = new OTP({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      tempUser: {
        firstName,
        lastName,
        phone,
        email,
        dob: new Date(dob),
        password: hashedPassword,
        preferences,
      },
    });
    await otpDoc.save();

    // Send OTP email
    await sendOTPEmail(email, otp);

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// BACKEND: Updated verifyOTP function
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    // Verify OTP and retrieve temp user
    const otpDoc = await OTP.findOne({ email, otp });
    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    // Extract temporary user data
    const { tempUser } = otpDoc;
    if (!tempUser) {
      res.status(400).json({ message: 'No user data found' });
      return;
    }

    // Create and save user to database
    const user = new User({
      firstName: tempUser.firstName,
      lastName: tempUser.lastName,
      phone: tempUser.phone,
      email: tempUser.email,
      dob: tempUser.dob,
      password: tempUser.password,
      preferences: tempUser.preferences,
      

    });
    await user.save();

    // Delete OTP document (including temp user data)
    await OTP.deleteOne({ _id: otpDoc._id });

    // Generate tokens
    const payload = { userId: user._id, email: user.email };
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    // Set tokens in HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send user data in response (exclude sensitive data like password)
    const userData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      dob: user.dob,
      preferences: user.preferences,
      accessToken,
      refreshToken
      // createdAt: user.createdAt,
      // updatedAt: user.updatedAt
    };

    res.status(201).json({ 
      message: 'User registered successfully', 
      userId: user._id,
      user: userData // Include user data in response
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};


export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  console.log(user,"userrrrrrrrrrrrrr");
  
  if (!user) {
    res.status(401).json({ message: 'User not found' });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const payload = { userId: user._id, email: user.email };
  const accessToken = createAccessToken(payload);
  const refreshToken = createRefreshToken(payload);

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    message: 'Login successfullllllllllllll',
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      dob: user.dob,
      preferences: user.preferences,
      accessToken,
      refreshToken
    },
  });
};


export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const { firstName, lastName, phone, email, dob, password, confirmPassword, preferences } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phone || !email) {
      res.status(400).json({ success: false, message: 'First name, last name, phone, and email are required' });
      return;
    }

    // Validate password and confirmPassword match
    if (password && password !== confirmPassword) {
      res.status(400).json({ success: false, message: 'Passwords do not match' });
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Update fields
    user.firstName = firstName.trim();
    user.lastName = lastName.trim();
    user.phone = phone.trim();
    user.email = email.trim().toLowerCase();
    if (dob) user.dob = new Date(dob);
    if (preferences) {
      user.preferences = Array.isArray(preferences)
        ? preferences.map((pref: string) => pref.trim().toLowerCase())
        : [];
    }

    // Update password if provided
    if (password) {
      if (password.length < 8) {
        res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
        return;
      }
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    // Return updated user data (excluding password)
    const updatedUser = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      dob: user.dob,
      preferences: user.preferences,
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: 'Email or phone already exists',
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};


export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear the cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({
      message: 'Logout successful',
      success: true,
      token: null, // Explicitly clear token in response
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Logout failed',
      success: false,
    });
  }
};