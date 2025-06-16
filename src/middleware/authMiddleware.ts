import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET as string;

interface JwtPayload {
  userId: string;
  email: string;
}

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.cookies.accessToken;
    console.log(token, " token here")

    if (!token) {
      res.status(401).json({ message: 'Access token missing. Unauthorized' });
      return;
    }

    const decoded = jwt.verify(token, ACCESS_SECRET) as JwtPayload;

    
    (req as any).user = { _id: decoded.userId, email: decoded.email };

    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export default authMiddleware;
