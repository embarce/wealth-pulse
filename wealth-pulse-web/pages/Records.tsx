
import React, { useState, useMemo } from 'react';
import { Transaction, CapitalLog, TransactionType, CapitalType } from '../types';
import ShareModal from '../components/ShareModal';

interface RecordsProps {
  transactions: Transaction[];
  capitalLogs: CapitalLog[];
}

const Records: React.FC<RecordsProps> = ({ transactions, capitalLogs }) => {
  const [activeSubTab, setActiveSubTab] = useState<'trade' | 'capital'>('trade');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 多选状态
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isShareOpen, setIsShareOpen] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const stats = useMemo(() => {
    const totalTradeVol = transactions.reduce((acc, t) => acc + t.total, 0);
    const buyCount = transactions.filter(t => t.type === TransactionType.BUY).length;
    const sellCount = transactions.filter(t => t.type === TransactionType.SELL).length;
    return { totalTradeVol, buyCount, sellCount };
  }, [transactions]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedTxIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTxIds(next);
  };

  const clearSelection = () => setSelectedTxIds(new Set());

  const handleBatchShare = () => {
    if (selectedTxIds.size === 0) return;
    setIsShareOpen(true);
  };

  const getBatchShareData = () => {
    const selectedTxs = transactions.filter(t => selectedTxIds.has(t.id)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (selectedTxs.length === 0) return { type: 'batch' as const, mainValue: '0', subLabel: '', subValue: '' };

    const totalBuy = selectedTxs.filter(t => t.type === TransactionType.BUY).reduce((acc, t) => acc + t.total, 0);
    const totalSell = selectedTxs.filter(t => t.type === TransactionType.SELL).reduce((acc, t) => acc + t.total, 0);
    const netProfit = totalSell - totalBuy;
    const profitRate = totalBuy > 0 ? (netProfit / totalBuy) * 100 : 0;
    
    const isSingleSymbol = new Set(selectedTxs.map(t => t.symbol)).size === 1;
    const mainTitle = isSingleSymbol ? selectedTxs[0].symbol : '多资产波段回顾';

    return {
      type: 'batch' as const,
      mainValue: `¥${Math.abs(netProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      subLabel: `${mainTitle} • 已实现盈亏`,
      subValue: `${netProfit >= 0 ? '+' : '-'} ¥${Math.abs(netProfit).toLocaleString()} (${profitRate.toFixed(2)}%)`,
      batchItems: selectedTxs.map(t => ({
        date: new Date(t.date).toLocaleDateString(),
        type: t.type,
        symbol: t.symbol,
        price: t.price.toFixed(2),
        quantity: t.quantity.toString()
      }))
    };
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* 统计指标 - 响应式网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">累计交易流水</p>
          <h4 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tighter">¥{stats.totalTradeVol.toLocaleString()}</h4>
        </div>
        <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">买卖比例</p>
          <div className="flex items-center space-x-3 mt-3">
             <span className="text-sm font-black text-indigo-500">{stats.buyCount}B</span>
             <div className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-indigo-500" style={{ width: `${(stats.buyCount / ((stats.buyCount + stats.sellCount) || 1)) * 100}%` }}></div>
                <div className="h-full bg-rose-500" style={{ width: `${(stats.sellCount / ((stats.buyCount + stats.sellCount) || 1)) * 100}%` }}></div>
             </div>
             <span className="text-sm font-black text-rose-500">{stats.sellCount}S</span>
          </div>
        </div>
        <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-sm col-span-1 sm:col-span-2 flex items-center justify-between">
           <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">操作指导</p>
              <p className="text-xs font-bold text-slate-600">勾选记录生成波段分析</p>
           </div>
           <i className="fas fa-lightbulb text-amber-400 text-xl hidden sm:block"></i>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] lg:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden relative">
        {/* 多选浮动手写条 */}
        {selectedTxIds.size > 0 && (
          <div className="absolute top-0 left-0 right-0 z-20 bg-indigo-600 text-white px-4 lg:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-full duration-300">
             <div className="flex items-center space-x-4 lg:space-x-8">
                <p className="text-xs font-black tracking-tight">已选 {selectedTxIds.size} 项</p>
                <div className="h-4 w-px bg-white/20 hidden sm:block"></div>
                <p className="text-[10px] font-black uppercase tracking-widest hidden sm:block">金额: ¥{transactions.filter(t => selectedTxIds.has(t.id)).reduce((acc, t) => acc + t.total, 0).toLocaleString()}</p>
             </div>
             <div className="flex items-center space-x-4 w-full sm:w-auto">
                <button onClick={clearSelection} className="flex-grow sm:flex-none text-[10px] font-black uppercase hover:underline">取消</button>
                <button 
                  onClick={handleBatchShare}
                  className="flex-grow sm:flex-none bg-white text-indigo-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  生成战报
                </button>
             </div>
          </div>
        )}

        <div className="px-6 py-6 lg:px-10 lg:py-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
            <button onClick={() => { setActiveSubTab('trade'); clearSelection(); }} className={`flex-grow md:flex-none px-6 lg:px-8 py-3 rounded-xl text-xs font-black transition-all ${activeSubTab === 'trade' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>交易明细</button>
            <button onClick={() => { setActiveSubTab('capital'); clearSelection(); }} className={`flex-grow md:flex-none px-6 lg:px-8 py-3 rounded-xl text-xs font-black transition-all ${activeSubTab === 'capital' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>本金流水</button>
          </div>
          {activeSubTab === 'trade' && (
            <div className="relative w-full md:w-64">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
              <input 
                type="text" 
                placeholder="搜索证券代码..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-slate-50 border-transparent border-2 focus:border-indigo-100 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold focus:outline-none transition-all" 
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          {activeSubTab === 'trade' ? (
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/20">
                  <th className="px-6 lg:px-10 py-6 w-12"></th>
                  <th className="px-4 py-6">执行时间</th>
                  <th className="px-4 py-6">证券标的</th>
                  <th className="px-4 py-6 text-center">指令</th>
                  <th className="px-4 py-6 text-right">单价/数量</th>
                  <th className="px-6 lg:px-10 py-6 text-right">成交总额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTransactions.map(t => (
                  <tr 
                    key={t.id} 
                    onClick={() => toggleSelect(t.id)}
                    className={`group cursor-pointer transition-all ${selectedTxIds.has(t.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'}`}
                  >
                    <td className="px-6 lg:px-10 py-6">
                       <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${selectedTxIds.has(t.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 group-hover:border-indigo-300'}`}>
                          {selectedTxIds.has(t.id) && <i className="fas fa-check text-[10px] text-white"></i>}
                       </div>
                    </td>
                    <td className="px-4 py-6">
                      <p className="text-sm font-black text-slate-800">{new Date(t.date).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-300 font-bold uppercase">{new Date(t.date).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-4 py-6">
                       <div className="flex items-center space-x-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[9px] font-black">{t.symbol.slice(0, 2)}</div>
                         <p className="font-black text-slate-800 text-sm tracking-tight">{t.symbol}</p>
                       </div>
                    </td>
                    <td className="px-4 py-6 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${t.type === TransactionType.BUY ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-6 text-right">
                       <p className="text-sm font-black text-slate-800">¥{t.price.toFixed(2)}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase">{t.quantity} Shares</p>
                    </td>
                    <td className="px-6 lg:px-10 py-6 text-right">
                       <p className="text-sm font-black text-slate-900">¥{t.total.toLocaleString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 lg:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
               {capitalLogs.map(log => (
                  <div key={log.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center">
                    <div>
                      <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">{new Date(log.date).toLocaleDateString()}</p>
                      <h5 className={`text-lg lg:text-xl font-black mt-1 ${log.type === CapitalType.DEPOSIT ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {log.type === CapitalType.DEPOSIT ? '+' : '-'}¥{log.amount.toLocaleString()}
                      </h5>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${log.type === CapitalType.DEPOSIT ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}`}>
                      <i className={`fas ${log.type === CapitalType.DEPOSIT ? 'fa-vault' : 'fa-arrow-right-from-bracket'}`}></i>
                    </div>
                  </div>
               ))}
            </div>
          )}
        </div>
      </div>

      <ShareModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        title="波段战报" 
        data={getBatchShareData()} 
      />
    </div>
  );
};

export default Records;
