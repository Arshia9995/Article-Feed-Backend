import mongoose, { Document } from "mongoose";

export interface IArticle extends Document {
  title: string;
  content: string;
  images: string[];
  tags: string[];
  category: string;
  author: mongoose.Types.ObjectId;
  likes: mongoose.Types.ObjectId[];
  dislikes: mongoose.Types.ObjectId[];
  blocks: mongoose.Types.ObjectId[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}