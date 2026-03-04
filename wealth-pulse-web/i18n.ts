
export type Language = 'zh' | 'en';

export const translations = {
  zh: {
    // ... existing
    login_title: '财富脉搏',
    login_subtitle: '个人资产智能分析终端',
    login_admin: '管理员账号',
    login_pwd: '安全密码',
    login_btn: '登录系统',
    login_footer: '受保护的个人资产分析终端',
    login_loading: '正在验证身份...',
    
    // Sidebar
    dashboard: '财富面板',
    market: '行情搜索',
    holdings: '我的持仓',
    records: '交易记录',
    aiLab: 'AI 实验室',
    settings: '系统配置',
    help: '帮助支持',
    terminal: '智能终端',
    netWorth: '账户净值',
    totalReturn: '累计收益率',
    professional: '专业版',
    
    // Dashboard & Metrics
    totalAssets: '预估总资产',
    accumulatedProfit: '累计盈亏',
    cashAvailable: '可用现金',
    marketValue: '持仓市值',
    principal: '总本金',
    absoluteReturns: '绝对收益',
    readyToInvest: '就绪资金',
    positionsCount: '个持仓标的',
    performanceMatrix: '资产净值波动终端',
    diagnosticPanel: 'AI 诊断面板',
    alphaDiagnosticBtn: '全维度 Alpha 诊断',
    outlookPlaceholder: '目前账户处于就绪状态，建议关注近期半导体板块的筑底机会。',

    // AI Lab Tabs
    kline: 'K线解读',
    portfolio: '仓位分析',
    review: '交易复盘',
    vision: '智能识图',
    marketTrends: '市场动态',
    
    // Command Center
    searchPlaceholder: '锁定证券代码进行 AI 深度研判...',
    visionPlaceholder: '识图模式无需选择标的...',
    realtimeData: '实时数据',
    chartVision: 'K线识图',
    uploadImg: '上传图片',
    generateReport: '生成 AI 研报',
    analyzing: '正在深度研判...',
    
    // Results
    support: '关键支撑',
    resistance: '趋势压力',
    takeProfit: '止盈目标',
    stopLoss: '风控止损',
    strategyNode: 'Gemini 策略节点',
    adviceTitle: 'AI 操盘博弈建议',
    modelLabel: '模型',
    analysisReady: '分析就绪',
    disclaimer: 'AI 结论基于历史行情概率模型生成，不构成直接买卖邀约。',
    
    // Help Page
    help_main_title: '关于财富脉搏 Alpha Pro',
    help_main_desc: '这是一个专为专业投资者设计的“私人资产司令部”。我们不仅记录数字，更通过 Gemini AI 的深度语义理解与模式识别，为您每一笔交易赋予逻辑依据。',
    help_engine: 'Gemini 3 引擎',
    help_privacy: '隐私优先设计',
    help_tracking: '全资产实时追踪',
    help_faq_title: '常见问题解答',
    help_contact_title: '联系支持',
    help_admin: '系统管理员',
    help_contact_desc: '如果您在使用过程中遇到任何 Bug 或有功能建议，欢迎随时联系，我们会在 24 小时内回复。',
    
    // Settings
    settings_gateway: '通信通道网关',
    settings_gateway_desc: '实时通知推送配置',
    settings_feishu: '飞书群机器人',
    settings_smtp: 'SMTP 邮件服务',
    settings_ai_listeners: 'AI 行为通知监听',
    settings_save_btn: '保存并应用当前配置',
    settings_success: '配置已同步至本地加密存储。',

    // Settings - AI Configuration
    settings_ai_config: 'AI 模型配置',
    settings_ai_config_desc: 'LLM 供应商和模型选择',
    settings_llm_provider: '模型供应商',
    settings_llm_provider_placeholder: '选择 LLM 供应商',
    settings_llm_model: '模型名称',
    settings_llm_model_placeholder: '选择模型',
    settings_llm_available: '已配置 API Key',
    settings_llm_unavailable: '未配置 API Key',

    // Kline Analysis - New Fields
    kline_trend: '趋势判断',
    kline_uptrend: '上涨趋势',
    kline_downtrend: '下跌趋势',
    kline_sideways: '横盘整理',
    kline_recommendation: '操作建议',
    kline_strong_buy: '强烈买入',
    kline_buy: '买入',
    kline_hold: '持有',
    kline_sell: '卖出',
    kline_strong_sell: '强烈卖出',
    kline_risk_level: '风险等级',
    kline_risk_low: '低风险',
    kline_risk_medium: '中等风险',
    kline_risk_high: '高风险',
    kline_target_price: '目标价格区间',
    kline_technical_points: '技术点位',

    // Shared
    shareReport: '分享战报',
    saveImage: '保存高清海报',
    loading: '加载中...',
    assetDispatch: '资产调度',
    deposit: '充值注入',
    withdraw: '提取资金',
    confirm: '确认执行',
    cancel: '取消',
    execute: '执行交易',
    buyStock: '买入',
    sellStock: '卖出',
    insufficient_cash: '可用现金不足。',

    // Market Trends New
    initiate_scan: '启动全球情报研判',
    scan_desc: '连接 Gemini 全球财经神经元，扫描 24 小时内的市场异动与潜在套利机会。',
    intel_briefing: '实时情报摘要',
    hotspots_title: '热力追踪',
    mock_news_1: '全球半导体供应链出现结构性回暖。',
    mock_news_2: '美联储最新会议纪要显示通胀预期趋稳。',
    mock_news_3: '科技龙头公司财报季前夕资金流入显著。'
  },
  en: {
    // ... existing
    login_title: 'Wealth Pulse',
    login_subtitle: 'Personal Asset Intelligence Terminal',
    login_admin: 'Administrator ID',
    login_pwd: 'Security Password',
    login_btn: 'Sign In',
    login_footer: 'Protected Personal Asset Analysis Terminal',
    login_loading: 'Verifying Identity...',

    // Sidebar
    dashboard: 'Wealth Panel',
    market: 'Market Search',
    holdings: 'Holdings',
    records: 'Records',
    aiLab: 'AI Lab',
    settings: 'Settings',
    help: 'Support',
    terminal: 'Intelligence Terminal',
    netWorth: 'Net Worth',
    totalReturn: 'Total Return',
    professional: 'Professional',

    // Dashboard & Metrics
    totalAssets: 'Total Assets',
    accumulatedProfit: 'Total P/L',
    cashAvailable: 'Cash Available',
    marketValue: 'Market Value',
    principal: 'Total Principal',
    absoluteReturns: 'Absolute Returns',
    readyToInvest: 'Ready to Invest',
    positionsCount: 'Positions',
    performanceMatrix: 'Net Worth Matrix',
    diagnosticPanel: 'AI Diagnostic',
    alphaDiagnosticBtn: 'Full Alpha Diagnostic',
    outlookPlaceholder: 'Account is ready. Monitor bottom-out opportunities in the semiconductor sector.',

    // AI Lab Tabs
    kline: 'K-Line Analysis',
    portfolio: 'Portfolio Scan',
    review: 'Trade Review',
    vision: 'Vision AI',
    marketTrends: 'Market Trends',

    // Command Center
    searchPlaceholder: 'Lock symbol for AI analysis...',
    visionPlaceholder: 'Vision mode - No target needed...',
    realtimeData: 'Real-time',
    chartVision: 'Chart Vision',
    uploadImg: 'Upload',
    generateReport: 'Generate AI Report',
    analyzing: 'Decoding matrix...',

    // Results
    support: 'Support',
    resistance: 'Resistance',
    takeProfit: 'Take Profit',
    stopLoss: 'Stop Loss',
    strategyNode: 'Gemini Strategy Node',
    adviceTitle: 'AI Strategic Advice',
    modelLabel: 'Model',
    analysisReady: 'Ready',
    disclaimer: 'AI insights are probabilistic models and do not constitute financial advice.',

    // Help Page
    help_main_title: 'About Wealth Pulse Alpha Pro',
    help_main_desc: 'Designed as a "Private Command Center" for professional investors. We don\'t just track numbers; we use Gemini AI to provide logical reasoning for every trade.',
    help_engine: 'Gemini 3 Engine',
    help_privacy: 'Privacy First',
    help_tracking: 'Full Asset Tracking',
    help_faq_title: 'FAQ',
    help_contact_title: 'Contact Support',
    help_admin: 'System Admin',
    help_contact_desc: 'If you encounter any bugs or have suggestions, please contact us. We respond within 24 hours.',

    // Settings
    settings_gateway: 'Communication Gateways',
    settings_gateway_desc: 'Notification configurations',
    settings_feishu: 'Feishu Bot',
    settings_smtp: 'SMTP Email',
    settings_ai_listeners: 'AI Behavior Listeners',
    settings_save_btn: 'Save & Apply Config',
    settings_success: 'Configurations synced to local encrypted storage.',

    // Settings - AI Configuration
    settings_ai_config: 'AI Model Configuration',
    settings_ai_config_desc: 'LLM Provider and Model Selection',
    settings_llm_provider: 'LLM Provider',
    settings_llm_provider_placeholder: 'Select LLM Provider',
    settings_llm_model: 'Model',
    settings_llm_model_placeholder: 'Select Model',
    settings_llm_available: 'API Key Configured',
    settings_llm_unavailable: 'API Key Not Configured',

    // Kline Analysis - New Fields
    kline_trend: 'Trend',
    kline_uptrend: 'Uptrend',
    kline_downtrend: 'Downtrend',
    kline_sideways: 'Sideways',
    kline_recommendation: 'Recommendation',
    kline_strong_buy: 'Strong Buy',
    kline_buy: 'Buy',
    kline_hold: 'Hold',
    kline_sell: 'Sell',
    kline_strong_sell: 'Strong Sell',
    kline_risk_level: 'Risk Level',
    kline_risk_low: 'Low Risk',
    kline_risk_medium: 'Medium Risk',
    kline_risk_high: 'High Risk',
    kline_target_price: 'Target Price Range',
    kline_technical_points: 'Technical Points',

    // Shared
    shareReport: 'Share Report',
    saveImage: 'Save HD Poster',
    loading: 'Loading...',
    assetDispatch: 'Assets',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    confirm: 'Confirm',
    cancel: 'Cancel',
    execute: 'Execute Trade',
    buyStock: 'Buy',
    sellStock: 'Sell',
    insufficient_cash: 'Insufficient cash available.',

    // Market Trends New
    initiate_scan: 'Initiate Global Intelligence Scan',
    scan_desc: 'Connect to Gemini global nodes to scan 24-hour market movements and potential arbitrage opportunities.',
    intel_briefing: 'Real-time Intelligence Briefing',
    hotspots_title: 'Heat Tracking',
    mock_news_1: 'Structural recovery observed in global semiconductor supply chains.',
    mock_news_2: 'Fed minutes indicate stabilizing inflation expectations.',
    mock_news_3: 'Significant capital inflows ahead of major tech earnings.'
  }
};
