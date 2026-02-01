
import { Transaction, CapitalLog, AppConfig, TransactionType, CapitalType } from '../types';

/**
 * 这是一个模拟后端 API 的服务层
 * 增加了初始模拟数据的注入逻辑
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'stock_transactions',
  CAPITAL: 'stock_capital',
  CONFIG: 'app_config'
};

const MOCK_CAPITAL: CapitalLog[] = [
  { id: 'c1', date: new Date(Date.now() - 86400000 * 5).toISOString(), type: CapitalType.DEPOSIT, amount: 50000 },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    date: new Date(Date.now() - 86400000 * 4).toISOString(),
    symbol: 'NVDA',
    type: TransactionType.BUY,
    price: 850.20,
    quantity: 10,
    total: 8502,
    aiScore: 85,
    aiAdvice: "在支撑位附近建仓，符合半导体板块上行趋势。"
  },
  {
    id: 't2',
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
    symbol: 'AAPL',
    type: TransactionType.BUY,
    price: 185.50,
    quantity: 20,
    total: 3710,
    aiScore: 78,
    aiAdvice: "大盘蓝筹避险配置，估值合理。"
  },
  {
    id: 't3',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    symbol: 'NVDA',
    type: TransactionType.SELL,
    price: 920.40,
    quantity: 5,
    total: 4602,
    aiScore: 92,
    aiAdvice: "高位止盈，锁定部分利润，操作精准。"
  },
  {
    id: 't4',
    date: new Date(Date.now() - 86400000 * 1).toISOString(),
    symbol: 'TSLA',
    type: TransactionType.BUY,
    price: 170.10,
    quantity: 15,
    total: 2551.5,
    aiScore: 65,
    aiAdvice: "左侧交易尝试，风险较高但赔率不错。"
  }
];

export const apiService = {
  // 交易记录
  async getTransactions(): Promise<Transaction[]> {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) {
      // 注入模拟数据并保存
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(MOCK_TRANSACTIONS));
      return MOCK_TRANSACTIONS;
    }
    return JSON.parse(data);
  },
  
  async saveTransaction(tx: Transaction): Promise<void> {
    const txs = await this.getTransactions();
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([tx, ...txs]));
  },

  async updateTransactions(txs: Transaction[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  },

  // 资金流水
  async getCapitalLogs(): Promise<CapitalLog[]> {
    const data = localStorage.getItem(STORAGE_KEYS.CAPITAL);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CAPITAL, JSON.stringify(MOCK_CAPITAL));
      return MOCK_CAPITAL;
    }
    return JSON.parse(data);
  },

  async saveCapitalLog(log: CapitalLog): Promise<void> {
    const logs = await this.getCapitalLogs();
    localStorage.setItem(STORAGE_KEYS.CAPITAL, JSON.stringify([log, ...logs]));
  },

  // 系统配置
  async getConfig(): Promise<AppConfig> {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (data) return JSON.parse(data);
    return {
      email: 'admin@pulse.ai',
      emailEnabled: false,
      feishuWebhook: '',
      feishuEnabled: false,
      notifyReviewComplete: true,
      notifyVisionReady: true,
      notifyMarketAlert: false,
      notifyPortfolioRisk: true
    };
  },

  async saveConfig(config: AppConfig): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }
};
