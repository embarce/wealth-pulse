
import React, { useContext, useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { StockPrice, Holding } from '../types';
import { PositionsDashboardData, PositionSnapshotData, TimeRangeModel, userApi } from '../services/userApi';
import LiveMarketWatch from '../components/LiveMarketWatch';
import { I18nContext } from '../App';

// 时间范围配置映射
const TIME_RANGES: { key: string; label: string; model: TimeRangeModel }[] = [
  { key: '5D', label: '5D', model: 0 },   // 5天
  { key: '1W', label: '1W', model: 1 },   // 7天
  { key: '15D', label: '15D', model: 2 },   // 15天
  { key: '1M', label: '1M', model: 3 }, // 30天
];

interface DashboardProps {
  assets: any;
  totalPrincipal: number;
  holdingsCount: number;
  stocks: StockPrice[];
  holdings: Holding[];
  positionsDashboard?: PositionsDashboardData | null;
  onTrade: (s: StockPrice) => void;
  onNavigateToAI: () => void;
  aiOutlook: string;
  isRefreshing?: boolean;
  lastRefreshTime?: Date | null;
  refreshProgress?: {
    progress: number;
    remainingSeconds: number;
  };
  onManualRefresh?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  assets,
  totalPrincipal,
  holdingsCount,
  stocks,
  onTrade,
  onNavigateToAI,
  aiOutlook,
  positionsDashboard,
  isRefreshing,
  lastRefreshTime,
  refreshProgress,
  onManualRefresh
}) => {
  const { t } = useContext(I18nContext);

  // 图表数据状态
  const [chartData, setChartData] = useState<PositionSnapshotData[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeModel>(1); // 默认7天
  const [chartLoading, setChartLoading] = useState(false);

  // 加载图表数据
  useEffect(() => {
    const loadChartData = async () => {
      setChartLoading(true);
      try {
        const data = await userApi.getPositionSnapshotChart(selectedTimeRange);
        setChartData(data);
      } catch (error) {
        console.error('Failed to load chart data:', error);
        setChartData([]);
      } finally {
        setChartLoading(false);
      }
    };

    loadChartData();
  }, [selectedTimeRange]);

  const formatTime = (time?: Date | null) => {
    if (!time) return '--';
    return time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // 格式化日期显示
  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 格式化市值显示
  const formatMarketValue = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">

      {/* 核心指标卡片 */}
      <div className="space-y-4 lg:space-y-6">
        {/* 刷新状态指示器 + 进度条 */}
        <div className="flex justify-end">
          <button
            onClick={isRefreshing ? undefined : onManualRefresh}
            disabled={isRefreshing}
            className={`group relative flex items-center gap-3 px-4 py-2 rounded-2xl shadow-lg border transition-all duration-300 ${
              isRefreshing
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 border-transparent cursor-default'
                : 'bg-white/90 hover:bg-slate-900 hover:border-slate-900 border-slate-200 shadow-slate-200/80 hover:shadow-slate-900/30'
            }`}
          >
            {/* 左侧图标 + 文案 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  isRefreshing
                    ? 'bg-white/15 text-white'
                    : 'bg-slate-900 text-white group-hover:bg-white group-hover:text-slate-900'
                } transition-colors duration-300`}
              >
                <i
                  className={`fas fa-sync-alt text-[11px] ${
                    isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'
                  } transition-transform duration-500`}
                ></i>
              </div>
              <div className="flex flex-col items-start">
                <span
                  className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                    isRefreshing ? 'text-white/70' : 'text-slate-400 group-hover:text-white/60'
                  }`}
                >
                  {isRefreshing ? '同步中' : '资产概览刷新'}
                </span>
                <span
                  className={`text-[11px] font-black tabular-nums ${
                    isRefreshing ? 'text-white' : 'text-slate-800 group-hover:text-white'
                  }`}
                >
                  {isRefreshing ? '更新最新资产数据…' : `上次同步：${formatTime(lastRefreshTime)}`}
                </span>
              </div>
            </div>

            {/* 右侧进度条 + 倒计时 */}
            {!isRefreshing && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200 group-hover:border-slate-700">
                <div className="relative">
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 rounded-full transition-all duration-300 ease-out relative"
                      style={{ width: `${refreshProgress?.progress || 0}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider leading-none group-hover:text-slate-300">
                    自动刷新
                  </span>
                  <span className="text-[11px] font-black text-slate-700 tabular-nums leading-tight group-hover:text-white">
                    {(refreshProgress?.remainingSeconds || 0).toString().padStart(2, '0')}s
                  </span>
                </div>
              </div>
            )}

            {isRefreshing && (
              <div className="absolute inset-0 rounded-2xl bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.2)] pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.4s_infinite]"></div>
              </div>
            )}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
          <div className={`bg-white p-6 lg:p-7 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-100 transition-all ${isRefreshing ? 'opacity-60' : ''}`}>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3">{t.totalAssets}</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">¥{assets.total.toLocaleString(undefined, { minimumFractionDigits: 1 })}</h3>
            <div className={`inline-flex items-center mt-3 px-3 py-1 rounded-xl text-[9px] font-black ${assets.rate >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
               {assets.rate >= 0 ? '↑' : '↓'} {Math.abs(assets.rate).toFixed(2)}%
            </div>
          </div>

          <div className={`bg-white p-6 lg:p-7 rounded-[2.5rem] border border-slate-100 shadow-sm ${isRefreshing ? 'opacity-60' : ''}`}>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3">{t.accumulatedProfit}</p>
            <h3 className={`text-2xl font-black tracking-tighter ${assets.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {assets.profit >= 0 ? '+' : ''}¥{assets.profit.toLocaleString()}
            </h3>
            <p className="text-[9px] text-slate-300 font-black mt-3">{t.absoluteReturns}</p>
          </div>

          <div className={`bg-white p-6 lg:p-7 rounded-[2.5rem] border border-slate-100 shadow-sm ${isRefreshing ? 'opacity-60' : ''}`}>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3">{t.cashAvailable}</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">¥{assets.cash.toLocaleString()}</h3>
            <p className="text-[9px] text-indigo-500 font-black mt-3">{t.readyToInvest}</p>
          </div>

          <div className={`bg-white p-6 lg:p-7 rounded-[2.5rem] border border-slate-100 shadow-sm ${isRefreshing ? 'opacity-60' : ''}`}>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3">{t.marketValue}</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">¥{assets.stockVal.toLocaleString()}</h3>
            <p className="text-[9px] text-emerald-500 font-black mt-3">{holdingsCount} {t.positionsCount}</p>
          </div>

          <div className={`bg-white p-6 lg:p-7 rounded-[2.5rem] border border-slate-100 shadow-sm ${isRefreshing ? 'opacity-60' : ''}`}>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3">{t.principal}</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">¥{totalPrincipal.toLocaleString()}</h3>
            <p className="text-[9px] text-slate-300 font-black mt-3">Initial Capital</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-10 items-stretch">
        <div className="lg:col-span-3 space-y-6 lg:space-y-10 flex flex-col">
          {/* 图表 */}
          <div className="bg-white p-6 lg:p-10 rounded-[3rem] lg:rounded-[3.5rem] border border-slate-100 shadow-sm flex-grow">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 lg:mb-10 gap-4">
              <div>
                <h4 className="font-black text-slate-900 tracking-tight text-lg lg:text-xl">{t.performanceMatrix}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time Performance Trace</p>
              </div>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 w-full sm:w-auto">
                {TIME_RANGES.map(range => (
                  <button
                    key={range.key}
                    onClick={() => setSelectedTimeRange(range.model)}
                    disabled={chartLoading}
                    className={`flex-grow sm:flex-none px-4 lg:px-6 py-2 rounded-xl text-[10px] font-black transition-all ${
                      selectedTimeRange === range.model
                        ? 'bg-white text-indigo-600 shadow-md shadow-indigo-100'
                        : 'text-slate-400 hover:text-slate-600'
                    } ${chartLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[260px] lg:h-[360px] w-full">
              {chartLoading ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  加载中...
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  暂无数据
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAsset" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="snapshotDate"
                      tickFormatter={formatChartDate}
                      stroke="#94a3b8"
                      strokeWidth={2}
                      tick={{ fontSize: 11, fontWeight: 'black' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatMarketValue}
                      stroke="#94a3b8"
                      strokeWidth={2}
                      tick={{ fontSize: 11, fontWeight: 'black' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '24px',
                        border: 'none',
                        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                        fontWeight: 'black',
                        padding: '16px 24px'
                      }}
                      labelFormatter={(label) => `日期: ${label}`}
                      formatter={(value: number) => [`¥${value.toLocaleString()}`, '市值']}
                    />
                    <Area
                      type="monotone"
                      dataKey="marketValue"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fill="url(#colorAsset)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* AI 诊断 */}
          <div className="bg-[#10121d] p-8 lg:p-10 rounded-[3rem] lg:rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 lg:gap-10">
               <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-4 border-white/10 shadow-2xl shrink-0 group-hover:scale-110 transition-transform duration-700">
                  <i className="fas fa-microchip text-2xl lg:text-4xl"></i>
               </div>
               <div className="space-y-4 text-center md:text-left flex-grow">
                  <div className="flex items-center justify-center md:justify-start space-x-3">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t.diagnosticPanel}</span>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                  <h3 className="text-lg lg:text-2xl font-black tracking-tight leading-relaxed italic">
                    {aiOutlook}
                  </h3>
                  <div className="pt-2">
                    <button 
                      onClick={onNavigateToAI}
                      className="bg-white text-slate-950 px-8 lg:px-10 py-3 lg:py-4 rounded-2xl font-black text-[10px] lg:text-[11px] transition-all uppercase tracking-widest hover:bg-indigo-500 hover:text-white shadow-xl"
                    >
                      {t.alphaDiagnosticBtn}
                    </button>
                  </div>
               </div>
            </div>
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px]"></div>
          </div>
        </div>

        <div className="lg:col-span-1 h-full min-h-[500px] lg:min-h-[600px]">
          <LiveMarketWatch onTrade={onTrade} onViewDetail={onTrade} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
