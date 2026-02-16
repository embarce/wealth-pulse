
export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum CapitalType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW'
}

export interface Transaction {
  id: string;
  date: string;
  symbol: string;
  type: TransactionType;
  price: number;
  quantity: number;
  total: number;
  fee?: number;           // 交易手续费
  tradeTime?: string;     // 交易时间（可追溯历史交易）
  aiScore?: number;
  aiAdvice?: string;
  aiDetails?: {
    timingScore: number;
    positionScore: number;
    riskScore: number;
  };
}

export interface DetectedRecord {
  symbol: string;
  type: TransactionType;
  price: number;
  quantity: number;
  date: string;
  confidence: number;
}

export interface CapitalLog {
  id: string;
  date: string;
  type: CapitalType;
  amount: number;
}

export interface Holding {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

export interface StockPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  history: { time: string; price: number }[];
  marketCap?: string;
}

export interface AppConfig {
  email: string;
  emailEnabled: boolean;
  feishuWebhook: string;
  feishuEnabled: boolean;
  // 通知行为配置 (取代旧的交易偏好)
  notifyReviewComplete: boolean;  // 复盘审计任务完成
  notifyVisionReady: boolean;    // 视觉识图数据就绪
  notifyMarketAlert: boolean;    // 异动行情监控提醒
  notifyPortfolioRisk: boolean;  // 仓位健康动态警报
}

export interface ChartInterpretation {
  patterns: string[];
  support: number;
  resistance: number;
  takeProfit: number;
  stopLoss: number;
  advice: string;
}

export interface PortfolioAnalysis {
  riskScore: number;
  diversityScore: number;
  efficiencyScore: number;
  summary: string;
  warnings: string[];
  suggestions: string[];
}

export interface AINewsItem {
  title: string;
  summary: string;
  impact: 'positive' | 'negative' | 'neutral';
  time: string;
}

export interface AIHotspot {
  topic: string;
  relevance: number;
  description: string;
}
