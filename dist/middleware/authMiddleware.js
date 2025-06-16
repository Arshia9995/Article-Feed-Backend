"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const authMiddleware = (req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        console.log(token, " token here");
        if (!token) {
            res.status(401).json({ message: 'Access token missing. Unauthorized' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
        req.user = { _id: decoded.userId, email: decoded.email };
        next();
    }
    catch (err) {
        console.error('Auth Middleware Error:', err);
        res.status(403).json({ message: 'Invalid or expired token' });
    }
};
exports.default = authMiddleware;
