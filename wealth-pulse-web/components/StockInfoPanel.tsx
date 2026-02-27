import React, { useState } from 'react';

// 类型定义
type ImpactType = 'positive' | 'negative' | 'neutral';

interface NewsItem {
  title: string;
  summary: string;
  source: string;
  time: string;
  impact: ImpactType;
  tag: string;
}

interface StockInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stockCode: string;
  stockName: string;
}

const StockInfoPanel: React.FC<StockInfoPanelProps> = ({ isOpen, onClose, stockCode, stockName }) => {
  const [activeTab, setActiveTab] = useState<'news' | 'financial' | 'company' | 'report'>('news');

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      ></div>

      {/* 侧边抽屉 */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[70%] lg:w-[60%] xl:w-[50%] bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fas fa-chart-pie text-white text-xl"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-white">信息聚合中心</h3>
                <p className="text-amber-100 text-sm font-medium mt-0.5">
                  {stockCode} - {stockName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              <i className="fas fa-times text-white text-lg"></i>
            </button>
          </div>

          {/* 标签页 */}
          <div className="flex space-x-2 mt-6 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { key: 'news' as const, label: '相关新闻', icon: 'fa-newspaper' },
              { key: 'financial' as const, label: '财务指标', icon: 'fa-file-invoice-dollar' },
              { key: 'company' as const, label: '公司资料', icon: 'fa-building' },
              { key: 'report' as const, label: '公告研报', icon: 'fa-chart-line' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-white text-amber-600 shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <i className={`fas ${tab.icon} mr-2`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {activeTab === 'news' && <NewsContent stockName={stockName} />}
          {activeTab === 'financial' && <FinancialContent />}
          {activeTab === 'company' && <CompanyContent />}
          {activeTab === 'report' && <ReportContent stockName={stockName} />}
        </div>
      </div>
    </>
  );
};

/* ==================== 新闻内容 ==================== */
const NewsContent: React.FC<{ stockName: string }> = ({ stockName }) => {
  const newsList: NewsItem[] = [
    {
      title: `${stockName}发布2025年Q4财报，净利润同比增长35%超预期`,
      summary: '公司第四季度营收达到285亿港元，同比增长28%，主要受核心业务强劲增长驱动。管理层表示对2026年前景保持乐观态度。',
      source: '财联社',
      time: '2小时前',
      impact: 'positive',
      tag: '财报季'
    },
    {
      title: `大行维持${stockName}'买入'评级，目标价上调至HK$450`,
      summary: '知名投行发布研报指出，公司在人工智能和云计算领域的布局开始显现成效，预计未来12个月将有显著上涨空间。',
      source: '彭博社',
      time: '5小时前',
      impact: 'positive',
      tag: '研报'
    },
    {
      title: `${stockName}宣布10亿美元股票回购计划`,
      summary: '董事会已批准一项新的股票回购计划，将在未来12个月回购价值10亿美元的股份，彰显管理层对公司长期价值的信心。',
      source: '路透社',
      time: '1天前',
      impact: 'positive',
      tag: '公司公告'
    },
    {
      title: `科技板块整体回调，${stockName}下跌3.2%`,
      summary: '受美联储加息预期影响，科技股今日普遍承压。分析师认为这是正常的市场调整，不影响公司基本面。',
      source: '华尔街见闻',
      time: '2天前',
      impact: 'neutral',
      tag: '市场动态'
    },
    {
      title: `${stockName}与全球顶级AI实验室达成战略合作`,
      summary: '公司宣布与OpenAI建立战略合作伙伴关系，将在大模型、AI芯片等领域展开深度合作，市场反应积极。',
      source: 'TechCrunch',
      time: '3天前',
      impact: 'positive',
      tag: '战略合作'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-black text-slate-900">
          <i className="fas fa-bolt text-amber-500 mr-2"></i>
          最新资讯
        </h4>
        <span className="text-xs text-slate-400 font-medium">数据来源：综合财经媒体</span>
      </div>

      {newsList.map((news, idx) => (
      <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-grow">
            <div className="flex items-center space-x-2 mb-2 flex-wrap">
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                news.impact === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                news.impact === 'negative' ? 'bg-rose-100 text-rose-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {news.tag}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">{news.source}</span>
              <span className="text-[10px] text-slate-300">·</span>
              <span className="text-[10px] text-slate-400">{news.time}</span>
            </div>
            <h5 className="text-sm font-black text-slate-900 mb-2 group-hover:text-amber-600 transition-colors">
              {news.title}
            </h5>
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
              {news.summary}
            </p>
          </div>
          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
            news.impact === 'positive' ? 'bg-emerald-500' :
            news.impact === 'negative' ? 'bg-rose-500' :
            'bg-slate-300'
          }`}></div>
        </div>
      </div>
    ))}

    <div className="text-center pt-4">
      <button className="px-8 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-700 text-xs font-black transition-colors">
        查看更多资讯 <i className="fas fa-arrow-right ml-2"></i>
      </button>
    </div>
  </div>
  );
};

/* ==================== 财务指标 ==================== */
const FinancialContent: React.FC = () => (
  <div className="space-y-6">
    {/* 核心指标 */}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-base font-black text-slate-900">
          <i className="fas fa-chart-bar text-amber-500 mr-2"></i>
          核心指标
        </h4>
        <span className="text-[10px] text-slate-400">2025财年</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: '市盈率 (PE)', value: '18.5', trend: '+2.3%', up: true, desc: '较低估值' },
          { label: '市净率 (PB)', value: '2.8', trend: '+0.5', up: true, desc: '合理区间' },
          { label: '股息率', value: '3.2%', trend: '0.0', up: false, desc: '稳定分红' },
          { label: 'ROE', value: '15.8%', trend: '+1.2%', up: true, desc: '优秀水平' },
        ].map((item, idx) => (
          <div key={idx} className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">{item.label}</span>
              <span className="text-[10px] text-slate-400">{item.desc}</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{item.value}</span>
              <span className={`text-xs font-black ${item.up ? 'text-emerald-500' : 'text-slate-400'}`}>
                {item.up ? '↑' : ''} {item.trend}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* 盈利能力 */}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-base font-black text-slate-900">
          <i className="fas fa-coins text-amber-500 mr-2"></i>
          盈利能力
        </h4>
        <span className="text-[10px] text-slate-400">同比变化</span>
      </div>
      <div className="space-y-3">
        {[
          { label: '营业收入', value: '1,280亿', trend: '+28.5%', up: true, bar: 85 },
          { label: '净利润', value: '256亿', trend: '+35.2%', up: true, bar: 78 },
          { label: '毛利率', value: '42.5%', trend: '+2.1%', up: true, bar: 65 },
          { label: '净利率', value: '20.0%', trend: '+1.8%', up: true, bar: 55 },
        ].map((item, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">{item.label}</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-slate-900">{item.value}</span>
                <span className={`text-[10px] font-black ${item.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {item.up ? '↑' : '↓'} {item.trend}
                </span>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all"
                style={{ width: `${item.bar}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* 财务健康 */}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h4 className="text-base font-black text-slate-900 mb-5">
        <i className="fas fa-heartbeat text-amber-500 mr-2"></i>
        财务健康
      </h4>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '流动比率', value: '2.5', status: 'healthy' },
          { label: '负债率', value: '35%', status: 'healthy' },
          { label: '现金流', value: '+128亿', status: 'healthy' },
        ].map((item, idx) => (
          <div key={idx} className="text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
              item.status === 'healthy' ? 'bg-emerald-100' : 'bg-rose-100'
            }`}>
              <i className={`fas ${item.status === 'healthy' ? 'fa-check text-emerald-500' : 'fa-exclamation text-rose-500'}`}></i>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mb-1">{item.label}</p>
            <p className="text-sm font-black text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ==================== 公司资料 ==================== */
const CompanyContent: React.FC = () => (
  <div className="space-y-6">
    {/* 基本信息 */}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h4 className="text-base font-black text-slate-900 mb-5">
        <i className="fas fa-building text-amber-500 mr-2"></i>
        基本信息
      </h4>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: '成立时间', value: '2010年4月', icon: 'fa-calendar' },
          { label: '所属行业', value: '科技/互联网', icon: 'fa-industry' },
          { label: '员工数量', value: '25,000+', icon: 'fa-users' },
          { label: '董事长', value: '雷军', icon: 'fa-user-tie' },
          { label: '注册地', value: '开曼群岛', icon: 'fa-map-marker-alt' },
          { label: '年结日', value: '12月31日', icon: 'fa-calendar-check' },
          { label: '核数师', value: '德勤·关黄陈方', icon: 'fa-file-contract' },
          { label: '公司秘书', value: '李海滨', icon: 'fa-user' },
        ].map((item, idx) => (
          <div key={idx} className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <i className={`fas ${item.icon} text-amber-500 text-xs`}></i>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase">{item.label}</p>
                <p className="text-xs font-black text-slate-900">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* 联系方式 */}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h4 className="text-base font-black text-slate-900 mb-5">
        <i className="fas fa-address-card text-amber-500 mr-2"></i>
        联系方式
      </h4>
      <div className="space-y-3">
        {[
          { label: '办公地址', value: '中国北京市海淀区清河中街68号华联购物中心', icon: 'fa-map-marker-alt', action: '导航' },
          { label: '公司网址', value: 'https://www.xiaomi.com', icon: 'fa-globe', action: '访问' },
          { label: '联系电话', value: '+86 (10) 8888-8888', icon: 'fa-phone', action: '拨打' },
          { label: '电子邮箱', value: 'ir@xiaomi.com', icon: 'fa-envelope', action: '邮件' },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <i className={`fas ${item.icon} text-amber-500 text-xs`}></i>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">{item.label}</p>
                <p className="text-xs font-black text-slate-900 truncate max-w-[200px]">{item.value}</p>
              </div>
            </div>
            <button className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black hover:bg-amber-200 transition-colors">
              {item.action}
            </button>
          </div>
        ))}
      </div>
    </div>

    {/* 公司简介 */}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h4 className="text-base font-black text-slate-900 mb-4">
        <i className="fas fa-info-circle text-amber-500 mr-2"></i>
        公司简介
      </h4>
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">
        <p>
          小米集团成立于2010年4月，是一家以智能手机、智能硬件和IoT平台为核心的互联网公司。
        </p>
        <p>
          公司使命是始终坚持做"感动人心、价格厚道"的好产品，让全球每个人都能享受科技带来的美好生活。
        </p>
        <p>
          截至2025年，小米已成为全球领先的智能手机品牌之一，业务遍及全球100多个国家和地区。
        </p>
      </div>
    </div>
  </div>
);

/* ==================== 公告研报 ==================== */
const ReportContent: React.FC<{ stockName: string }> = ({ stockName }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h4 className="text-lg font-black text-slate-900">
        <i className="fas fa-file-alt text-amber-500 mr-2"></i>
        最新公告
      </h4>
      <span className="text-xs text-slate-400 font-medium">港交所披露</span>
    </div>

    {/* 公告列表 */}
    <div className="space-y-3">
      {[
        { title: '截至2025年12月31日止年度业绩公告', date: '2026-03-28', type: '年报' },
        { title: '建议修订公司章程及组织章程细则', date: '2026-03-15', type: '通函' },
        { title: '根据一般授权配售新股份', date: '2026-02-20', type: '公告' },
        { title: '截至2025年9月30日止三个月业绩公告', date: '2025-11-24', type: '季报' },
        { title: '董事会会议通告', date: '2025-11-10', type: '公告' },
      ].map((item, idx) => (
        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-grow">
              <div className="flex items-center space-x-2 mb-1">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black">
                  {item.type}
                </span>
              </div>
              <h5 className="text-xs font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                {item.title}
              </h5>
            </div>
            <span className="text-[10px] text-slate-400 whitespace-nowrap">{item.date}</span>
          </div>
        </div>
      ))}
    </div>

    {/* 研报列表 */}
    <div className="pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-black text-slate-900">
          <i className="fas fa-chart-line text-amber-500 mr-2"></i>
          分析师研报
        </h4>
        <span className="text-xs text-slate-400 font-medium">覆盖机构：32家</span>
      </div>

      <div className="space-y-3">
        {[
          { firm: '摩根士丹利', rating: ' overweight', target: 'HK$450', title: 'AI业务驱动长期增长', date: '3天前' },
          { firm: '高盛', rating: 'buy', target: 'HK$480', title: '盈利能力持续提升', date: '5天前' },
          { firm: '中金公司', rating: 'outperform', target: 'HK$420', title: '市场份额稳步扩大', date: '1周前' },
          { firm: '瑞银', rating: 'buy', target: 'HK$460', title: '国际业务增长强劲', date: '1周前' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-slate-900">{item.firm}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  item.rating === 'buy' || item.rating === 'outperform' || item.rating === 'overweight'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {item.rating.toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-black text-amber-600">目标价 {item.target}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">{item.title}</p>
              <span className="text-[10px] text-slate-400">{item.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* 评级分布 */}
    <div className="pt-4 border-t border-slate-200">
      <h4 className="text-base font-black text-slate-900 mb-4">
        <i className="fas fa-thumbs-up text-amber-500 mr-2"></i>
        评级分布
      </h4>
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="space-y-2">
          {[
            { label: '买入', count: 18, pct: 56, color: 'bg-emerald-500' },
            { label: '持有', count: 11, pct: 34, color: 'bg-slate-400' },
            { label: '卖出', count: 3, pct: 10, color: 'bg-rose-500' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center space-x-3">
              <span className="text-xs text-slate-600 font-medium w-12">{item.label}</span>
              <div className="flex-grow bg-slate-100 rounded-full h-2">
                <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.pct}%` }}></div>
              </div>
              <span className="text-xs text-slate-500 font-medium w-16 text-right">{item.count}家 ({item.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default StockInfoPanel;
