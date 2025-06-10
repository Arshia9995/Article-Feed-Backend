import express from 'express';
import {   blockArticle, createArticle, deleteArticle, dislikeArticle, getArticleById,  getArticlesByCategories,  getUserArticles, likeArticle,  unblockArticle,  updateArticle } from '../controllers/articleController';
import upload from '../middleware/upload';
import authMiddleware from '../middleware/authMiddleware';
import multer from 'multer';

const articleRoutes = express.Router();

// Error handling middleware for multer
const handleMulterError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
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

  // Pass other errors to the next error handler
  next(error);
};

// Create article route with proper error handling
articleRoutes.post('/create', 
  authMiddleware, 
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  createArticle
);

articleRoutes.get('/getuserarticles', authMiddleware, getUserArticles)
articleRoutes.get('/articles/:articleId', authMiddleware, getArticleById);
articleRoutes.delete('/articles/:articleId', authMiddleware, deleteArticle);
articleRoutes.put('/articles/:articleId',  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  }, updateArticle);
articleRoutes.get('/getarticles-by-preferences', authMiddleware, getArticlesByCategories);

articleRoutes.post('/articles/like/:articleId',authMiddleware, likeArticle);
articleRoutes.post('/articles/dislike/:articleId', authMiddleware, dislikeArticle);
// articleRoutes.post('/articles/block/:articleId', authMiddleware, blockArticle);

articleRoutes.post('/articles/block/:articleId', authMiddleware, blockArticle);
articleRoutes.post('/articles/unblock/:articleId', authMiddleware, unblockArticle);

export default articleRoutes;