
import React, { useState, useContext } from 'react';
import { StockPrice, Transaction } from '../types';
import { I18nContext } from '../App';

// Sub-components
import InterpretationTab from '../components/AILab/InterpretationTab';
import PortfolioTab from '../components/AILab/PortfolioTab';
import ReviewTab from '../components/AILab/ReviewTab';
import VisionTab from '../components/AILab/VisionTab';
import MarketTrendsTab from '../components/AILab/MarketTrendsTab';

interface AILabProps {
  stocks: StockPrice[];
  transactions: Transaction[];
  onAddTransactions?: (newTxs: Transaction[]) => void;
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
}

const AILab: React.FC<AILabProps> = (props) => {
  const { t } = useContext(I18nContext);
  const [activeSubTab, setActiveSubTab] = useState<'chart' | 'portfolio' | 'review' | 'vision' | 'news'>('chart');

  const tabs = [
    { id: 'chart', label: t.kline, icon: 'fa-chart-area' },
    { id: 'portfolio', label: t.portfolio, icon: 'fa-layer-group' },
    { id: 'review', label: t.review, icon: 'fa-history' },
    { id: 'vision', label: t.vision, icon: 'fa-camera-retro' },
    { id: 'news', label: t.marketTrends, icon: 'fa-bolt' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* 二级导航 */}
      <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl w-fit shadow-sm border border-slate-200/50 mx-auto sticky top-0 z-[60]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black flex items-center space-x-2 transition-all uppercase tracking-widest ${
              activeSubTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className={`fas ${tab.icon} text-[9px]`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 模块渲染容器 */}
      <div className="max-w-7xl mx-auto">
        {activeSubTab === 'chart' && <InterpretationTab stocks={props.stocks} />}
        {activeSubTab === 'portfolio' && (
          <PortfolioTab 
            transactions={props.transactions} 
            lang={useContext(I18nContext).lang} 
          />
        )}
        {activeSubTab === 'review' && (
          <ReviewTab 
            transactions={props.transactions} 
            stocks={props.stocks}
            onUpdateTransaction={props.onUpdateTransaction}
            lang={useContext(I18nContext).lang}
          />
        )}
        {activeSubTab === 'vision' && (
          <VisionTab 
            onAddTransactions={props.onAddTransactions}
            lang={useContext(I18nContext).lang}
          />
        )}
        {activeSubTab === 'news' && (
          <MarketTrendsTab lang={useContext(I18nContext).lang} />
        )}
      </div>
    </div>
  );
};

export default AILab;
