
import React, { useContext } from 'react';
import { AppConfig } from '../types';
import { I18nContext } from '../App';

interface SettingsProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => void;
}

const Settings: React.FC<SettingsProps> = ({ config, onUpdateConfig }) => {
  const { t } = useContext(I18nContext);

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white p-6 sm:p-12 rounded-[2.5rem] lg:rounded-[3rem] border border-slate-100 shadow-sm space-y-12 relative overflow-hidden">
        
        <section className="space-y-8">
          <div className="flex items-center space-x-5">
             <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                <i className="fas fa-tower-broadcast text-2xl"></i>
             </div>
             <div>
                <h4 className="font-black text-slate-800 tracking-tight text-xl">{t.settings_gateway}</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t.settings_gateway_desc}</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group hover:border-sky-200 transition-all">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-sm font-black text-slate-700 block tracking-tight">{t.settings_feishu}</span>
                </div>
                <button 
                  onClick={() => onUpdateConfig({ feishuEnabled: !config.feishuEnabled })}
                  className={`w-14 h-7 rounded-full p-1.5 transition-all ${config.feishuEnabled ? 'bg-sky-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${config.feishuEnabled ? 'translate-x-7' : 'translate-x-0'}`}></div>
                </button>
              </div>
              <input 
                type="text" 
                value={config.feishuWebhook}
                onChange={(e) => onUpdateConfig({ feishuWebhook: e.target.value })}
                placeholder="https://open.feishu.cn/..."
                className="w-full bg-white border border-slate-200 rounded-xl p-4 text-[10px] font-mono focus:border-sky-500 outline-none"
              />
            </div>

            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group hover:border-indigo-200 transition-all">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-sm font-black text-slate-700 block tracking-tight">{t.settings_smtp}</span>
                </div>
                <button 
                  onClick={() => onUpdateConfig({ emailEnabled: !config.emailEnabled })}
                  className={`w-14 h-7 rounded-full p-1.5 transition-all ${config.emailEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${config.emailEnabled ? 'translate-x-7' : 'translate-x-0'}`}></div>
                </button>
              </div>
              <input 
                type="email" 
                value={config.email}
                onChange={(e) => onUpdateConfig({ email: e.target.value })}
                placeholder="alerts@domain.com"
                className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-bold outline-none"
              />
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center space-x-5">
             <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
                <i className="fas fa-robot text-2xl"></i>
             </div>
             <div>
                <h4 className="font-black text-slate-800 tracking-tight text-xl">{t.settings_ai_listeners}</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Notification Automation</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {[
              { id: 'notifyReviewComplete', label: t.review, icon: 'fa-microchip', color: 'text-indigo-500' },
              { id: 'notifyVisionReady', label: t.vision, icon: 'fa-eye', color: 'text-sky-500' },
            ].map(pref => (
              <div key={pref.id} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                <div className="flex items-center space-x-6">
                   <div className={`${pref.color} w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100`}>
                      <i className={`fas ${pref.icon}`}></i>
                   </div>
                   <p className="text-sm font-black text-slate-800">{pref.label}</p>
                </div>
                <button 
                  onClick={() => onUpdateConfig({ [pref.id]: !config[pref.id as keyof AppConfig] })}
                  className={`w-14 h-7 rounded-full p-1.5 transition-all ${config[pref.id as keyof AppConfig] ? 'bg-slate-900' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${config[pref.id as keyof AppConfig] ? 'translate-x-7' : 'translate-x-0'}`}></div>
                </button>
              </div>
            ))}
          </div>
        </section>

        <button 
          onClick={() => alert(t.settings_success)}
          className="w-full bg-slate-950 text-white py-6 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all"
        >
          {t.settings_save_btn}
        </button>
      </div>
    </div>
  );
};

export default Settings;
