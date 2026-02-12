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

    // Expand tickers to include potential suffixes for Korean stocks
    // Map original ticker to list of candidate tickers to check
    const tickerMapping: Record<string, string[]> = {};
    const allTickersToFetch = new Set<string>();

    for (const t of tickers) {
      const candidates = [t];
      // Check if it looks like a Korean ticker (6 digits/chars) and has no suffix
      if (/^[0-9A-Z]{6}$/.test(t)) {
        candidates.push(`${t}.KS`);
        candidates.push(`${t}.KQ`);
      }
      tickerMapping[t] = candidates;
      candidates.forEach(c => allTickersToFetch.add(c));
    }

    const fetchList = Array.from(allTickersToFetch);

    try {
      // Try bulk fetch first
      const quotes = await yahooFinance.quote(fetchList);
      const quotesArray = Array.isArray(quotes) ? quotes : [quotes];
      
      const priceMap: Record<string, number> = {};
      for (const quote of quotesArray) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q = quote as any; 
        if (q.symbol && q.regularMarketPrice) {
          priceMap[q.symbol] = q.regularMarketPrice;
        }
      }

      // Map back to original tickers
      for (const original of tickers) {
        const candidates = tickerMapping[original];
        for (const candidate of candidates) {
          if (priceMap[candidate] !== undefined) {
            results[original] = priceMap[candidate];
            break; // Found a valid price, stop checking candidates
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to fetch bulk prices, falling back to individual', error);
      
      // Fallback: try one by one for each ORIGINAL ticker
      // For each original ticker, try candidates until one works
      for (const original of tickers) {
        const candidates = tickerMapping[original];
        for (const candidate of candidates) {
          try {
            const price = await this.getCurrentPrice(candidate);
            if (price !== null) {
              results[original] = price;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
    }
    return results;
  }
}

export const stockService = new YahooFinanceService();
