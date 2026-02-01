
import { StockPrice } from './types';

export const INITIAL_STOCKS: StockPrice[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 189.43, change: 1.25, changePercent: 0.66, high: 191.05, low: 188.20, history: [] },
  { symbol: 'TSLA', name: 'Tesla, Inc.', price: 175.22, change: -4.30, changePercent: -2.39, high: 182.10, low: 174.50, history: [] },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.20, change: 15.40, changePercent: 1.79, high: 884.00, low: 860.50, history: [] },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 415.50, change: 2.10, changePercent: 0.51, high: 418.30, low: 412.10, history: [] },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 152.30, change: 0.85, changePercent: 0.56, high: 154.20, low: 151.00, history: [] },
  { symbol: 'AMD', name: 'Advanced Micro Devices', price: 190.10, change: -2.15, changePercent: -1.12, high: 195.40, low: 189.50, history: [] },
];

export const generateMockHistory = (basePrice: number) => {
  const history = [];
  let currentPrice = basePrice;
  for (let i = 20; i >= 0; i--) {
    const change = (Math.random() - 0.5) * (basePrice * 0.05);
    currentPrice += change;
    history.push({
      time: `${i}d ago`,
      price: parseFloat(currentPrice.toFixed(2))
    });
  }
  return history;
};
