import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API only if the key is present
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const generateMonthlyReport = async (
  year: number,
  month: number,
  data: any
): Promise<string> => {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }

  // Use the Flash model for an optimal balance of speed and quality
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
당신은 나와 내 배우자의 가계부를 날카롭고 친절하게 분석해 주는 재무 멘토야.
아래는 ${year}년 ${month}월의 가계부 수입/지출 내역 통계 및 예산 데이터야.

[제공된 데이터]
${JSON.stringify(data, null, 2)}

이 데이터를 바탕으로 이번 달의 "월간 재무 총평"을 Markdown 포맷으로 작성해줘.
다음 항목들이 포함되면 좋겠어:
1. **이번 달 한 줄 요약:** 이번 달 소비/저루 패턴을 관통하는 임팩트 있는 한 줄 평.
2. **수입 및 지출 분석:** 주요 수입원 및 가장 많은 지출이 발생한 카테고리(TOP 3), 눈에 띄는 소비 특징.
3. **예산 대비 평가:** 설정된 예산 대비 초과 또는 절약한 항목들에 대한 코멘트.
4. **멘토의 조언:** 다음 달을 위한 실질적이고 격려가 되는 재무 조언.

[형식 제약사항]
- 마크다운(Markdown) 문법을 적극적으로 사용하여 가독성 있게 작성할 것.
- JSON 텍스트 그대로를 읊지 말고, 자연스러운 문장으로 풀어서 설명할 것.
- 숫자 뒤에는 '원'을 붙이고 알아보기 쉽게 콤마(,)를 찍을 것.
- 불필요한 인사이트(예: "데이터에 따르면...") 보다는 직관적이고 바로 도움 되는 분석을 제공할 것.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating content from Gemini:', error);
    throw new Error('Failed to generate report from AI.');
  }
};
