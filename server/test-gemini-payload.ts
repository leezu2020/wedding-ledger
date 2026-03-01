import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
const apiKey = process.env.GEMINI_API_KEY!;

async function run() {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1beta' });

  const prompt = "당신은 가계부를 날카롭게 분석해주는 멘토입니다...";
  try {
    console.log("Sending payload...");
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
    });
    console.log("Success:", await result.response.text());
  } catch (err: any) {
    console.log(`Failed gemini-2.5-flash payload test:`);
    console.log(err.message);
  }
}

run();
