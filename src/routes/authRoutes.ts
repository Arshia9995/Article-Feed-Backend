import { Router } from 'express';
import { login, logout, signup, updateProfile, verifyOTP } from '../controllers/authController';
import { validateSignup } from '../middleware/validate';
import authMiddleware from '../middleware/authMiddleware';

const authRoutes = Router();

authRoutes.post('/signup', validateSignup, signup);
authRoutes.post('/verify-otp', verifyOTP);
authRoutes.post('/login', login);
authRoutes.post('/logout', logout);
authRoutes.put('/update-profile', authMiddleware, updateProfile);


export default authRoutes;