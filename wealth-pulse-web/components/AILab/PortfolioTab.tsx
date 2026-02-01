
import React, { useState } from 'react';
import { Transaction, PortfolioAnalysis, Holding, TransactionType } from '../../types';
import { getPortfolioAnalysis } from '../../services/gemini';
import { Language } from '../../i18n';

interface PortfolioTabProps {
  transactions: Transaction[];
  lang: Language;
}

const PortfolioTab: React.FC<PortfolioTabProps> = ({ transactions, lang }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<PortfolioAnalysis | null>(null);

  const runAudit = async () => {
    setIsAnalyzing(true);
    try {
      const hMap: Record<string, { qty: number; totalCost: number }> = {};
      transactions.forEach(t => {
        if (!hMap[t.symbol]) hMap[t.symbol] = { qty: 0, totalCost: 0 };
        if (t.type === TransactionType.BUY) {
          hMap[t.symbol].qty += t.quantity;
          hMap[t.symbol].totalCost += t.total;
        } else {
          const avg = hMap[t.symbol].totalCost / (hMap[t.symbol].qty || 1);
          const sellQty = Math.min(t.quantity, hMap[t.symbol].qty);
          hMap[t.symbol].qty -= sellQty;
          hMap[t.symbol].totalCost -= avg * sellQty;
        }
      });
      const holdings: Holding[] = Object.entries(hMap)
        .filter(([_, d]) => d.qty > 0)
        .map(([s, d]) => ({ 
          symbol: s, 
          quantity: d.qty, 
          avgPrice: d.totalCost / (d.qty || 1) 
        }));

      const data = await getPortfolioAnalysis(holdings, 0, lang);
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-8 border border-indigo-100">
            <i className={`fas fa-radar text-4xl ${isAnalyzing ? 'animate-spin' : ''}`}></i>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">全维 Alpha 仓位审计</h3>
          <p className="text-slate-400 text-sm max-w-lg mb-10">Gemini 将深入解构您的持仓结构、风险敞口和资产多样性，为您提供私人银行级的审计结论。</p>
          <button onClick={runAudit} disabled={isAnalyzing} className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl min-w-[200px] hover:scale-105 transition-all">
             {isAnalyzing ? <i className="fas fa-circle-notch animate-spin mr-2"></i> : <i className="fas fa-microchip mr-2"></i>}
             启动全维审计
          </button>
       </div>

       {isAnalyzing && <div className="h-60 bg-slate-50 animate-pulse rounded-[3rem] border border-slate-100"></div>}

       {report && !isAnalyzing && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in zoom-in-95">
             {[
               { label: '风险系数', val: report.riskScore, color: 'text-rose-500' },
               { label: '多样性评分', val: report.diversityScore, color: 'text-indigo-500' },
               { label: '效率值', val: report.efficiencyScore, color: 'text-emerald-500' },
             ].map(item => (
               <div key={item.label} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm text-center">
                 <p className="text-[10px] text-slate-400 font-black uppercase mb-3 tracking-widest">{item.label}</p>
                 <h4 className={`text-4xl font-black ${item.color}`}>{item.val}<span className="text-sm opacity-50 ml-1">/100</span></h4>
               </div>
             ))}
             <div className="md:col-span-3 bg-slate-900 p-10 rounded-[3rem] text-white">
                <h5 className="text-[10px] font-black uppercase text-indigo-400 mb-6 tracking-widest">Alpha 诊断摘要</h5>
                <p className="text-lg font-medium italic leading-relaxed border-l-4 border-indigo-500 pl-8 text-slate-300">"{report.summary}"</p>
             </div>
          </div>
       )}
    </div>
  );
};

export default PortfolioTab;
