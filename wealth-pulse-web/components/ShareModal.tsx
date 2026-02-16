
import React, { useEffect, useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import QRCode from 'qrcode';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: {
    type: 'portfolio' | 'trade' | 'batch';
    mainValue: string;
    subLabel: string;
    subValue: string;
    items?: { label: string; value: string; color?: string }[];
    batchItems?: { date: string; type: string; symbol: string; price: string; quantity: string }[];
  };
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, title, data }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportNo] = useState(() => Math.random().toString(36).substr(2, 6).toUpperCase());

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL('https://pulse-alpha.ai', { 
        margin: 1, 
        width: 200, 
        color: { dark: '#ffffff', light: '#00000000' } 
      }).then(setQrDataUrl);
    }
  }, [isOpen]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { 
        quality: 1.0, 
        pixelRatio: 2,
        cacheBust: true 
      });
      const link = document.createElement('a');
      link.download = `pulse-combat-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Generation failed', err);
    }
    setIsGenerating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-white shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">生成分享海报</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ready to share your pulse</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-10 overflow-y-auto custom-scrollbar flex-grow bg-slate-50/50">
          <div 
            ref={cardRef} 
            className="share-card-gradient w-full min-h-[600px] rounded-[3rem] p-12 flex flex-col text-white relative shadow-2xl overflow-hidden"
            style={{ minWidth: '450px' }}
          >
            {/* 背景动态图形 */}
            <div className="absolute top-[-5%] right-[-5%] w-72 h-72 bg-indigo-500/15 rounded-full blur-[90px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-60 h-60 bg-purple-500/10 rounded-full blur-[80px]"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-12 relative z-10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <i className="fas fa-bolt text-xl"></i>
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight leading-none">财富脉搏</h1>
                  <p className="text-[8px] text-indigo-400 font-black uppercase tracking-[0.3em] mt-1">Intelligence Terminal</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Report No.</p>
                <p className="text-[10px] font-black mt-1">#{reportNo}</p>
              </div>
            </div>

            {/* Main Stats */}
            <div className="mb-12 relative z-10">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-4">{data.subLabel}</p>
              <h2 className="text-6xl font-black tracking-tighter mb-3">{data.mainValue}</h2>
              <div className={`inline-flex items-center px-4 py-1.5 rounded-xl text-sm font-black ${data.subValue.includes('+') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {data.subValue}
              </div>
            </div>

            {/* Content View: Switch between Batch and Single */}
            <div className="flex-grow relative z-10">
              {data.type === 'batch' && data.batchItems ? (
                <div className="space-y-4">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-6">交易序列回顾 (Combat Sequence)</p>
                  <div className="relative border-l-2 border-white/10 ml-2 pl-8 space-y-8 pb-4">
                    {data.batchItems.map((item, idx) => (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[41px] top-1 w-5 h-5 rounded-full border-4 border-[#0d0f17] shadow-lg ${item.type === 'BUY' ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.date}</p>
                            <p className="text-sm font-black text-white">{item.type === 'BUY' ? '买入' : '卖出'} {item.symbol}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-100">¥{item.price}</p>
                            <p className="text-[10px] font-bold text-slate-500">{item.quantity} 股</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-8 space-y-5">
                  {data.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-4 border-b border-white/5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                      <span className={`text-base font-black ${item.color || 'text-white'}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Realized Profit Badge for Batch */}
            {data.type === 'batch' && data.subValue.includes('+') && (
              <div className="absolute top-1/2 right-10 -translate-y-1/2 opacity-20 rotate-[-15deg] pointer-events-none">
                 <div className="w-32 h-32 border-8 border-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-black text-emerald-500 uppercase">精准<br/>获利</span>
                 </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-16 flex justify-between items-end relative z-10">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Pulse Intelligence</p>
                <p className="text-[11px] font-bold text-slate-200 mt-1">捕捉每一次脉动，沉淀每一份收益</p>
              </div>
              {qrDataUrl && (
                <div className="flex flex-col items-center">
                   <img src={qrDataUrl} alt="QR" className="w-20 h-20 rounded-2xl border border-white/10 p-1.5 bg-white/5 shadow-2xl" />
                   <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mt-3">Scan to join the Alpha</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-10 py-10 bg-white border-t border-slate-50 shrink-0">
          <button 
            onClick={handleDownload}
            disabled={isGenerating}
            className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-sm shadow-2xl shadow-slate-900/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center space-x-4"
          >
            {isGenerating ? (
              <i className="fas fa-circle-notch animate-spin"></i>
            ) : (
              <><i className="fas fa-cloud-download-alt"></i> <span>保存高清波段战报</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
