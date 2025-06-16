"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.envVaribales = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.envVaribales = {
    PORT: process.env.PORT || 5000,
    MONGO_URI: process.env.MONGO_URI || '',
    //  ACCESS_TOKEN_SECRET:process.env.ACCESS_TOKEN_SECRET||" ",
    //  REFRESH_TOKEN_SECRET:process.env.REFRESH_TOKEN_SECRET||" ",
    FRONTEND_URL: process.env.FRONTEND_URL || ""
};
