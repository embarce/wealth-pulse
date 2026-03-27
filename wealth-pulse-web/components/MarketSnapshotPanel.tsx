import React from 'react';
import { MarketSnapshot, CurrencyLiquidity, HotStocks, HotStockItem } from '../services/aiAnalysis';

interface MarketSnapshotPanelProps {
  snapshot: MarketSnapshot | null;
}

const MarketSnapshotPanel: React.FC<MarketSnapshotPanelProps> = ({ snapshot }) => {
  if (!snapshot) {
    return null;
  }

  const { indexPerformance, externalSentiment, currencyLiquidity, marketBreadth } = snapshot;

  // 格式化涨跌颜色
  const getChangeColor = (value: number | null) => {
    if (value === null) return 'text-slate-400';
    if (value >= 0) return 'text-rose-400';
    return 'text-emerald-400';
  };

  return (
    <div className="space-y-6">
      {/* 指数表现 */}
      {indexPerformance && (
        <div>
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <i className="fas fa-chart-line text-indigo-400"></i>
            指数表现
          </h4>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">指数名称</div>
                <div className="text-sm font-bold text-white">{indexPerformance.indexName || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">最新价</div>
                <div className="text-sm font-black text-white">
                  {indexPerformance.latestPrice?.toFixed(2) ?? 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">涨跌幅</div>
                <div className={`text-sm font-bold ${getChangeColor(indexPerformance.changeRate)}`}>
                  {indexPerformance.changeRate !== null && indexPerformance.changeRate !== undefined
                    ? `${indexPerformance.changeRate >= 0 ? '+' : ''}${indexPerformance.changeRate.toFixed(2)}%`
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">成交额</div>
                <div className="text-sm font-bold text-white">
                  {indexPerformance.turnover !== null && indexPerformance.turnover !== undefined
                    ? `${(indexPerformance.turnover / 100000000).toFixed(2)} 亿`
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 外部情绪 */}
      {externalSentiment && (
        <div>
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <i className="fas fa-globe text-purple-400"></i>
            外部情绪
          </h4>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">指数名称</div>
                <div className="text-sm font-bold text-white">{externalSentiment.indexName || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">最新价</div>
                <div className="text-sm font-black text-white">
                  {externalSentiment.latestPrice?.toFixed(2) ?? 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">涨跌幅</div>
                <div className={`text-sm font-bold ${getChangeColor(externalSentiment.changeRate)}`}>
                  {externalSentiment.changeRate !== null && externalSentiment.changeRate !== undefined
                    ? `${externalSentiment.changeRate >= 0 ? '+' : ''}${externalSentiment.changeRate.toFixed(2)}%`
                    : 'N/A'}
                </div>
              </div>
            </div>
            {externalSentiment.note && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-xs text-slate-400">{externalSentiment.note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 货币流动性 */}
      {currencyLiquidity && Object.keys(currencyLiquidity).length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <i className="fas fa-coins text-emerald-400"></i>
            货币流动性
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(currencyLiquidity).map(([key, pair]) => (
              pair && typeof pair === 'object' && 'name' in pair && (
                <CurrencyCard key={key} pair={pair} />
              )
            ))}
          </div>
        </div>
      )}

      {/* 市场宽度 */}
      {marketBreadth && (
        <div>
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <i className="fas fa-arrows-alt-h text-pink-400"></i>
            市场宽度
          </h4>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <div className="text-2xl font-black text-emerald-400 mb-1">
                  {marketBreadth.advancingStocks ?? 0}
                </div>
                <div className="text-[10px] text-emerald-300/80 uppercase font-bold">上涨</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-rose-400 mb-1">
                  {marketBreadth.decliningStocks ?? 0}
                </div>
                <div className="text-[10px] text-rose-300/80 uppercase font-bold">下跌</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-slate-400 mb-1">
                  {marketBreadth.unchangedStocks ?? 0}
                </div>
                <div className="text-[10px] text-slate-300/80 uppercase font-bold">平盘</div>
              </div>
            </div>
            {marketBreadth.advanceDeclineRatio !== null && marketBreadth.advanceDeclineRatio !== undefined && (
              <div className="text-center pt-3 border-t border-slate-700">
                <span className="text-xs text-slate-400">上涨/下跌比率：</span>
                <span className="text-sm font-bold text-white ml-2">
                  {marketBreadth.advanceDeclineRatio.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 今日热门股票 */}
      {marketBreadth?.hotStocks && marketBreadth.hotStocks.stocks && marketBreadth.hotStocks.stocks.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <i className="fas fa-fire text-orange-400"></i>
            今日热门股票
          </h4>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            {/* 头部信息 */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">数据来源：</span>
                <span className="text-xs font-bold text-white">{marketBreadth.hotStocks.dataSource || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">行情时间：</span>
                <span className="text-xs font-bold text-white">{marketBreadth.hotStocks.hqTime || 'N/A'}</span>
                {marketBreadth.hotStocks.hqStatus && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                    {marketBreadth.hotStocks.hqStatus}
                  </span>
                )}
              </div>
            </div>

            {/* 热门股票列表 */}
            <div className="space-y-2">
              {marketBreadth.hotStocks.stocks.slice(0, 10).map((stock, index) => (
                <HotStockRow key={stock.symbol} stock={stock} rank={index + 1} />
              ))}
            </div>

            {/* 更多提示 */}
            {marketBreadth.hotStocks.count && marketBreadth.hotStocks.count > 10 && (
              <div className="mt-3 pt-3 border-t border-slate-700 text-center">
                <span className="text-xs text-slate-400">共 {marketBreadth.hotStocks.count} 只热门股票</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 货币对卡片组件
interface CurrencyCardProps {
  pair: CurrencyLiquidity;
}

const CurrencyCard: React.FC<CurrencyCardProps> = ({ pair }) => {
  const getChangeColor = (value: number | null) => {
    if (value === null) return 'text-slate-400';
    if (value >= 0) return 'text-rose-400';
    return 'text-emerald-400';
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">{pair.name}</span>
        <span className="text-[10px] text-slate-500">{pair.symbol}</span>
      </div>
      <div className="text-lg font-black text-white mb-1">
        {pair.lastPrice?.toFixed(4) ?? 'N/A'}
      </div>
      <div className={`text-xs font-bold ${getChangeColor(pair.changeRate)}`}>
        {pair.change !== null && pair.change !== undefined
          ? `${pair.change >= 0 ? '+' : ''}${pair.change.toFixed(4)} (${pair.changeRate >= 0 ? '+' : ''}${pair.changeRate.toFixed(2)}%)`
          : 'N/A'}
      </div>
      {pair.note && (
        <p className="text-[10px] text-slate-500 mt-2">{pair.note}</p>
      )}
    </div>
  );
};

// 热门股票行组件
interface HotStockRowProps {
  stock: HotStockItem;
  rank: number;
}

const HotStockRow: React.FC<HotStockRowProps> = ({ stock, rank }) => {
  const getChangeColor = (value: number | null) => {
    if (value === null) return 'text-slate-400';
    if (value >= 0) return 'text-rose-400';
    return 'text-emerald-400';
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
      <div className="flex items-center gap-3">
        {/* 排名 */}
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
          rank <= 3 ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'bg-slate-600 text-slate-300'
        }`}>
          {rank}
        </div>
        {/* 股票信息 */}
        <div>
          <div className="text-sm font-bold text-white">{stock.name}</div>
          <div className="text-[10px] text-slate-400">{stock.symbol}</div>
        </div>
      </div>

      {/* 价格和涨跌 */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-black text-white">
            {stock.lasttrade !== null ? stock.lasttrade.toFixed(2) : 'N/A'}
          </div>
          <div className={`text-xs font-bold ${getChangeColor(stock.changePercent)}`}>
            {stock.changePercent !== null
              ? `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`
              : 'N/A'}
          </div>
        </div>
        <div className="text-right w-24">
          <div className="text-[10px] text-slate-400">成交额</div>
          <div className="text-xs font-bold text-white">
            {stock.amount !== null
              ? stock.amount > 100000000
                ? `${(stock.amount / 100000000).toFixed(2)} 亿`
                : `${(stock.amount / 10000).toFixed(0)} 万`
              : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSnapshotPanel;
