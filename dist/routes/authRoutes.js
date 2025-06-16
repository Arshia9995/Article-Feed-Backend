"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const validate_1 = require("../middleware/validate");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const authRoutes = (0, express_1.Router)();
authRoutes.post('/signup', validate_1.validateSignup, authController_1.signup);
authRoutes.post('/verify-otp', authController_1.verifyOTP);
authRoutes.post('/login', authController_1.login);
authRoutes.post('/logout', authController_1.logout);
authRoutes.put('/update-profile', authMiddleware_1.default, authController_1.updateProfile);
exports.default = authRoutes;
