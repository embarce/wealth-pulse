
import React, { useEffect, useMemo, useState } from 'react';
import { Holding, StockPrice } from '../types';
import ShareModal from '../components/ShareModal';
import { PositionsDashboardData } from '../services/userApi';

interface HoldingsProps {
  holdings: Holding[];
  stocks: StockPrice[];
  onBuy: (symbol: string) => void;
  onSell: (symbol: string, quantity?: number) => void;
  onClear: (symbol: string) => void;
  /** 后端持仓总览数据（如果存在则优先使用） */
  positionsDashboard?: PositionsDashboardData | null;
  /** 是否正在刷新 Dashboard / 持仓数据 */
  isRefreshing?: boolean;
  /** 刷新进度（倒计时） */
  refreshProgress?: {
    progress: number;
    remainingSeconds: number;
  };
  /** 手动触发刷新 */
  onManualRefresh?: () => void;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

const Holdings: React.FC<HoldingsProps> = ({
  holdings,
  stocks,
  onBuy,
  onSell,
  onClear,
  positionsDashboard,
  isRefreshing,
  refreshProgress,
  onManualRefresh
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);

  const useBackendData = !!positionsDashboard && positionsDashboard.positions && positionsDashboard.positions.length > 0;

  const totalMarketValue = useMemo(
    () =>
      useBackendData
        ? positionsDashboard!.totalPositionValue
        : holdings.reduce(
            (acc, h) => acc + h.quantity * (stocks.find((s) => s.symbol === h.symbol)?.price || 0),
            0
          ),
    [holdings, stocks, positionsDashboard, useBackendData]
  );

  const totalProfit = useMemo(
    () =>
      useBackendData
        ? positionsDashboard!.totalProfitLoss
        : holdings.reduce((acc, h) => {
            const currentPrice = stocks.find((s) => s.symbol === h.symbol)?.price || 0;
            return acc + (currentPrice - h.avgPrice) * h.quantity;
          }, 0),
    [holdings, stocks, positionsDashboard, useBackendData]
  );

  const allocationData = useMemo(
    () => {
      if (!useBackendData || !positionsDashboard) {
        console.log('使用本地 holdings 数据');
        const localData = holdings
          .map((h) => {
            const stock = stocks.find((s) => s.symbol === h.symbol);
            const price = stock?.price || 0;
            const rawValue = h.quantity * price;
            const valueNum = Number(rawValue ?? h.quantity ?? 0);
            return {
              name: h.symbol,
              label: stock?.name || h.symbol,
              value: valueNum > 0 ? valueNum : Number(h.quantity || 0),
            };
          })
          .filter((d) => (d.value ?? 0) > 0)
          .sort((a, b) => b.value - a.value);
        console.log('本地数据 allocationData:', localData);
        return localData;
      }

      console.log('使用后端数据，positions 数量:', positionsDashboard.positions.length);

      // 第一步：map
      const mapped = positionsDashboard.positions.map((p) => {
        const stock = stocks.find((s) => s.symbol === p.stockCode);
        const price = p.currentPrice ?? stock?.price ?? 0;

        // 优先使用 marketValue，如果是 0 或 null/undefined，则使用其他值
        let marketValue = p.marketValue;
        if (marketValue === 0 || marketValue === null || marketValue === undefined) {
          marketValue = p.costValue ?? p.quantity * price;
        }

        // 确保值是有效的数字
        const valueNum = Number(marketValue ?? p.quantity ?? 0);

        console.log(`股票 ${p.stockCode}:`, {
          marketValue: p.marketValue,
          costValue: p.costValue,
          quantity: p.quantity,
          price: price,
          finalValue: valueNum
        });

        return {
          name: p.stockCode,
          label: p.companyNameCn || p.companyName || p.stockName || p.stockCode,
          value: valueNum,
        };
      });

      console.log('Map 后的数据:', mapped);

      // 第二步：filter
      const filtered = mapped.filter((d) => {
        const isValid = d.value > 0;
        console.log(`过滤 ${d.name}: value=${d.value}, valid=${isValid}`);
        return isValid;
      });

      console.log('Filter 后的数据:', filtered);

      // 第三步：sort
      const sorted = filtered.sort((a, b) => b.value - a.value);

      console.log('最终饼图数据 allocationData:', sorted);
      console.log('数据长度:', sorted.length);

      return sorted;
    },
    [holdings, stocks, positionsDashboard, useBackendData]
  );

  const shareData = {
    type: 'portfolio' as const,
    mainValue: `¥${totalMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    subLabel: '持仓组合总市值',
    subValue: `${totalProfit >= 0 ? '+' : ''}¥${totalProfit.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })} (收益率 ${
      (totalMarketValue - totalProfit || 1) !== 0
        ? ((totalProfit / (totalMarketValue - totalProfit || 1)) * 100).toFixed(2)
        : '0.00'
    }%)`,
    items: (selectedSymbols.length > 0
      ? allocationData.filter(d => selectedSymbols.includes(d.name))
      : allocationData
    ).map(d => ({
      label: d.label,
      value: `¥${d.value.toLocaleString()}`,
      color: 'text-indigo-400'
    }))
  };

  // 校正当前选中集合（不自动全选，默认不选任何标的）
  useEffect(() => {
    if (allocationData.length === 0) {
      setSelectedSymbols([]);
      return;
    }
    // 只移除已经不存在的 symbol，保持用户当前选择
    setSelectedSymbols(prev => {
      const names = allocationData.map(d => d.name);
      return prev.filter(s => names.includes(s));
    });
  }, [allocationData]);

  // 为表格 hover 与饼图联动创建索引映射
  const allocationIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    allocationData.forEach((d, idx) => {
      map[d.name] = idx;
    });
    return map;
  }, [allocationData]);

  const toggleSymbolSelected = (symbol: string) => {
    setSelectedSymbols(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {/* 全局刷新遮罩（不阻止操作，只做视觉提示） */}
      {isRefreshing && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent animate-[shimmer_1.4s_infinite]"></div>
        </div>
      )}
      {/* 刷新条 */}
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
                {isRefreshing ? '持仓同步中' : '持仓数据刷新'}
              </span>
              <span
                className={`text-[11px] font-black tabular-nums ${
                  isRefreshing ? 'text-white' : 'text-slate-800 group-hover:text-white'
                }`}
              >
                {isRefreshing ? '正在获取最新仓位…' : '后台每 30 秒自动同步'}
              </span>
            </div>
          </div>

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
        </button>
      </div>

      {/* 顶部指标卡片组 - 优化后的充实设计 */}
      <div className={`grid grid-cols-1 lg:grid-cols-4 gap-6 transition-opacity duration-300 ${isRefreshing ? 'opacity-60' : ''}`}>
        
        {/* 卡片 1: 总市值 - 充实版 */}
        <div className="relative bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group">
          {isRefreshing && (
            <div className="absolute inset-x-0 top-0 h-1 bg-slate-100 overflow-hidden">
              <div className="w-1/2 h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-[shimmer_1.2s_infinite]"></div>
            </div>
          )}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-700"></div>
          <div className="relative z-10">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center">
              <span className="w-1 h-3 bg-indigo-500 rounded-full mr-2"></span> 持仓总市值
            </p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">¥{totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>

            {/* 统计指标 */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 rounded-2xl p-3 text-center">
                <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">持仓数量</p>
                <p className="text-lg font-black text-indigo-600 tracking-tight">{allocationData.length}</p>
              </div>
              <div className="bg-purple-50 rounded-2xl p-3 text-center">
                <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">平均市值</p>
                <p className="text-lg font-black text-purple-600 tracking-tight">
                  ¥{(totalMarketValue / (allocationData.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* 涨跌分布 */}
            <div className="mt-4 flex items-center justify-between text-[9px]">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span className="text-slate-500 font-bold">上涨 {stocks.filter(s => s.changePercent > 0).length}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                  <span className="text-slate-500 font-bold">下跌 {stocks.filter(s => s.changePercent < 0).length}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  <span className="text-slate-500 font-bold">平盘 {stocks.filter(s => s.changePercent === 0).length}</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-12 opacity-[0.03] pointer-events-none" viewBox="0 0 400 100" preserveAspectRatio="none">
             <path d="M0,80 Q100,20 200,80 T400,20 L400,100 L0,100 Z" fill="currentColor" className="text-indigo-600" />
          </svg>
        </div>

        {/* 卡片 2: 浮动盈亏 - 充实版 */}
        <div className="relative bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group">
          {isRefreshing && (
            <div className="absolute inset-x-0 top-0 h-1 bg-slate-100 overflow-hidden">
              <div className="w-1/2 h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 animate-[shimmer_1.2s_infinite]"></div>
            </div>
          )}
          <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl transition-all duration-700 ${totalProfit >= 0 ? 'bg-emerald-500/5 group-hover:bg-emerald-500/10' : 'bg-rose-500/5 group-hover:bg-rose-500/10'}`}></div>
          <div className="relative z-10">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center">
              <span className={`w-1 h-3 rounded-full mr-2 ${totalProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span> 浮动盈亏总额
            </p>
            <h3 className={`text-3xl font-black tracking-tighter italic ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {totalProfit >= 0 ? '+' : ''}¥{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>

            {/* 盈亏分析 */}
            {(() => {
              const profitPositions = allocationData.filter((d, i) => {
                const stock = stocks.find(s => s.symbol === d.name);
                if (!stock) return false;
                const avgPrice = useBackendData
                  ? positionsDashboard?.positions.find(p => p.stockCode === d.name)?.avgCost
                  : holdings.find(h => h.symbol === d.name)?.avgPrice;
                return (stock.price - (avgPrice || 0)) > 0;
              });
              const lossPositions = allocationData.length - profitPositions.length;
              const profitRate = allocationData.length > 0 ? (profitPositions.length / allocationData.length) * 100 : 0;

              return (
                <>
                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <div className={`flex-1 rounded-2xl p-3 ${totalProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: totalProfit >= 0 ? '#10b981' : '#f43f5e' }}>
                        收益率
                      </p>
                      <div className="flex items-baseline justify-center gap-1 overflow-hidden">
                        <p className={`text-base sm:text-lg font-black tracking-tight truncate ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {(totalMarketValue - totalProfit || 1) !== 0
                            ? ((totalProfit / (totalMarketValue - totalProfit || 1)) * 100).toFixed(2)
                            : '0.00'}
                        </p>
                        <span className={`text-sm font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>%</span>
                      </div>
                    </div>
                    <div className="flex-1 bg-emerald-50 rounded-2xl p-3">
                      <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider mb-1">盈利仓位</p>
                      <p className="text-lg font-black text-emerald-600 tracking-tight">{profitPositions.length}</p>
                    </div>
                    <div className="flex-1 bg-rose-50 rounded-2xl p-3">
                      <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider mb-1">亏损仓位</p>
                      <p className="text-lg font-black text-rose-600 tracking-tight">{lossPositions}</p>
                    </div>
                  </div>

                  {/* 盈亏比 */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                          style={{ width: `${profitRate}%` }}
                        ></div>
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold">盈亏比 {profitPositions.length}:{lossPositions}</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-12 opacity-[0.03] pointer-events-none" viewBox="0 0 400 100" preserveAspectRatio="none">
             <path d="M0,50 Q100,80 200,50 T400,80 L400,100 L0,100 Z" fill="currentColor" className={totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
          </svg>
        </div>

        {/* 卡片 3: 最大标的 - 充实版 */}
        <div className="relative bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group">
          {isRefreshing && (
            <div className="absolute inset-x-0 top-0 h-1 bg-slate-100 overflow-hidden">
              <div className="w-1/2 h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 animate-[shimmer_1.2s_infinite]"></div>
            </div>
          )}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all duration-700"></div>
          <div className="relative z-10">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center">
              <span className="w-1 h-3 bg-amber-500 rounded-full mr-2"></span> 持仓最大标的
            </p>

            {allocationData.length > 0 && (() => {
              const topHolding = allocationData[0];
              const percentage = (topHolding.value / totalMarketValue) * 100;
              const stock = stocks.find(s => s.symbol === topHolding.name);
              const changePercent = stock?.changePercent || 0;

              return (
                <>
                  {/* 股票信息 */}
                  <div className="flex items-center space-x-3 mt-2">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg"
                      style={{ backgroundColor: COLORS[0] }}
                    >
                      {topHolding.name.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-base font-black text-slate-800 tracking-tight">{topHolding.label}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{topHolding.name}</p>
                    </div>
                  </div>

                  {/* 占比和市值 */}
                  <div className="mt-5">
                    <div className="flex items-end justify-between mb-2">
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">持仓占比</p>
                        <p className="text-3xl font-black text-amber-500 tracking-tighter italic">{percentage.toFixed(1)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">市值</p>
                        <p className="text-lg font-black text-slate-700 tracking-tight">
                          ¥{topHolding.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all relative"
                        style={{ width: `${percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* 今日涨跌 */}
                  {stock && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className={`px-3 py-1.5 rounded-xl ${changePercent >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-wider ${changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          今日{changePercent >= 0 ? '上涨' : '下跌'}
                        </p>
                        <p className={`text-base font-black tracking-tight ${changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                        </p>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        核心仓位
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {allocationData.length === 0 && (
              <div className="mt-5 text-center">
                <p className="text-sm text-slate-400 font-bold">暂无持仓</p>
              </div>
            )}
          </div>
          <div className="absolute -bottom-4 -right-4 text-slate-50 text-6xl font-black italic select-none group-hover:text-amber-500/10 transition-all duration-700">ALPHA</div>
        </div>

        {/* 卡片 4: 资产配置 - 优化版（固定高度 + 可滚动） */}
        <div className="relative bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group flex flex-col">
          {isRefreshing && (
            <div className="absolute inset-x-0 top-0 h-1 bg-slate-100 overflow-hidden z-20">
              <div className="w-1/2 h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 animate-[shimmer_1.2s_infinite]"></div>
            </div>
          )}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl group-hover:bg-sky-500/10 transition-all duration-700"></div>

          {allocationData.length > 0 ? (
            <div className="relative z-10 flex flex-col" style={{ height: '380px' }}>
              {/* 标题区 */}
              <div className="flex items-center justify-between mb-5 flex-shrink-0">
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center">
                    <span className="w-1 h-3 bg-sky-500 rounded-full mr-2"></span>
                    资产配置
                  </p>
                  <p className="text-[10px] text-sky-500 font-black uppercase tracking-tighter mt-1">
                    {allocationData.length} 个标的 · 分散度分析
                  </p>
                </div>
                {/* 集中度指标 */}
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">最大持仓</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter italic">
                    {((allocationData[0]?.value / totalMarketValue) * 100 || 0).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* 可滚动区域 */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 space-y-3 custom-scrollbar">
                {allocationData.map((d, i) => {
                  const percentage = (d.value / totalMarketValue) * 100;
                  return (
                    <div
                      key={d.name}
                      className="group/item"
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseLeave={() => setActiveIndex(-1)}
                    >
                      {/* 顶部信息 */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          {/* 颜色标识 */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] text-white shadow-md transition-all flex-shrink-0 ${
                              activeIndex === i ? 'scale-110' : ''
                            }`}
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          >
                            {d.name.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-800 tracking-tight truncate">{d.label}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase">{d.name}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-xs font-black text-slate-800 tracking-tighter">
                            {percentage.toFixed(1)}%
                          </p>
                          <p className="text-[8px] text-slate-400 font-bold">
                            ¥{d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>

                      {/* 进度条 */}
                      <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                            activeIndex === i ? 'shadow-md' : ''
                          }`}
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                            opacity: activeIndex === -1 || activeIndex === i ? 1 : 0.25,
                          }}
                        >
                          {activeIndex === i && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 底部装饰 - 固定在底部 */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-400 flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                    <span className="font-bold">低风险</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                    <span className="font-bold">中风险</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                    <span className="font-bold">高风险</span>
                  </div>
                </div>
                <span className="font-black uppercase tracking-wider">配置分析</span>
              </div>
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center">
              <div className="w-28 h-28 rounded-3xl border border-dashed border-slate-200 flex items-center justify-center mb-4">
                <i className="fas fa-chart-pie text-4xl text-slate-200"></i>
              </div>
              <span className="text-[10px] text-slate-300 font-black tracking-widest">暂无持仓数据</span>
            </div>
          )}
        </div>
      </div>

      {/* 持仓明细列表 */}
      <div className={`bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden transition-opacity duration-300 ${isRefreshing ? 'opacity-60' : ''}`}>
        <div className="px-10 py-10 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h4 className="font-black text-slate-800 tracking-tight text-xl italic flex items-center">
              <i className="fas fa-list-check text-indigo-500 mr-3 text-sm"></i>
              Position Portfolio
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              实时活跃账户持仓审计明细
              {useBackendData && positionsDashboard && (
                <span className="ml-2 text-[9px] text-indigo-500 font-black">
                  共 {positionsDashboard.positionCount} 个标的 · 总持仓市值 ¥
                  {positionsDashboard.totalPositionValue.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              )}
            </p>
          </div>
          <button 
            onClick={() => setIsShareOpen(true)}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-950/10 flex items-center"
          >
            <i className="fas fa-share-nodes mr-2"></i> 分享组合战报
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/40 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-10 py-8">证券标的</th>
                <th className="px-10 py-8">持有详情</th>
                <th className="px-10 py-8 text-center">持仓市值</th>
                <th className="px-10 py-8 text-center">当前行情/日内空间</th>
                <th className="px-10 py-8">浮动盈亏</th>
                <th className="px-10 py-8 text-right">管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {useBackendData && positionsDashboard
                ? positionsDashboard.positions.map((p, idx) => {
                    const stock = stocks.find((s) => s.symbol === p.stockCode);
                    const currentPrice = p.currentPrice ?? stock?.price ?? 0;
                    const marketValue = p.marketValue ?? p.quantity * currentPrice;
                    const profit = p.profitLoss;
                    const profitRate = p.profitLossRate;

                    const high = p.highPrice ?? stock?.high ?? currentPrice;
                    const low = p.lowPrice ?? stock?.low ?? currentPrice;
                    const open = p.openPrice ?? p.preClosePrice ?? low;
                    const close = currentPrice;
                    const rangePos = ((currentPrice - low) / (high - low || 1)) * 100;

                    return (
                      <tr
                        key={p.stockCode}
                        className="hover:bg-slate-50/30 transition-all group"
                        onMouseEnter={() => setActiveIndex(allocationIndexMap[p.stockCode] ?? -1)}
                        onMouseLeave={() => setActiveIndex(-1)}
                      >
                        <td className="px-10 py-8">
                          <div className="flex items-center space-x-5">
                            {/* 选择小圆点，联动战报 & 饼图 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSymbolSelected(p.stockCode);
                              }}
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                selectedSymbols.includes(p.stockCode)
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-slate-200 bg-white hover:border-indigo-300'
                              }`}
                            >
                              {selectedSymbols.includes(p.stockCode) && (
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                              )}
                            </button>
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border border-white shadow-lg text-white`}
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            >
                              {p.stockCode.slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-base font-black text-slate-800 tracking-tight">
                                {(p as any).companyNameCn || (p as any).companyName || p.stockName || p.stockCode}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {p.stockCode}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <p className="text-sm font-black text-slate-700">
                            {p.quantity.toLocaleString()}{' '}
                            <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Shares</span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase italic">
                            Avg Cost: ¥{p.avgCost.toFixed(2)}
                          </p>
                          {/* 持仓状态标签 */}
                          {p.positionStatus && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black mt-2 ${
                                p.positionStatus === 1
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : p.positionStatus === 2
                                  ? 'bg-slate-100 text-slate-400'
                                  : 'bg-amber-50 text-amber-600'
                              }`}
                            >
                              {p.positionStatus === 1 && '持有中'}
                              {p.positionStatus === 2 && '已清仓'}
                              {p.positionStatus === 3 && '部分平仓'}
                            </span>
                          )}
                        </td>
                        <td className="px-10 py-8 text-center">
                          <p className="text-sm font-black text-slate-800">
                            ¥{marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <div className="w-16 h-1 bg-slate-100 rounded-full mx-auto mt-3 overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{
                                width: `${totalMarketValue ? (marketValue / totalMarketValue) * 100 : 0}%`,
                              }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex flex-col items-center space-y-3">
                            {/* 当前价 */}
                            <p className="text-sm font-black text-slate-800 tracking-tighter">
                              ¥{currentPrice.toFixed(2)}
                            </p>

                            {/* 日内价位条 */}
                            <div className="w-32 h-1.5 bg-slate-100 rounded-full relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100" />
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-600 rounded-full shadow-lg border-2 border-white"
                                style={{ left: `${rangePos}%` }}
                              ></div>
                            </div>

                            {/* 四价一览：高 / 低 / 开 / 收 */}
                            <div className="grid grid-cols-2 gap-1.5 text-[9px] font-black w-36">
                              <div className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-between">
                                <span className="text-[8px]">H</span>
                                <span>{high.toFixed(2)}</span>
                              </div>
                              <div className="px-2 py-1 rounded-full bg-slate-50 text-slate-500 flex items-center justify-between">
                                <span className="text-[8px]">L</span>
                                <span>{low.toFixed(2)}</span>
                              </div>
                              <div className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-between">
                                <span className="text-[8px]">O</span>
                                <span>{open.toFixed(2)}</span>
                              </div>
                              <div className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 flex items-center justify-between">
                                <span className="text-[8px]">C</span>
                                <span>{close.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <p
                            className={`text-sm font-black ${
                              profit >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {profit >= 0 ? '+' : ''}¥
                            {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <div
                            className={`text-[10px] font-black inline-flex items-center px-2 py-0.5 rounded-md mt-1 ${
                              profit >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                            }`}
                          >
                            {profitRate.toFixed(2)}%
                          </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* 买入按钮 */}
                            <button
                              onClick={() => onBuy(p.stockCode)}
                              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center space-x-1.5"
                            >
                              <i className="fas fa-plus text-xs"></i>
                              <span>买入</span>
                            </button>

                            {/* 卖出按钮 */}
                            <button
                              onClick={() => onSell(p.stockCode, p.quantity)}
                              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all flex items-center space-x-1.5"
                            >
                              <i className="fas fa-minus text-xs"></i>
                              <span>卖出</span>
                            </button>

                            {/* 清仓按钮 */}
                            <button
                              onClick={() => onClear(p.stockCode)}
                              className="w-10 h-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"
                              title="清仓"
                            >
                              <i className="fas fa-trash-can text-sm"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                : holdings.map((h, idx) => {
                    const stock = stocks.find(s => s.symbol === h.symbol);
                    const currentPrice = stock?.price || 0;
                    const marketValue = h.quantity * currentPrice;
                    const profit = marketValue - (h.avgPrice * h.quantity);
                    const profitRate = ((currentPrice - h.avgPrice) / (h.avgPrice || 1)) * 100;
                    
                    const high = stock?.high || currentPrice;
                    const low = stock?.low || currentPrice;
                    const rangePos = ((currentPrice - low) / (high - low || 1)) * 100;

                    return (
                  <tr
                    key={h.symbol}
                    className="hover:bg-slate-50/30 transition-all group"
                    onMouseEnter={() => setActiveIndex(allocationIndexMap[h.symbol] ?? -1)}
                    onMouseLeave={() => setActiveIndex(-1)}
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center space-x-5">
                        {/* 选择小圆点，联动战报 & 饼图 */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSymbolSelected(h.symbol);
                          }}
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                            selectedSymbols.includes(h.symbol)
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-slate-200 bg-white hover:border-indigo-300'
                          }`}
                        >
                          {selectedSymbols.includes(h.symbol) && (
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                          )}
                        </button>
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border border-white shadow-lg text-white`}
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        >
                          {h.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-800 tracking-tight">{stock?.name || h.symbol}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{h.symbol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <p className="text-sm font-black text-slate-700">{h.quantity.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Shares</span></p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase italic">Avg Cost: ¥{h.avgPrice.toFixed(2)}</p>
                    </td>
                    <td className="px-10 py-8 text-center">
                      <p className="text-sm font-black text-slate-800">¥{marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <div className="w-16 h-1 bg-slate-100 rounded-full mx-auto mt-3 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(marketValue / totalMarketValue * 100)}%` }}></div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex flex-col items-center space-y-3">
                          <p className="text-sm font-black text-slate-800 tracking-tighter">¥{currentPrice.toFixed(2)}</p>
                          <div className="w-32 h-1 bg-slate-100 rounded-full relative">
                             <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-600 rounded-full shadow-lg border-2 border-white" style={{ left: `${rangePos}%` }}></div>
                             <div className="flex justify-between w-full absolute -bottom-4 text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                                <span>L: {low.toFixed(1)}</span>
                                <span>H: {high.toFixed(1)}</span>
                             </div>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                      <p className={`text-sm font-black ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {profit >= 0 ? '+' : ''}¥{profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <div className={`text-[10px] font-black inline-flex items-center px-2 py-0.5 rounded-md mt-1 ${profit >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                        {profitRate.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* 买入按钮 */}
                        <button
                              onClick={() => onBuy(h.symbol)}
                              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center space-x-1.5"
                          >
                            <i className="fas fa-plus text-xs"></i>
                            <span>买入</span>
                          </button>

                        {/* 卖出按钮 */}
                        <button
                          onClick={() => onSell(h.symbol, h.quantity)}
                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all flex items-center space-x-1.5"
                        >
                          <i className="fas fa-minus text-xs"></i>
                          <span>卖出</span>
                        </button>

                        {/* 清仓按钮 */}
                        <button
                          onClick={() => onClear(h.symbol)}
                          className="w-10 h-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"
                          title="清仓"
                        >
                          <i className="fas fa-trash-can text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ShareModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        title="组合战报" 
        data={shareData} 
      />
    </div>
  );
};

export default Holdings;
