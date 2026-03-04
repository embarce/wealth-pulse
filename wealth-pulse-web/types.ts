
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
  // AI 模型配置
  llmProvider?: string;  // LLM 供应商：doubao/openai/qwen 等
  llmModel?: string;     // 模型名称
}

export interface ChartInterpretation {
  patterns: string[];
  support: number | string;
  resistance: number | string;
  takeProfit: number | string;
  stopLoss: number | string;
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

// ==================== 股票信息面板相关类型 ====================

/** 新闻条目 */
export interface StockNews {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishTime: string;
  url?: string;
  impact: 'positive' | 'negative' | 'neutral';
}

/** 公司资料 */
export interface CompanyProfile {
  stockCode: string;
  companyName: string;
  companyNameEn: string;
  registrationPlace: string;
  establishmentDate: string;
  industry: string;
  chairman: string;
  companySecretary: string;
  employeeCount: number;
  officeAddress: string;
  website: string;
  email: string;
  yearEndDate: string;
  phone: string;
  auditor: string;
  fax: string;
  companyIntroduction: string;
}

/** 财务指标 */
export interface FinancialIndicator {
  stockCode: string;
  basicEps: string;              // 基本每股收益(元)
  netAssetsPerShare: string;     // 每股净资产(元)
  legalCapital: string;          // 法定股本(股)
  lotSize: string;               // 每手股
  dividendPerShareTtm: string;   // 每股股息TTM(港元)
  payoutRatio: string;           // 派息比率(%)
  issuedCapital: string;         // 已发行股本(股)
  issuedCapitalHShares: number;  // 已发行股本-H股(股)
  operatingCashFlowPerShare: string; // 每股经营现金流(元)
  dividendYieldTtm: string;      // 股息率TTM(%)
  totalMarketCapHkd: string;     // 总市值(港元)
  hkMarketCapHkd: string;        // 港股市值(港元)
  totalOperatingRevenue: string; // 营业总收入
  operatingRevenueGrowthYoy: string; // 营业总收入滚动环比增长(%)
  netProfitMargin: string;       // 销售净利率(%)
  netProfit: string;             // 净利润
  netProfitGrowthYoy: string;    // 净利润滚动环比增长(%)
  roe: string;                   // 股东权益回报率(%)
  peRatio: string;               // 市盈率
  pbRatio: string;               // 市净率
  roa: string;                   // 总资产回报率(%)
}
