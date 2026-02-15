
import React, { useContext } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { StockPrice, Holding } from '../types';
import { PositionsDashboardData } from '../services/userApi';
import LiveMarketWatch from '../components/LiveMarketWatch';
import { I18nContext } from '../App';

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
}

const Dashboard: React.FC<DashboardProps> = ({ assets, totalPrincipal, holdingsCount, stocks, onTrade, onNavigateToAI, aiOutlook, positionsDashboard }) => {
  const { t } = useContext(I18nContext);

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        <div className="bg-white p-6 lg:p-7 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-100 transition-all">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3">{t.totalAssets}</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">¥{assets.total.toLocaleString(undefined, { minimumFractionDigits: 1 })}</h3>
          <div className={`inline-flex items-center mt-3 px-3 py-1 rounded-xl text-[9px] font-black ${assets.rate >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
             {assets.rate >= 0 ? '↑' : '↓'} {Math.abs(assets.rate).toFixed(2)}%
          </div>
        </div>

        <div className="bg-white p-6 lg:p-7 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3">{t.accumulatedProfit}</p>
          <h3 className={`text-2xl font-black tracking-tighter ${assets.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {assets.profit >= 0 ? '+' : ''}¥{assets.profit.toLocaleString()}
          </h3>
          <p className="text-[9px] text-slate-300 font-black mt-3">{t.absoluteReturns}</p>
        </div>

        <div className="bg-white p-6 lg:p-7 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3">{t.cashAvailable}</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">¥{assets.cash.toLocaleString()}</h3>
          <p className="text-[9px] text-indigo-500 font-black mt-3">{t.readyToInvest}</p>
        </div>

        <div className="bg-white p-6 lg:p-7 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3">{t.marketValue}</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">¥{assets.stockVal.toLocaleString()}</h3>
          <p className="text-[9px] text-emerald-500 font-black mt-3">{holdingsCount} {t.positionsCount}</p>
        </div>

        <div className="bg-white p-6 lg:p-7 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3">{t.principal}</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">¥{totalPrincipal.toLocaleString()}</h3>
          <p className="text-[9px] text-slate-300 font-black mt-3">Initial Capital</p>
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
                {['1D', '1W', '1M', 'YTD'].map(time => (
                  <button key={time} className={`flex-grow sm:flex-none px-4 lg:px-6 py-2 rounded-xl text-[10px] font-black transition-all ${time === '1M' ? 'bg-white text-indigo-600 shadow-md shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}>{time}</button>
                ))}
              </div>
            </div>
            <div className="h-[260px] lg:h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stocks[0]?.history}>
                  <defs>
                    <linearGradient id="colorAsset" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: 'black', padding: '16px 24px' }} 
                  />
                  <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={5} fill="url(#colorAsset)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
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
