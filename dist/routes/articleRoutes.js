"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const articleController_1 = require("../controllers/articleController");
const upload_1 = __importDefault(require("../middleware/upload"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const multer_1 = __importDefault(require("multer"));
const articleRoutes = express_1.default.Router();
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected file field. Only "image" field is allowed.'
            });
        }
    }
    if (error.message === 'Only image files are allowed!') {
        return res.status(400).json({
            success: false,
            message: 'Only image files are allowed. Please upload JPG, PNG, GIF, or WebP files.'
        });
    }
    next(error);
};
articleRoutes.post('/create', authMiddleware_1.default, (req, res, next) => {
    upload_1.default.single('image')(req, res, (err) => {
        if (err) {
            return handleMulterError(err, req, res, next);
        }
        next();
    });
}, articleController_1.createArticle);
articleRoutes.get('/getuserarticles', authMiddleware_1.default, articleController_1.getUserArticles);
articleRoutes.get('/articles/:articleId', authMiddleware_1.default, articleController_1.getArticleById);
articleRoutes.delete('/articles/:articleId', authMiddleware_1.default, articleController_1.deleteArticle);
articleRoutes.put('/articles/:articleId', (req, res, next) => {
    upload_1.default.single('image')(req, res, (err) => {
        if (err) {
            return handleMulterError(err, req, res, next);
        }
        next();
    });
}, articleController_1.updateArticle);
articleRoutes.get('/getarticles-by-preferences', authMiddleware_1.default, articleController_1.getArticlesByCategories);
articleRoutes.post('/articles/like/:articleId', authMiddleware_1.default, articleController_1.likeArticle);
articleRoutes.post('/articles/removelike/:articleId', authMiddleware_1.default, articleController_1.removelikeArticle);
articleRoutes.post('/articles/removeDislike/:articleId', authMiddleware_1.default, articleController_1.removedislikeArticle);
articleRoutes.post('/articles/dislike/:articleId', authMiddleware_1.default, articleController_1.dislikeArticle);
// articleRoutes.post('/articles/block/:articleId', authMiddleware, blockArticle);
articleRoutes.post('/articles/block/:articleId', authMiddleware_1.default, articleController_1.blockArticle);
articleRoutes.post('/articles/unblock/:articleId', authMiddleware_1.default, articleController_1.unblockArticle);
articleRoutes.get('/latest', articleController_1.getLatestArticles);
exports.default = articleRoutes;
