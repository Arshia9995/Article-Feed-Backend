import dotenv from 'dotenv';

dotenv.config();

export const envVaribales = {
    PORT:process.env.PORT||5000,
     MONGO_URI: process.env.MONGO_URI || '',
    //  ACCESS_TOKEN_SECRET:process.env.ACCESS_TOKEN_SECRET||" ",
    //  REFRESH_TOKEN_SECRET:process.env.REFRESH_TOKEN_SECRET||" ",
     FRONTEND_URL:process.env.FRONTEND_URL||""
}