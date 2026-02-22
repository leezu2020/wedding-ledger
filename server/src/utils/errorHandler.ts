import { Response } from 'express';

/**
 * Send a 500 error response with the actual error message in Korean.
 */
export function sendError(res: Response, context: string, error: any) {
  console.error(`[${context}]`, error);
  const detail = error?.message || '알 수 없는 오류';
  res.status(500).json({ error: `${context}: ${detail}` });
}
