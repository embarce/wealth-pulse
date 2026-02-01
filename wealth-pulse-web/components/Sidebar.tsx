
import React, { useContext } from 'react';
import { I18nContext } from '../App';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  totalAssets: number;
  assetRate: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, totalAssets, assetRate }) => {
  const { lang, t, setLang } = useContext(I18nContext);

  const menuItems = [
    { id: 'dashboard', icon: 'fa-layer-group', label: t.dashboard },
    { id: 'market', icon: 'fa-compass', label: t.market },
    { id: 'holdings', icon: 'fa-wallet', label: t.holdings },
    { id: 'records', icon: 'fa-history', label: t.records },
    { id: 'ai', icon: 'fa-microchip', label: t.aiLab },
    { id: 'settings', icon: 'fa-sliders', label: t.settings },
    { id: 'help', icon: 'fa-circle-info', label: t.help },
  ];

  return (
    <aside className="w-72 bg-[#0d0f17] flex flex-col p-8 shadow-2xl h-full lg:h-screen border-r border-white/5 overflow-y-auto custom-scrollbar">
      <div className="flex items-center space-x-4 mb-10 lg:mb-14 px-2">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
          <i className="fas fa-chart-line text-xl"></i>
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight leading-none">Wealth Pulse</h1>
          <p className="text-[9px] text-indigo-400/60 font-black uppercase tracking-[0.2em] mt-1">{t.terminal}</p>
        </div>
      </div>

      <nav className="flex-grow space-y-2 lg:space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center space-x-4 w-full px-6 py-4 rounded-2xl transition-all duration-500 group relative ${
              activeTab === item.id
                ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 translate-x-1'
                : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <i className={`fas ${item.icon} text-lg`}></i>
            <span className="font-bold text-[13px] tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-8 space-y-6">
        {/* Language Switcher */}
        <div className="bg-white/5 p-1 rounded-xl flex">
          <button 
            onClick={() => setLang('zh')}
            className={`flex-grow py-1.5 rounded-lg text-[9px] font-black transition-all ${lang === 'zh' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
          >
            中文
          </button>
          <button 
            onClick={() => setLang('en')}
            className={`flex-grow py-1.5 rounded-lg text-[9px] font-black transition-all ${lang === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
          >
            EN
          </button>
        </div>

        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 backdrop-blur-xl">
          <p className="text-[10px] text-slate-500 font-black mb-1 uppercase tracking-widest">{t.netWorth}</p>
          <h3 className="text-xl font-black text-white truncate tracking-tighter">
            ¥{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <div className={`flex items-center mt-3 text-[10px] font-black ${assetRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className={`px-2 py-1 rounded-lg ${assetRate >= 0 ? 'bg-emerald-400/10' : 'bg-rose-400/10'} mr-2`}>
              {assetRate >= 0 ? '↑' : '↓'} {Math.abs(assetRate).toFixed(2)}%
            </span>
            <span className="text-slate-600 opacity-50">Total Return</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between px-2 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center text-slate-400">
              <i className="fas fa-shield-halved text-xs"></i>
            </div>
            <div>
              <p className="text-xs font-black text-slate-300">Administrator</p>
              <p className="text-[9px] text-slate-600 font-bold uppercase">{t.professional}</p>
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="text-slate-600 hover:text-rose-500 transition-all">
            <i className="fas fa-power-off text-sm"></i>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
