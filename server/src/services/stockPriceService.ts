export interface StockPriceService {
  getCurrentPrice(ticker: string): Promise<number | null>;
  getBulkPrices(tickers: string[]): Promise<Record<string, number>>;
}
