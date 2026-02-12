import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { StockPriceService } from './stockPriceService';

export class YahooFinanceService implements StockPriceService {
  async getCurrentPrice(ticker: string): Promise<number | null> {
    try {
      const quote = await yahooFinance.quote(ticker);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (quote as any).regularMarketPrice || null;
    } catch (error) {
      console.error(`Failed to fetch price for ${ticker}`, error);
      return null;
    }
  }

  async getBulkPrices(tickers: string[]): Promise<Record<string, number>> {
    const results: Record<string, number> = {};
    if (tickers.length === 0) return results;

    try {
      const quotes = await yahooFinance.quote(tickers);
      // yahooFinance.quote returns an array if multiple tickers, but we need to handle types safely
      const quotesArray = Array.isArray(quotes) ? quotes : [quotes];
      
      for (const quote of quotesArray) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q = quote as any; 
        if (q.symbol && q.regularMarketPrice) {
          results[q.symbol] = q.regularMarketPrice;
        }
      }
    } catch (error) {
      console.error('Failed to fetch bulk prices', error);
      // Fallback: try one by one if bulk fails
      for (const ticker of tickers) {
        const price = await this.getCurrentPrice(ticker);
        if (price !== null) {
          results[ticker] = price;
        }
      }
    }
    return results;
  }
}

export const stockService = new YahooFinanceService();
