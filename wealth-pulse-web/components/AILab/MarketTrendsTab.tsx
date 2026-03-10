
import React, { useState } from 'react';
import { AINewsItem, AIHotspot } from '../../types';
import { aiAnalysisApi } from '../../services/aiAnalysis';
import { Language } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';

interface MarketTrendsTabProps {
  lang: Language;
}

const MarketTrendsTab: React.FC<MarketTrendsTabProps> = ({ lang }) => {
  const toast = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [news, setNews] = useState<AINewsItem[]>([]);
  const [hotspots, setHotspots] = useState<AIHotspot[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = async () => {
    setIsAnalyzing(true);
    try {
      // 调用后端 API 获取港股市场分析
      const analysis = await aiAnalysisApi.getHkStockMarketAnalysis();
      // 从分析结果中提取新闻和热点（这里需要根据实际返回结构调整）
      setHasScanned(true);
      toast.showSuccess(lang === 'zh' ? '市场分析完成' : 'Market analysis complete');
    } catch (e: any) {
      console.error(e);
      toast.showError(e?.message || (lang === 'zh' ? '分析失败' : 'Analysis failed'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-700">
       {!hasScanned && !isAnalyzing ? (
         <div className="bg-white p-12 lg:p-20 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col items-center text-center max-w-5xl mx-auto">
            <div className="w-32 h-32 relative mb-12">
               <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping"></div>
               <div className="relative w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-2xl">
                  <i className="fas fa-satellite-dish text-5xl"></i>
               </div>
            </div>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-6">启动全球情报研判</h3>
            <button onClick={handleScan} className="bg-slate-900 text-white px-12 py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl">
               <i className="fas fa-bolt-lightning mr-4 text-amber-400"></i>开始实时研判
            </button>
         </div>
       ) : (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
               <div className="flex items-center justify-between">
                  <h4 className="text-2xl font-black text-slate-900 flex items-center italic">
                    <i className="fas fa-rss text-indigo-500 mr-4"></i> 实时情报摘要
                  </h4>
                  <button onClick={handleScan} disabled={isAnalyzing} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl">
                    <i className={`fas fa-arrows-rotate mr-2 ${isAnalyzing ? 'animate-spin' : ''}`}></i> 重新研判
                  </button>
               </div>
               
               <div className="space-y-6">
                  {isAnalyzing ? [1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-50 animate-pulse rounded-[3.5rem]"></div>) : news.map((item, i) => (
                    <div key={i} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                       <div className={`absolute top-0 left-0 w-2 h-full ${item.impact === 'positive' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                       <h5 className="text-2xl font-black text-slate-900 mb-4">{item.title}</h5>
                       <p className="text-base text-slate-500 font-medium italic">"{item.summary}"</p>
                    </div>
                  ))}
               </div>
            </div>

            <div className="space-y-10">
               <h4 className="text-2xl font-black text-slate-900 flex items-center italic">
                  <i className="fas fa-fire-flame-curved text-rose-500 mr-4"></i> 热力追踪
               </h4>
               <div className="space-y-6">
                  {isAnalyzing ? [1, 2].map(i => <div key={i} className="h-40 bg-slate-900/5 animate-pulse rounded-[3.5rem]"></div>) : hotspots.map((h, i) => (
                    <div key={i} className="bg-[#0b0e14] p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                       <h5 className="text-2xl font-black italic mb-6">{h.topic}</h5>
                       <p className="text-sm text-slate-400 font-medium italic">"{h.description}"</p>
                    </div>
                  ))}
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default MarketTrendsTab;
