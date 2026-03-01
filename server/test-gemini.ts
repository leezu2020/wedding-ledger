import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
const apiKey = process.env.GEMINI_API_KEY!;

async function run() {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
  for (const modelName of models) {
    try {
      console.log(`Testing ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
      const res = await model.generateContent("hello");
      console.log(`Success ${modelName}:`, await res.response.text());
      return; // Stop on first success
    } catch (err: any) {
      console.log(`Failed ${modelName}:`, err.message);
    }
  }
}

run();
