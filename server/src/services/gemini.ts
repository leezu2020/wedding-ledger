import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

// Initialize the API dynamically so dotenv has time to load
let genAI: GoogleGenerativeAI | null = null;

export const generateMonthlyReport = async (
  year: number,
  month: number,
  data: any,
  prevReportContext?: string | null
): Promise<string> => {
  // Lazy initialize
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }

  // Use the Flash model for an optimal balance of speed and quality
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1beta' });

  // Load prompt template
  const templatePath = path.join(__dirname, '..', 'prompts', 'monthly-report.md');
  let promptTemplate = await fs.readFile(templatePath, 'utf8');

  // Replace variables
  promptTemplate = promptTemplate.replace('{{YEAR}}', year.toString());
  promptTemplate = promptTemplate.replace('{{MONTH}}', month.toString());
  promptTemplate = promptTemplate.replace('{{DATA}}', JSON.stringify(data, null, 2));

  let prevContextStr = '';
  if (prevReportContext) {
    prevContextStr = `[참고: 지난달(${prevReportContext.substring(0, 10).replace(/[^0-9]/g, '')}...) 재무 총평 요약]\n${prevReportContext}\n\n위 지난달의 조언이나 평가결과(특히 이전 달에 지적받거나 칭찬받은 내용)를 바탕으로 이번 달에 개선된 점이나 아쉬운 점을 연속성 있게 비교해서 분석해줘.`;
  }
  const prompt = promptTemplate.replace('{{PREV_CONTEXT}}', prevContextStr);

  try {
    console.log('[Gemini API] Requesting content generation for', year, month);
    
    // 5분 타임아웃 강제 부여
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Gemini API call timed out after 5 minutes')), 300000)
    );

    const result = await Promise.race([
      model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 65536, temperature: 0.7 }
      }),
      timeoutPromise
    ]) as any;

    console.log('[Gemini API] Received response. Waiting for text resolution...');
    const response = await result.response;
    console.log('[Gemini API] Generation completely successful.');
    
    return response.text();
  } catch (error: any) {
    console.error('Error generating content from Gemini:', error);
    throw new Error(`Failed to generate report from AI. Detail: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
  }
};
