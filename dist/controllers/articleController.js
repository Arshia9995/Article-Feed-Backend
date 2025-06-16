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
exports.getLatestArticles = exports.unblockArticle = exports.blockArticle = exports.dislikeArticle = exports.removedislikeArticle = exports.removelikeArticle = exports.likeArticle = exports.getArticlesByCategories = exports.updateArticle = exports.deleteArticle = exports.getArticleById = exports.getUserArticles = exports.createArticle = void 0;
const Article_1 = __importDefault(require("../models/Article"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const fs_1 = __importDefault(require("fs"));
const createArticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);
        console.log('User from middleware:', req.user);
        const { title, content, tags, category } = req.body;
        if (!req.user || !req.user._id) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const author = req.user._id;
        if (!title || !content || !category) {
            res.status(400).json({
                message: 'Missing required fields: title, content, and category are required'
            });
            return;
        }
        let imageUrl = '';
        if (req.file) {
            try {
                console.log('Uploading image to Cloudinary...');
                console.log('File path:', req.file.path);
                if (!fs_1.default.existsSync(req.file.path)) {
                    throw new Error('Uploaded file not found on server');
                }
                const result = yield cloudinary_1.default.uploader.upload(req.file.path, {
                    folder: 'articles',
                    resource_type: 'image',
                    transformation: [
                        { width: 1200, height: 800, crop: 'limit' },
                        { quality: 'auto' }
                    ]
                });
                imageUrl = result.secure_url;
                console.log('Image uploaded successfully:', imageUrl);
                try {
                    fs_1.default.unlinkSync(req.file.path);
                    console.log('Temporary file cleaned up');
                }
                catch (cleanupError) {
                    console.warn('Failed to cleanup temporary file:', cleanupError);
                }
            }
            catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                if (req.file && req.file.path && fs_1.default.existsSync(req.file.path)) {
                    try {
                        fs_1.default.unlinkSync(req.file.path);
                    }
                    catch (cleanupError) {
                        console.warn('Failed to cleanup temporary file after error:', cleanupError);
                    }
                }
                res.status(500).json({
                    message: 'Failed to upload image to cloud storage',
                    error: process.env.NODE_ENV === 'development' ? uploadError : 'Image upload failed'
                });
                return;
            }
        }
        let processedTags = [];
        if (tags) {
            if (Array.isArray(tags)) {
                processedTags = tags
                    .filter(tag => tag && tag.trim())
                    .map((tag) => tag.trim().toLowerCase());
            }
            else if (typeof tags === 'string') {
                processedTags = tags
                    .split(',')
                    .filter(tag => tag && tag.trim())
                    .map((tag) => tag.trim().toLowerCase());
            }
        }
        processedTags = [...new Set(processedTags)];
        const articleData = {
            title: title.trim(),
            content: content.trim(),
            images: imageUrl ? [imageUrl] : [],
            tags: processedTags,
            category: category.trim().toLowerCase(),
            author,
        };
        console.log('Creating article with data:', articleData);
        const newArticle = yield Article_1.default.create(articleData);
        console.log('Article created successfully:', newArticle._id);
        const populatedArticle = yield Article_1.default.findById(newArticle._id)
            .populate('author', 'username email')
            .exec();
        res.status(201).json({
            success: true,
            message: 'Article created successfully',
            article: populatedArticle || newArticle
        });
    }
    catch (error) {
        console.error('Error creating article:', error);
        if (req.file && req.file.path && fs_1.default.existsSync(req.file.path)) {
            try {
                fs_1.default.unlinkSync(req.file.path);
                console.log('Cleaned up temporary file after error');
            }
            catch (cleanupError) {
                console.warn('Failed to cleanup temporary file:', cleanupError);
            }
        }
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err) => err.message);
            res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: validationErrors,
                details: error.message
            });
            return;
        }
        if (error.code === 11000) {
            res.status(409).json({
                success: false,
                message: 'Duplicate entry',
                details: 'Article with this title might already exist'
            });
            return;
        }
        if (error.name === 'MongoError' || error.name === 'MongooseError') {
            res.status(503).json({
                success: false,
                message: 'Database connection error',
                details: process.env.NODE_ENV === 'development' ? error.message : 'Service temporarily unavailable'
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create article',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});
exports.createArticle = createArticle;
const getUserArticles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const articles = yield Article_1.default.find({ author: userId })
            .populate('author', 'firstName email')
            .sort({ createdAt: -1 })
            .lean();
        const articlesWithCounts = articles.map(article => (Object.assign(Object.assign({}, article), { likes: article.likes ? article.likes.length : 0, dislikes: article.dislikes ? article.dislikes.length : 0 })));
        res.status(200).json({
            success: true,
            articles: articlesWithCounts,
            count: articles.length,
        });
    }
    catch (error) {
        console.error('Error fetching user articles:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch articles',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
});
exports.getUserArticles = getUserArticles;
const getArticleById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const articleId = req.params.articleId;
        const article = yield Article_1.default.findById(articleId)
            .populate('author', 'username email firstName')
            .lean();
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        const articleWithCounts = Object.assign(Object.assign({}, article), { likes: article.likes ? article.likes.length : 0, dislikes: article.dislikes ? article.dislikes.length : 0 });
        res.status(200).json({ success: true, article: articleWithCounts });
    }
    catch (error) {
        console.error('Error fetching article:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getArticleById = getArticleById;
const deleteArticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const articleId = req.params.articleId;
        const userId = req.user._id;
        const article = yield Article_1.default.findById(articleId);
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        if (article.author.toString() !== userId) {
            res.status(403).json({ success: false, message: 'Unauthorized to delete this article' });
            return;
        }
        if (article.images && article.images.length > 0) {
            for (const imageUrl of article.images) {
                const publicId = (_a = imageUrl.split('/').pop()) === null || _a === void 0 ? void 0 : _a.split('.')[0];
                if (publicId) {
                    yield cloudinary_1.default.uploader.destroy(`articles/${publicId}`);
                }
            }
        }
        yield Article_1.default.findByIdAndDelete(articleId);
        res.status(200).json({ success: true, message: 'Article deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting article:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete article',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
});
exports.deleteArticle = deleteArticle;
const updateArticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const articleId = req.params.articleId;
        let userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId && req.body.userId) {
            console.warn('Using userId from request body (insecure, for testing only)');
            userId = req.body.userId;
        }
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const { title, content, category, tags } = req.body;
        const article = yield Article_1.default.findById(articleId);
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        if (article.author.toString() !== userId) {
            res.status(403).json({ success: false, message: 'Unauthorized to update this article' });
            return;
        }
        if (!title || !content || !category) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: title, content, and category are required',
            });
            return;
        }
        let imageUrl = article.images[0] || '';
        if (req.file) {
            try {
                if (imageUrl) {
                    const publicId = (_b = imageUrl.split('/').pop()) === null || _b === void 0 ? void 0 : _b.split('.')[0];
                    if (publicId) {
                        yield cloudinary_1.default.uploader.destroy(`articles/${publicId}`);
                    }
                }
                const result = yield cloudinary_1.default.uploader.upload(req.file.path, {
                    folder: 'articles',
                    resource_type: 'image',
                    transformation: [
                        { width: 1200, height: 800, crop: 'limit' },
                        { quality: 'auto' },
                    ],
                });
                imageUrl = result.secure_url;
                try {
                    fs_1.default.unlinkSync(req.file.path);
                }
                catch (cleanupError) {
                    console.warn('Failed to cleanup temporary file:', cleanupError);
                }
            }
            catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                if (req.file && req.file.path && fs_1.default.existsSync(req.file.path)) {
                    try {
                        fs_1.default.unlinkSync(req.file.path);
                    }
                    catch (cleanupError) {
                        console.warn('Failed to cleanup temporary file after error:', cleanupError);
                    }
                }
                res.status(500).json({
                    success: false,
                    message: 'Failed to upload image to cloud storage',
                });
                return;
            }
        }
        let processedTags = [];
        if (tags) {
            if (Array.isArray(tags)) {
                processedTags = tags
                    .filter(tag => tag && tag.trim())
                    .map((tag) => tag.trim().toLowerCase());
            }
            else if (typeof tags === 'string') {
                processedTags = tags
                    .split(',')
                    .filter(tag => tag && tag.trim())
                    .map((tag) => tag.trim().toLowerCase());
            }
        }
        processedTags = [...new Set(processedTags)];
        article.title = title.trim();
        article.content = content.trim();
        article.category = category.trim().toLowerCase();
        article.tags = processedTags;
        article.images = imageUrl ? [imageUrl] : [];
        article.updatedAt = new Date();
        yield article.save();
        const populatedArticle = yield Article_1.default.findById(articleId)
            .populate('author', 'username email firstName')
            .lean();
        res.status(200).json({
            success: true,
            message: 'Article updated successfully',
            article: populatedArticle,
        });
    }
    catch (error) {
        console.error('Error updating article:', error);
        if (req.file && req.file.path && fs_1.default.existsSync(req.file.path)) {
            try {
                fs_1.default.unlinkSync(req.file.path);
            }
            catch (cleanupError) {
                console.warn('Failed to cleanup temporary file:', cleanupError);
            }
        }
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err) => err.message);
            res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: validationErrors,
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to update article',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
});
exports.updateArticle = updateArticle;
const getArticlesByCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { categories } = req.query;
        if (!categories) {
            res.status(400).json({ success: false, message: 'Categories parameter is required' });
            return;
        }
        const categoryArray = typeof categories === 'string' ? categories.split(',').map(cat => cat.trim().toLowerCase()) : [];
        if (categoryArray.length === 0) {
            res.status(400).json({ success: false, message: 'No valid categories provided' });
            return;
        }
        const articles = yield Article_1.default.find({ category: { $in: categoryArray } })
            .populate('author', 'firstName email')
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json({
            success: true,
            articles,
            count: articles.length,
        });
    }
    catch (error) {
        console.error('Error fetching articles by categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch articles',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
});
exports.getArticlesByCategories = getArticlesByCategories;
const likeArticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const articleId = req.params.articleId;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const article = yield Article_1.default.findById(articleId);
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        if ((_b = article.likes) === null || _b === void 0 ? void 0 : _b.includes(userId)) {
            res.status(400).json({ success: false, message: 'You have already liked this article' });
            return;
        }
        article.dislikes = ((_c = article.dislikes) === null || _c === void 0 ? void 0 : _c.filter((id) => id.toString() !== userId.toString())) || [];
        article.likes = article.likes || [];
        article.likes.push(userId);
        yield article.save();
        const populatedArticle = yield Article_1.default.findById(articleId)
            .populate('author', 'firstName email')
            .lean();
        res.status(200).json({
            success: true,
            message: 'Article liked successfully',
            article: populatedArticle,
        });
    }
    catch (error) {
        console.error('Error liking article:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to like article',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
});
exports.likeArticle = likeArticle;
const removelikeArticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const articleId = req.params.articleId;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const article = yield Article_1.default.findById(articleId);
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        if (!((_b = article.likes) === null || _b === void 0 ? void 0 : _b.includes(userId))) {
            res.status(400).json({ success: false, message: 'You have not liked this article' });
            return;
        }
        article.likes = ((_c = article.likes) === null || _c === void 0 ? void 0 : _c.filter((id) => id.toString() !== userId.toString())) || [];
        yield article.save();
        const populatedArticle = yield Article_1.default.findById(articleId)
            .populate('author', 'firstName email')
            .lean();
        res.status(200).json({
            success: true,
            message: 'Article like removed successfully',
            article: populatedArticle,
        });
    }
    catch (error) {
        console.error('Error removing like from article:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove like from article',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
});
exports.removelikeArticle = removelikeArticle;
const removedislikeArticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const articleId = req.params.articleId;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const article = yield Article_1.default.findById(articleId);
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        if (!((_b = article.dislikes) === null || _b === void 0 ? void 0 : _b.includes(userId))) {
            res.status(400).json({ success: false, message: 'You have not disliked this article' });
            return;
        }
        article.dislikes = ((_c = article.dislikes) === null || _c === void 0 ? void 0 : _c.filter((id) => id.toString() !== userId.toString())) || [];
        yield article.save();
        const populatedArticle = yield Article_1.default.findById(articleId)
            .populate('author', 'firstName email')
            .lean();
        res.status(200).json({
            success: true,
            message: 'Article dislike removed successfully',
            article: populatedArticle,
        });
    }
    catch (error) {
        console.error('Error removing dislike from article:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove dislike from article',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
});
exports.removedislikeArticle = removedislikeArticle;
const dislikeArticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const articleId = req.params.articleId;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const article = yield Article_1.default.findById(articleId);
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        if ((_b = article.dislikes) === null || _b === void 0 ? void 0 : _b.includes(userId)) {
            res.status(400).json({ success: false, message: 'You have already disliked this article' });
            return;
        }
        article.likes = ((_c = article.likes) === null || _c === void 0 ? void 0 : _c.filter((id) => id.toString() !== userId.toString())) || [];
        article.dislikes = article.dislikes || [];
        article.dislikes.push(userId);
        yield article.save();
        const populatedArticle = yield Article_1.default.findById(articleId)
            .populate('author', 'firstName email')
            .lean();
        res.status(200).json({
            success: true,
            message: 'Article disliked successfully',
            article: populatedArticle,
        });
    }
    catch (error) {
        console.error('Error disliking article:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to dislike article',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
});
exports.dislikeArticle = dislikeArticle;
const blockArticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const articleId = req.params.articleId;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const article = yield Article_1.default.findById(articleId);
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        if (!((_b = article.blocks) === null || _b === void 0 ? void 0 : _b.includes(userId))) {
            article.blocks = article.blocks || [];
            article.blocks.push(userId);
        }
        yield article.save();
        const populatedArticle = yield Article_1.default.findById(articleId)
            .populate('author', 'firstName email')
            .lean();
        res.status(200).json({
            success: true,
            message: 'Article blocked successfully',
            article: populatedArticle,
        });
    }
    catch (error) {
        console.error('Error blocking article:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to block article',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
});
exports.blockArticle = blockArticle;
const unblockArticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const articleId = req.params.articleId;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const article = yield Article_1.default.findById(articleId);
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        article.blocks = ((_b = article.blocks) === null || _b === void 0 ? void 0 : _b.filter((id) => id.toString() !== userId.toString())) || [];
        yield article.save();
        const populatedArticle = yield Article_1.default.findById(articleId)
            .populate('author', 'firstName email')
            .lean();
        res.status(200).json({
            success: true,
            message: 'Article unblocked successfully',
            article: populatedArticle,
        });
    }
    catch (error) {
        console.error('Error unblocking article:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unblock article',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
});
exports.unblockArticle = unblockArticle;
const getLatestArticles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const articles = yield Article_1.default.find()
            .populate('author', 'firstName username email')
            .sort({ createdAt: -1 })
            .limit(6)
            .lean();
        const articlesWithCounts = articles.map(article => (Object.assign(Object.assign({}, article), { likes: article.likes ? article.likes.length : 0, dislikes: article.dislikes ? article.dislikes.length : 0 })));
        res.status(200).json({
            success: true,
            articles: articlesWithCounts,
            count: articlesWithCounts.length,
        });
    }
    catch (error) {
        console.error('Error fetching latest articles:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch latest articles',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
});
exports.getLatestArticles = getLatestArticles;
