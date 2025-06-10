import express,{ Application, NextFunction, Request, Response } from "express";
import morgan from 'morgan';
import connectDB from "./config/database";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { envVaribales } from "./config/env_variables";
import authRoutes from "./routes/authRoutes";
import articleRoutes from "./routes/articleRoutes";


dotenv.config();

const app: Application = express();
const PORT = envVaribales.PORT;

console.log(envVaribales.FRONTEND_URL)
app.use(cors({
  origin: envVaribales.FRONTEND_URL, 
  credentials: true, 
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
// app.use('/', router);
app.use('/auth', authRoutes);
app.use('/article', articleRoutes)

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message + "💥");
  res.status(500).json({
    error: err.message || 'Internal Server Error',
  });
});

connectDB();
app.listen(PORT,()=>{
    console.log(`server is running on http://localhost:${PORT}`)
})

export default app;