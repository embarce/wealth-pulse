
import React, { useState, useContext } from 'react';
import { I18nContext } from '../App';

const Help: React.FC = () => {
  const { lang, t } = useContext(I18nContext);
  const [activeQA, setActiveQA] = useState<number | null>(0);

  const faqs = lang === 'zh' ? [
    {
      q: "系统中的股票价格是实时的吗？",
      a: "本系统目前处于 Alpha 测试阶段，股票价格通过高性能算法模拟生成（基于 2024 年末市场基准），旨在演示 AI 策略分析能力。未来将接入主流证券 API 以支持实盘监控。"
    },
    {
      q: "AI 交易评分的依据是什么？",
      a: "评分引擎由 Google Gemini 3 系列模型驱动。它会结合您当前的仓位配比、现金流、所选股票的近期历史波动以及宏观市场情绪进行综合打分。"
    },
    {
      q: "如何配置飞书机器人通知？",
      a: "在“系统配置”中开启飞书开关，并将 Webhook 地址粘贴进去。每当您完成交易，系统会通过该通道推送卡片消息。"
    },
    {
      q: "我的数据会上传到云端吗？",
      a: "系统尊重隐私，所有的交易记录、资产配置均加密存储在您的浏览器本地缓存（LocalStorage）中。AI 分析请求会脱敏处理后发送。"
    }
  ] : [
    {
      q: "Are the stock prices real-time?",
      a: "This system is currently in Alpha stage. Prices are generated via high-performance simulation algorithms based on late 2024 benchmarks to demonstrate AI capabilities."
    },
    {
      q: "How does AI trade scoring work?",
      a: "Powered by Gemini 3, the engine evaluates trades based on your portfolio ratio, cash flow, historical volatility (K-line), and macro sentiment."
    },
    {
      q: "How to configure Feishu Bot?",
      a: "Enable Feishu in 'Settings' and paste your Webhook URL. The system will push formatted cards for every completed transaction."
    },
    {
      q: "Is my data uploaded to the cloud?",
      a: "We prioritize privacy. All transaction and config data are stored locally in your browser (LocalStorage). AI requests are anonymized before processing."
    }
  ];

  return (
    <div className="max-w-5xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 头部展示 */}
      <div className="purple-gradient p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-6 tracking-tighter italic">{t.help_main_title}</h2>
          <p className="text-xl font-medium text-white/80 leading-relaxed max-w-3xl italic">
            {t.help_main_desc}
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black border border-white/10 uppercase tracking-widest">{t.help_engine}</span>
            <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black border border-white/10 uppercase tracking-widest">{t.help_privacy}</span>
            <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black border border-white/10 uppercase tracking-widest">{t.help_tracking}</span>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* QA Section */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-2xl font-black text-slate-800 flex items-center italic">
            <i className="fas fa-question-circle text-indigo-500 mr-3"></i> {t.help_faq_title}
          </h3>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all">
                <button 
                  onClick={() => setActiveQA(activeQA === idx ? null : idx)}
                  className="w-full px-8 py-6 text-left flex justify-between items-center hover:bg-slate-50 transition-colors"
                >
                  <span className="font-black text-slate-700 text-sm tracking-tight">{faq.q}</span>
                  <i className={`fas fa-chevron-${activeQA === idx ? 'up' : 'down'} text-slate-300 transition-transform`}></i>
                </button>
                {activeQA === idx && (
                  <div className="px-8 pb-8 text-xs text-slate-500 font-medium leading-relaxed animate-in slide-in-from-top-2 duration-300">
                    <div className="h-px bg-slate-50 mb-4"></div>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="space-y-6">
          <h3 className="text-2xl font-black text-slate-800 flex items-center italic">
            <i className="fas fa-headset text-rose-500 mr-3"></i> {t.help_contact_title}
          </h3>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 border border-indigo-100">
                <i className="fas fa-user-tie text-3xl text-indigo-600"></i>
              </div>
              <h4 className="font-black text-slate-800 italic">{t.help_admin}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Professional Support</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-slate-50 rounded-2xl group hover:bg-indigo-600 transition-all cursor-pointer">
                <i className="fas fa-envelope text-slate-400 mr-4 group-hover:text-white transition-colors"></i>
                <span className="text-xs font-black text-slate-600 group-hover:text-white">admin@pulse.ai</span>
              </div>
            </div>

            <div className="pt-4 text-center">
              <p className="text-[9px] text-slate-300 font-bold leading-relaxed">
                {t.help_contact_desc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
