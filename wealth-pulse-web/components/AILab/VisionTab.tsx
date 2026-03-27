
import React, { useState, useRef } from 'react';
import { DetectedRecord, Transaction, TransactionType } from '../../types';
import { aiAnalysisApi } from '../../services/aiAnalysis';
import { Language } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';

interface VisionTabProps {
  onAddTransactions?: (newTxs: Transaction[]) => void;
  lang: Language;
}

const VisionTab: React.FC<VisionTabProps> = ({ onAddTransactions, lang }) => {
  const toast = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detected, setDetected] = useState<DetectedRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        setIsAnalyzing(true);
        try {
          const base64Data = (reader.result as string).split(',')[1];
          // 调用后端 API 分析券商截图
          const result = await aiAnalysisApi.analyzeBrokerScreenshot({
            imageBase64: base64Data,
          });
          // 将后端返回的 DetectedTrade 转换为前端 DetectedRecord 格式
          const records: DetectedRecord[] = result.trades.map(trade => ({
            symbol: trade.stockCode,
            type: trade.instruction === 'BUY' ? TransactionType.BUY : TransactionType.SELL,
            price: trade.price,
            quantity: trade.quantity,
            date: trade.timestamp || new Date().toISOString(),
            confidence: trade.confidence,
          }));
          setDetected(records);
          toast.showSuccess(lang === 'zh' ? `识别成功，发现 ${records.length} 条交易记录` : `Recognition complete, found ${records.length} trades`);
        } catch (err: any) {
          console.error(err);
          toast.showError(err?.message || (lang === 'zh' ? '识别失败' : 'Recognition failed'));
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImport = () => {
    if (onAddTransactions && detected.length > 0) {
      const newTxs: Transaction[] = detected.map(rec => ({
        id: `v-${Date.now()}-${Math.random()}`,
        date: rec.date || new Date().toISOString(),
        symbol: rec.symbol,
        type: rec.type,
        price: rec.price,
        quantity: rec.quantity,
        total: rec.price * rec.quantity
      }));
      onAddTransactions(newTxs);
      setDetected([]);
      alert("成功导入交易序列。");
    }
  };

  return (
    <div className="space-y-6">
       <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 mb-8 border border-sky-100">
            <i className={`fas fa-expand text-4xl ${isAnalyzing ? 'animate-pulse' : ''}`}></i>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">券商截图 AI 数据还原</h3>
          <p className="text-slate-400 text-sm max-w-lg mb-10">上传截图，Gemini 将自动提取股票代码、成交价格和买卖方向并存入流水。</p>
          <div className="flex space-x-4">
            <button onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing} className="bg-slate-950 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center hover:scale-105 transition-all">
               {isAnalyzing ? <i className="fas fa-circle-notch animate-spin mr-3"></i> : <i className="fas fa-file-import mr-3"></i>}
               上传图片
            </button>
            {detected.length > 0 && (
              <button onClick={handleImport} className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center hover:scale-105 transition-all">
                <i className="fas fa-check-double mr-3"></i> 确认识别并导入
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onUpload} />
       </div>

       {isAnalyzing && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-50 animate-pulse rounded-[3rem]"></div>)}
         </div>
       )}

       {detected.length > 0 && !isAnalyzing && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {detected.map((rec, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase">{rec.symbol}</span>
                    <span className={`text-[9px] font-black uppercase ${rec.type === TransactionType.BUY ? 'text-indigo-600' : 'text-rose-600'}`}>{rec.type}</span>
                 </div>
                 <div className="flex justify-between items-end">
                    <div>
                       <p className="text-xl font-black text-slate-800">¥{rec.price.toFixed(2)}</p>
                       <p className="text-[10px] font-bold text-slate-400">{rec.date}</p>
                    </div>
                    <span className="text-xs font-black text-emerald-500">{(rec.confidence * 100).toFixed(0)}%</span>
                 </div>
              </div>
            ))}
         </div>
       )}
    </div>
  );
};

export default VisionTab;
