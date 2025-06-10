import mongoose, { Document, Schema } from 'mongoose';
import { IArticle } from '../types/IArticle';

const ArticleSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  images: [{
    type: String,
    required: false
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    required: true,
    enum: ['sports', 'politics', 'space', 'technology', 'health', 'entertainment', 'business', 'science', 'lifestyle', 'education'],
    lowercase: true
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  blocks: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Index for better query performance
ArticleSchema.index({ category: 1, createdAt: -1 });
ArticleSchema.index({ author: 1, createdAt: -1 });
ArticleSchema.index({ tags: 1 });

export default mongoose.model<IArticle>('Article', ArticleSchema);