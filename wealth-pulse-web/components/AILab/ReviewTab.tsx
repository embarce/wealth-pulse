
import React, { useState } from 'react';
import { Transaction, StockPrice, TransactionType } from '../../types';
import { aiAnalysisApi } from '../../services/aiAnalysis';
import { Language } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';

interface ReviewTabProps {
  transactions: Transaction[];
  stocks: StockPrice[];
  lang: Language;
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
}

const ReviewTab: React.FC<ReviewTabProps> = ({ transactions, stocks, lang, onUpdateTransaction }) => {
  const toast = useToast();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const handleReview = async (tx: Transaction) => {
    setAnalyzingId(tx.id);
    try {
      const stock = stocks.find(s => s.symbol === tx.symbol);
      const context = stock ? `Current: ${stock.price}, Hist: ${JSON.stringify(stock.history.slice(-3))}` : "N/A";
      // 调用后端 API 分析贸易
      const result = await aiAnalysisApi.analyzeTrade({
        stockCode: tx.symbol,
        transactionDate: new Date(tx.date).toISOString().split('T')[0],
        instruction: tx.type === TransactionType.BUY ? 'BUY' : 'SELL',
        price: tx.price,
        quantity: tx.quantity,
        context,
      });
      onUpdateTransaction?.(tx.id, { aiScore: result.score, aiAdvice: result.rationale });
      toast.showSuccess(lang === 'zh' ? 'AI 复盘完成' : 'AI review complete');
    } catch (e: any) {
      console.error(e);
      toast.showError(e?.message || (lang === 'zh' ? '复盘失败' : 'Review failed'));
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
       <div className="p-10 border-b border-slate-50">
          <h4 className="text-xl font-black text-slate-800 italic">Trade Logic Review</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">AI 赋能历史博弈追溯与研判</p>
       </div>
       <div className="overflow-x-auto">
          <table className="w-full text-left">
             <tbody className="divide-y divide-slate-50">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-10 py-8">
                        <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{tx.symbol}</span>
                        <p className="text-[10px] text-slate-300 mt-2 font-bold uppercase">{tx.type}</p>
                     </td>
                     <td className="px-10 py-8">
                        {analyzingId === tx.id ? (
                          <div className="flex items-center space-x-3 text-indigo-500 animate-pulse">
                             <i className="fas fa-atom animate-spin"></i>
                             <span className="text-[10px] font-black uppercase tracking-widest">Deep Auditing...</span>
                          </div>
                        ) : tx.aiScore ? (
                          <div className="flex items-center space-x-6">
                             <div className="w-12 h-12 rounded-full border-4 border-indigo-600 flex items-center justify-center text-sm font-black text-indigo-600 bg-indigo-50/30">
                                {tx.aiScore}
                             </div>
                             <p className="text-xs text-slate-500 italic font-medium border-l-2 border-slate-100 pl-4">"{tx.aiAdvice}"</p>
                          </div>
                        ) : (
                          <button onClick={() => handleReview(tx)} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-5 py-2.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                             启动 AI 复盘
                          </button>
                        )}
                     </td>
                     <td className="px-10 py-8 text-right text-[10px] font-bold text-slate-400">
                        {new Date(tx.date).toLocaleDateString()}
                     </td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default ReviewTab;
