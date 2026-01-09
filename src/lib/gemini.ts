import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
