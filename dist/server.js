"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const database_1 = __importDefault(require("./config/database"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const env_variables_1 = require("./config/env_variables");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const articleRoutes_1 = __importDefault(require("./routes/articleRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = env_variables_1.envVaribales.PORT;
console.log(env_variables_1.envVaribales.FRONTEND_URL);
app.use((0, cors_1.default)({
    origin: env_variables_1.envVaribales.FRONTEND_URL,
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)('dev'));
// Routes
// app.use('/', router);
app.use('/auth', authRoutes_1.default);
app.use('/article', articleRoutes_1.default);
app.use((err, req, res, next) => {
    console.error('Error:', err.message + "💥");
    res.status(500).json({
        error: err.message || 'Internal Server Error',
    });
});
(0, database_1.default)();
app.listen(PORT, () => {
    console.log(`server is running on http://localhost:${PORT}`);
});
exports.default = app;
