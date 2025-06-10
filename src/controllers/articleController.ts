import { Request, Response } from 'express';
import Article from '../models/Article';
import cloudinary from '../config/cloudinary';
import fs from 'fs';

export const createArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    console.log('User from middleware:', (req as any).user);

    const { title, content, tags, category } = req.body;
    
    // Check if user exists (from auth middleware)
    if (!(req as any).user || !(req as any).user._id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const author = (req as any).user._id;

    // Validate required fields
    if (!title || !content || !category) {
      res.status(400).json({ 
        message: 'Missing required fields: title, content, and category are required' 
      });
      return;
    }

    let imageUrl = '';

    // Upload image to Cloudinary if file exists
    if (req.file) {
      try {
        console.log('Uploading image to Cloudinary...');
        console.log('File path:', req.file.path);
        
        // Check if file actually exists
        if (!fs.existsSync(req.file.path)) {
          throw new Error('Uploaded file not found on server');
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'articles',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto' }
          ]
        });
        
        imageUrl = result.secure_url;
        console.log('Image uploaded successfully:', imageUrl);

        // Clean up temporary file after successful upload
        try {
          fs.unlinkSync(req.file.path);
          console.log('Temporary file cleaned up');
        } catch (cleanupError) {
          console.warn('Failed to cleanup temporary file:', cleanupError);
          // Don't fail the request if cleanup fails
        }

      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        
        // Clean up temporary file on error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
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

    // Process tags - handle both string and array cases
    let processedTags: string[] = [];
    if (tags) {
      if (Array.isArray(tags)) {
        processedTags = tags
          .filter(tag => tag && tag.trim()) // Remove empty tags
          .map((tag: string) => tag.trim().toLowerCase());
      } else if (typeof tags === 'string') {
        // Handle comma-separated string or single tag
        processedTags = tags
          .split(',')
          .filter(tag => tag && tag.trim()) // Remove empty tags
          .map((tag: string) => tag.trim().toLowerCase());
      }
    }

    // Remove duplicate tags
    processedTags = [...new Set(processedTags)];

    // Create article with validated data
    const articleData = {
      title: title.trim(),
      content: content.trim(),
      images: imageUrl ? [imageUrl] : [],
      tags: processedTags,
      category: category.trim().toLowerCase(),
      author,
    };

    console.log('Creating article with data:', articleData);

    const newArticle = await Article.create(articleData);
    
    console.log('Article created successfully:', newArticle._id);

    // Populate author info before sending response (optional)
    const populatedArticle = await Article.findById(newArticle._id)
      .populate('author', 'username email')
      .exec();

    res.status(201).json({ 
      success: true,
      message: 'Article created successfully', 
      article: populatedArticle || newArticle
    });

  } catch (error: any) {
    console.error('Error creating article:', error);
    
    // Clean up temporary file if it exists and there was an error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Cleaned up temporary file after error');
      } catch (cleanupError) {
        console.warn('Failed to cleanup temporary file:', cleanupError);
      }
    }
    
    // More specific error handling
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
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

    // Database connection errors
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
};


export const getUserArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    
    const articles = await Article.find({ author: userId })
      .populate('author', 'firstName email')
      .sort({ createdAt: -1 }) // Latest first
      .exec();

    res.status(200).json({
      success: true,
      articles,
      count: articles.length
    });
  } catch (error: any) {
    console.error('Error fetching user articles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

export const getArticleById = async (req: Request, res: Response) => {
  try {
    const articleId = req.params.articleId;
    const article = await Article.findById(articleId)
      .populate('author', 'username email firstName')
      .lean();

    if (!article) {
       res.status(404).json({ success: false, message: 'Article not found' });
       return;
    }

    res.status(200).json({ success: true, article });
  } catch (error: any) {
    console.error('Error fetching article:', error);
    res.status(500).json({ success: false, message: error.message });
    
  }
};

export const deleteArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const articleId = req.params.articleId;
    const userId = (req as any).user._id;

    const article = await Article.findById(articleId);

    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    // Check if the user is the author
    if (article.author.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Unauthorized to delete this article' });
      return;
    }

    // Delete images from Cloudinary if they exist
    if (article.images && article.images.length > 0) {
      for (const imageUrl of article.images) {
        const publicId = imageUrl.split('/').pop()?.split('.')[0]; // Extract public ID from URL
        if (publicId) {
          await cloudinary.uploader.destroy(`articles/${publicId}`);
        }
      }
    }

    await Article.findByIdAndDelete(articleId);

    res.status(200).json({ success: true, message: 'Article deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete article',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};



export const updateArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const articleId = req.params.articleId;
    let userId = (req as any).user?._id;

    // Fallback to req.body.userId for testing (not secure!)
    if (!userId && req.body.userId) {
      console.warn('Using userId from request body (insecure, for testing only)');
      userId = req.body.userId;
    }

    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
   
    
    const { title, content, category, tags } = req.body;

    const article = await Article.findById(articleId);

    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    // Check if the user is the author
    if (article.author.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Unauthorized to update this article' });
      return;
    }

    // Validate required fields
    if (!title || !content || !category) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: title, content, and category are required',
      });
      return;
    }

    let imageUrl = article.images[0] || '';

    // Handle image update
    if (req.file) {
      try {
        // Delete old image from Cloudinary if it exists
        if (imageUrl) {
          const publicId = imageUrl.split('/').pop()?.split('.')[0];
          if (publicId) {
            await cloudinary.uploader.destroy(`articles/${publicId}`);
          }
        }

        // Upload new image
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'articles',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto' },
          ],
        });

        imageUrl = result.secure_url;

        // Clean up temporary file
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temporary file:', cleanupError);
        }
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
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

    // Process tags
    let processedTags: string[] = [];
    if (tags) {
      if (Array.isArray(tags)) {
        processedTags = tags
          .filter(tag => tag && tag.trim())
          .map((tag: string) => tag.trim().toLowerCase());
      } else if (typeof tags === 'string') {
        processedTags = tags
          .split(',')
          .filter(tag => tag && tag.trim())
          .map((tag: string) => tag.trim().toLowerCase());
      }
    }
    processedTags = [...new Set(processedTags)]; // Remove duplicates

    // Update article
    article.title = title.trim();
    article.content = content.trim();
    article.category = category.trim().toLowerCase();
    article.tags = processedTags;
    article.images = imageUrl ? [imageUrl] : [];
    article.updatedAt = new Date();

    await article.save();

    // Populate author info
    const populatedArticle = await Article.findById(articleId)
      .populate('author', 'username email firstName')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Article updated successfully',
      article: populatedArticle,
    });
  } catch (error: any) {
    console.error('Error updating article:', error);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temporary file:', cleanupError);
      }
    }
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
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
};

export const getArticlesByCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categories } = req.query;

    // Validate categories
    if (!categories) {
      res.status(400).json({ success: false, message: 'Categories parameter is required' });
      return;
    }

    // Convert categories to array
    const categoryArray = typeof categories === 'string' ? categories.split(',').map(cat => cat.trim().toLowerCase()) : [];

    if (categoryArray.length === 0) {
      res.status(400).json({ success: false, message: 'No valid categories provided' });
      return;
    }

    // Fetch articles matching the categories
    const articles = await Article.find({ category: { $in: categoryArray } })
      .populate('author', 'firstName email')
      .sort({ createdAt: -1 }) // Latest articles first
      .lean();

    res.status(200).json({
      success: true,
      articles,
      count: articles.length,
    });
  } catch (error: any) {
    console.error('Error fetching articles by categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

export const likeArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const articleId = req.params.articleId;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const article = await Article.findById(articleId);
    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    // Remove user from dislikes if they exist there
    article.dislikes = article.dislikes?.filter((id) => id.toString() !== userId.toString()) || [];

    // Add user to likes if not already present
    if (!article.likes?.includes(userId)) {
      article.likes = article.likes || [];
      article.likes.push(userId);
    }

    await article.save();

    // Populate author info for response
    const populatedArticle = await Article.findById(articleId)
      .populate('author', 'firstName email')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Article liked successfully',
      article: populatedArticle,
    });
  } catch (error: any) {
    console.error('Error liking article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like article',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// Dislike an article
export const dislikeArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const articleId = req.params.articleId;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const article = await Article.findById(articleId);
    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    // Remove user from likes if they exist there
    article.likes = article.likes?.filter((id) => id.toString() !== userId.toString()) || [];

    // Add user to dislikes if not already present
    if (!article.dislikes?.includes(userId)) {
      article.dislikes = article.dislikes || [];
      article.dislikes.push(userId);
    }

    await article.save();

    // Populate author info for response
    const populatedArticle = await Article.findById(articleId)
      .populate('author', 'firstName email')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Article disliked successfully',
      article: populatedArticle,
    });
  } catch (error: any) {
    console.error('Error disliking article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dislike article',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

export const blockArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const articleId = req.params.articleId;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const article = await Article.findById(articleId);
    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    // Add user to blocks if not already present
    if (!article.blocks?.includes(userId)) {
      article.blocks = article.blocks || [];
      article.blocks.push(userId);
    }

    await article.save();

    // Populate author info for response
    const populatedArticle = await Article.findById(articleId)
      .populate('author', 'firstName email')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Article blocked successfully',
      article: populatedArticle,
    });
  } catch (error: any) {
    console.error('Error blocking article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block article',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// Unblock an article
export const unblockArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const articleId = req.params.articleId;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const article = await Article.findById(articleId);
    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    // Remove user from blocks if they exist there
    article.blocks = article.blocks?.filter((id) => id.toString() !== userId.toString()) || [];

    await article.save();

    // Populate author info for response
    const populatedArticle = await Article.findById(articleId)
      .populate('author', 'firstName email')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Article unblocked successfully',
      article: populatedArticle,
    });
  } catch (error: any) {
    console.error('Error unblocking article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock article',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};




