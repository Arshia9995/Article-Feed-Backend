"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.updateProfile = exports.login = exports.verifyOTP = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const OTP_1 = __importDefault(require("../models/OTP"));
const jwt_1 = require("../utils/jwt");
const sendEmail_1 = require("../utils/sendEmail");
const signup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { firstName, lastName, phone, email, dob, password, preferences } = req.body;
        const existingUser = yield User_1.default.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            res.status(400).json({ message: 'Email or phone already exists' });
            return;
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`Generated OTP for ${email}: ${otp}`);
        const otpDoc = new OTP_1.default({
            email,
            otp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
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
        yield otpDoc.save();
        yield (0, sendEmail_1.sendOTPEmail)(email, otp);
        res.status(200).json({ message: 'OTP sent to email' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});
exports.signup = signup;
const verifyOTP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, otp } = req.body;
        const otpDoc = yield OTP_1.default.findOne({ email, otp });
        if (!otpDoc || otpDoc.expiresAt < new Date()) {
            res.status(400).json({ message: 'Invalid or expired OTP' });
            return;
        }
        const { tempUser } = otpDoc;
        if (!tempUser) {
            res.status(400).json({ message: 'No user data found' });
            return;
        }
        const user = new User_1.default({
            firstName: tempUser.firstName,
            lastName: tempUser.lastName,
            phone: tempUser.phone,
            email: tempUser.email,
            dob: tempUser.dob,
            password: tempUser.password,
            preferences: tempUser.preferences,
        });
        yield user.save();
        yield OTP_1.default.deleteOne({ _id: otpDoc._id });
        const payload = { userId: user._id, email: user.email };
        const accessToken = (0, jwt_1.createAccessToken)(payload);
        const refreshToken = (0, jwt_1.createRefreshToken)(payload);
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
            maxAge: 15 * 60 * 1000,
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        const userData = {
            id: user._id,
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
            user: userData
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});
exports.verifyOTP = verifyOTP;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const user = yield User_1.default.findOne({ email });
    console.log(user, "userrrrrrrrrrrrrr");
    if (!user) {
        res.status(401).json({ message: 'User not found' });
        return;
    }
    const isMatch = yield bcryptjs_1.default.compare(password, user.password);
    if (!isMatch) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
    }
    const payload = { userId: user._id, email: user.email };
    const accessToken = (0, jwt_1.createAccessToken)(payload);
    const refreshToken = (0, jwt_1.createRefreshToken)(payload);
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
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
});
exports.login = login;
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const { firstName, lastName, phone, email, dob, password, confirmPassword, preferences } = req.body;
        if (!firstName || !lastName || !phone || !email) {
            res.status(400).json({ success: false, message: 'First name, last name, phone, and email are required' });
            return;
        }
        if (password && password !== confirmPassword) {
            res.status(400).json({ success: false, message: 'Passwords do not match' });
            return;
        }
        const user = yield User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        user.firstName = firstName.trim();
        user.lastName = lastName.trim();
        user.phone = phone.trim();
        user.email = email.trim().toLowerCase();
        if (dob)
            user.dob = new Date(dob);
        if (preferences) {
            user.preferences = Array.isArray(preferences)
                ? preferences.map((pref) => pref.trim().toLowerCase())
                : [];
        }
        if (password) {
            if (password.length < 8) {
                res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
                return;
            }
            user.password = yield bcryptjs_1.default.hash(password, 10);
        }
        yield user.save();
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
    }
    catch (error) {
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
});
exports.updateProfile = updateProfile;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
        });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
        });
        res.status(200).json({
            message: 'Logout successful',
            success: true,
            token: null,
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            message: 'Logout failed',
            success: false,
        });
    }
});
exports.logout = logout;
