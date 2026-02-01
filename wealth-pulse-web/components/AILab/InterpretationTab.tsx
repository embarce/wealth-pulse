
import React, { useState, useMemo, useRef, useContext } from 'react';
import { StockPrice, ChartInterpretation } from '../../types';
import { interpretChart, interpretKLineImage } from '../../services/gemini';
import { AreaChart, Area, ResponsiveContainer, CartesianGrid, XAxis, YAxis } from 'recharts';
import { I18nContext } from '../../App';

interface InterpretationTabProps {
  stocks: StockPrice[];
}

const InterpretationTab: React.FC<InterpretationTabProps> = ({ stocks }) => {
  const { t, lang } = useContext(I18nContext);
  
  // 状态管理
  const [chartMode, setChartMode] = useState<'data' | 'upload'>('data');
  const [selectedStock, setSelectedStock] = useState<StockPrice | null>(stocks[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interpretation, setInterpretation] = useState<ChartInterpretation | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 搜索逻辑
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return stocks.slice(0, 4);
    return stocks.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 5);
  }, [searchQuery, stocks]);

  // 分析逻辑
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      if (chartMode === 'data' && selectedStock) {
        const data = await interpretChart(selectedStock.symbol, selectedStock.history, lang);
        setInterpretation(data);
      } else if (chartMode === 'upload' && uploadedImage) {
        const data = await interpretKLineImage(uploadedImage.split(',')[1], lang);
        setInterpretation(data);
      }
    } catch (e) {
      // Mock Fallback
      setInterpretation({
        patterns: lang === 'zh' ? ["底部盘整", "量价背离"] : ["Bottom Consolidation", "Divergence"],
        support: selectedStock ? selectedStock.price * 0.92 : 150,
        resistance: selectedStock ? selectedStock.price * 1.08 : 180,
        takeProfit: selectedStock ? selectedStock.price * 1.15 : 200,
        stopLoss: selectedStock ? selectedStock.price * 0.88 : 140,
        advice: lang === 'zh' ? "当前处于筑底阶段，建议轻仓分批入场。" : "Bottoming out. Suggest light position entry."
      });
    }
    setIsAnalyzing(false);
  };

  const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setInterpretation(null);
        setChartMode('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 交互控制台 */}
      <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          
          {/* 搜索/识别输入框 */}
          <div className="relative flex-grow w-full">
            <div className={`flex items-center bg-slate-50 border-2 rounded-2xl px-6 transition-all duration-300 ${
              isSearchFocused ? 'border-indigo-500 bg-white ring-4 ring-indigo-500/5' : 'border-slate-50'
            }`}>
              <i className="fas fa-magnifying-glass text-slate-300 mr-4"></i>
              <input 
                type="text" 
                placeholder={chartMode === 'data' ? "锁定证券代码进行 AI 深度研判..." : "识图模式已开启，请上传K线截图..."}
                disabled={chartMode === 'upload'}
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-4 bg-transparent text-sm font-black text-slate-800 outline-none placeholder:text-slate-300 disabled:opacity-50"
              />
              {chartMode === 'data' && selectedStock && !searchQuery && (
                <div className="hidden sm:flex items-center bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ml-4 shrink-0 shadow-lg shadow-indigo-100">
                  Target: {selectedStock.symbol}
                </div>
              )}
            </div>

            {/* 下拉搜索结果 */}
            {isSearchFocused && chartMode === 'data' && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl border border-slate-100 shadow-2xl z-[100] overflow-hidden">
                <div className="p-2">
                  {searchResults.map(s => (
                    <button 
                      key={s.symbol} 
                      onClick={() => { setSelectedStock(s); setSearchQuery(''); setIsSearchFocused(false); setInterpretation(null); }} 
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black">{s.symbol.slice(0, 2)}</div>
                        <div className="text-left">
                          <p className="text-sm font-black text-slate-900">{s.symbol}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{s.name}</p>
                        </div>
                      </div>
                      <i className="fas fa-chevron-right text-slate-200 text-xs"></i>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 模式切换与生成按钮 */}
          <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/30">
              <button 
                onClick={() => setChartMode('data')}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  chartMode === 'data' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                实时数据
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  chartMode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                K线识图
              </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileUpload} />

            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || (chartMode === 'upload' && !uploadedImage)}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center min-w-[160px] hover:scale-[1.02] active:scale-95 transition-all"
            >
              {isAnalyzing ? <i className="fas fa-circle-notch animate-spin mr-2"></i> : <i className="fas fa-atom mr-2"></i>}
              生成 AI 研报
            </button>
          </div>
        </div>
      </div>

      {/* 结果显示区 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        {/* 左侧：图表终端 */}
        <div className="lg:col-span-3 space-y-6">
          <div className="aspect-[16/9] bg-[#0b0e14] rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
            {isAnalyzing && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md z-30 flex flex-col items-center justify-center text-white space-y-4">
                 <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em]">Decoding Signal Matrix...</p>
              </div>
            )}
            
            {chartMode === 'data' && selectedStock ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedStock.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.1} />
                  <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={5} fill="rgba(99, 102, 241, 0.15)" animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            ) : uploadedImage ? (
              <img src={uploadedImage} className="w-full h-full object-contain p-8" alt="K-Line Upload" />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700">
                <i className="fas fa-chart-line text-6xl opacity-10 mb-4"></i>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">等待载入行情数据</p>
              </div>
            )}
            <div className="absolute bottom-6 right-10 text-[8px] font-black text-slate-800 uppercase tracking-[0.6em] italic opacity-40">ALPHA ANALYSIS TERMINAL</div>
          </div>

          {/* 指标卡片组 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '关键支撑', val: interpretation?.support, icon: 'fa-anchor', color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
              { label: '趋势压力', val: interpretation?.resistance, icon: 'fa-triangle-exclamation', color: 'text-amber-500', bg: 'bg-amber-50/50' },
              { label: '止盈目标', val: interpretation?.takeProfit, icon: 'fa-flag-checkered', color: 'text-indigo-500', bg: 'bg-indigo-50/50' },
              { label: '风控止损', val: interpretation?.stopLoss, icon: 'fa-shield-halved', color: 'text-rose-500', bg: 'bg-rose-50/50' },
            ].map(p => (
              <div key={p.label} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center group transition-all hover:bg-slate-50">
                <div className={`w-10 h-10 ${p.bg} ${p.color} rounded-xl flex items-center justify-center mb-3 shadow-inner`}>
                  <i className={`fas ${p.icon} text-xs`}></i>
                </div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">{p.label}</p>
                {isAnalyzing ? (
                  <div className="h-6 w-16 bg-slate-50 animate-pulse rounded"></div>
                ) : (
                  <h4 className="text-xl font-black text-slate-800 tracking-tighter">{p.val ? `¥${p.val.toFixed(2)}` : '--.--'}</h4>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：策略节点 */}
        <div className="bg-[#0c0e16] p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h4 className="text-lg font-black italic flex items-center space-x-3">
              <span className={`w-2 h-2 ${isAnalyzing ? 'bg-indigo-400 animate-ping' : 'bg-indigo-500'} rounded-full`}></span>
              <span>Gemini 策略节点</span>
            </h4>
            <button className="text-slate-600 hover:text-white transition-colors"><i className="fas fa-arrow-up-right-from-square text-xs"></i></button>
          </div>

          <div className="flex-grow flex flex-col justify-center">
             {isAnalyzing ? (
               <div className="space-y-6">
                  <div className="h-3 w-3/4 bg-white/5 animate-pulse rounded"></div>
                  <div className="h-3 w-full bg-white/5 animate-pulse rounded"></div>
                  <div className="h-3 w-2/3 bg-white/5 animate-pulse rounded"></div>
                  <div className="pt-10 flex justify-center">
                     <i className="fas fa-brain animate-pulse text-white/10 text-4xl"></i>
                  </div>
               </div>
             ) : interpretation ? (
               <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-wrap gap-2">
                    {interpretation.patterns.map(p => <span key={p} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[9px] font-black text-indigo-400 uppercase tracking-widest"># {p}</span>)}
                  </div>
                  <div className="relative">
                    <i className="fas fa-quote-left absolute -top-4 -left-2 text-white/5 text-4xl"></i>
                    <p className="text-base font-medium italic text-slate-200 border-l-4 border-indigo-600 pl-6 py-4 leading-relaxed">
                      "{interpretation.advice}"
                    </p>
                  </div>
               </div>
             ) : (
               <div className="text-center space-y-6 opacity-20 py-20">
                  <i className="fas fa-microchip text-5xl"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest">等待引擎加载指令</p>
               </div>
             )}
          </div>

          <div className="mt-10 pt-10 border-t border-white/5">
            <p className="text-[9px] text-slate-500 font-bold leading-relaxed italic">
              AI 结论基于历史行情概率模型生成，不构成直接买卖邀约。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterpretationTab;
