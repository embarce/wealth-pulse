import React, { useContext, useEffect, useState, useRef } from 'react';
import { AppConfig } from '../types';
import { I18nContext } from '../App';
import { aiAnalysisApi, LLMProviderInfo } from '../services/aiAnalysis';

interface SettingsProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => void;
  toast?: {
    showSuccess: (message: string, duration?: number) => void;
    showError: (message: string, duration?: number) => void;
    showWarning: (message: string, duration?: number) => void;
    showInfo: (message: string, duration?: number) => void;
  };
}

const Settings: React.FC<SettingsProps> = ({ config, onUpdateConfig, toast = {
  showSuccess: () => {},
  showError: () => {},
  showWarning: () => {},
  showInfo: () => {},
} }) => {
  const { t, lang } = useContext(I18nContext);
  const [providers, setProviders] = useState<LLMProviderInfo[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target as Node)) {
        setIsProviderDropdownOpen(false);
        setIsModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 加载 LLM 供应商列表
  useEffect(() => {
    const fetchProviders = async () => {
      setIsLoadingProviders(true);
      try {
        const data = await aiAnalysisApi.listProviders();
        setProviders(data);
      } catch (err) {
        console.error('获取 LLM 供应商列表失败:', err);
      } finally {
        setIsLoadingProviders(false);
      }
    };

    fetchProviders();
  }, []);

  // 获取供应商的模型选项 - 直接从 API 返回的数据中获取
  const getModelOptions = (providerName: string): string[] => {
    const provider = providers.find(p => p.name === providerName);
    if (!provider) return [];

    // 直接使用 API 返回的模型列表
    const apiModels = provider.models || [];
    const defaultModel = provider.model;

    // 确保默认模型在列表中
    if (!apiModels.includes(defaultModel)) {
      return [defaultModel, ...apiModels];
    }

    return apiModels;
  };

  const currentModelOptions = config.llmProvider ? getModelOptions(config.llmProvider) : [];

  // 获取供应商标识
  const getProviderIcon = (name: string): React.ReactNode => {
    const colorMap: Record<string, string> = {
      doubao: 'text-blue-500',
      openai: 'text-emerald-500',
      qwen: 'text-purple-500',
      gemini: 'text-indigo-500',
      gitee: 'text-red-500',
      anthropic: 'text-orange-500',
      deepseek: 'text-cyan-500',
      zhipu: 'text-violet-500',
    };

    return (
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center ${colorMap[name] || 'text-slate-500'}`}>
        <i className="fas fa-bolt text-xs"></i>
      </div>
    );
  };

  const getProviderBadge = (name: string) => {
    const provider = providers.find(p => p.name === name);
    if (!provider) return null;

    return provider.available ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wider">
        <i className="fas fa-check mr-1"></i>
        {lang === 'zh' ? '已配置' : 'Configured'}
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider">
        <i className="fas fa-circle mr-1 text-[4px]"></i>
        {lang === 'zh' ? '未配置' : 'Not Configured'}
      </span>
    );
  };

  // 供应商显示名称映射
  const providerDisplayNames: Record<string, { name: string; nameCn: string; desc: string; color: string; iconColor: string }> = {
    doubao: { name: 'Doubao', nameCn: '豆包', desc: lang === 'zh' ? '火山引擎，性价比高，推荐' : 'Volcengine, cost-effective, recommended', color: 'bg-blue-50 border-blue-200', iconColor: 'text-blue-500' },
    openai: { name: 'OpenAI', nameCn: '', desc: lang === 'zh' ? '分析质量高，理解能力强' : 'High quality analysis, strong understanding', color: 'bg-emerald-50 border-emerald-200', iconColor: 'text-emerald-500' },
    qwen: { name: 'Qwen', nameCn: '通义千问', desc: lang === 'zh' ? '阿里达摩院，中文理解好' : 'Alibaba DAMO, good Chinese understanding', color: 'bg-purple-50 border-purple-200', iconColor: 'text-purple-500' },
    gemini: { name: 'Gemini', nameCn: '', desc: lang === 'zh' ? 'Google 模型，多语言支持' : 'Google model, multi-language support', color: 'bg-indigo-50 border-indigo-200', iconColor: 'text-indigo-500' },
    gitee: { name: 'GiteeAI', nameCn: '魔力方舟', desc: lang === 'zh' ? 'Gitee AI，国产算力平台' : 'Gitee AI, domestic computing platform', color: 'bg-red-50 border-red-200', iconColor: 'text-red-500' },
    anthropic: { name: 'Anthropic', nameCn: '', desc: lang === 'zh' ? 'Claude 系列模型' : 'Claude AI models', color: 'bg-orange-50 border-orange-200', iconColor: 'text-orange-500' },
    deepseek: { name: 'DeepSeek', nameCn: '深度求索', desc: lang === 'zh' ? '国产大模型' : 'Chinese LLM models', color: 'bg-cyan-50 border-cyan-200', iconColor: 'text-cyan-500' },
    zhipu: { name: 'ZhipuAI', nameCn: '智谱 AI', desc: lang === 'zh' ? 'GLM 系列模型，国产算力' : 'GLM models, domestic AI', color: 'bg-violet-50 border-violet-200', iconColor: 'text-violet-500' },
  };

  // 从 API 获取供应商列表，合并显示信息
  const providerInfoList = providers.map((provider) => {
    const displayInfo = providerDisplayNames[provider.name] || {
      name: provider.name,
      nameCn: '',
      desc: '',
      color: 'bg-slate-50 border-slate-200',
      iconColor: 'text-slate-500',
    };
    return {
      ...displayInfo,
      ...provider,
      modelCount: provider.models?.length || 0,
    };
  });

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div ref={dropdownContainerRef} className="bg-white p-6 sm:p-12 rounded-[2.5rem] lg:rounded-[3rem] border border-slate-100 shadow-sm space-y-12 relative overflow-hidden">

        {/* AI 模型配置 */}
        <section className="space-y-6">
          <div className="flex items-center space-x-5">
             <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 border border-violet-100 shadow-sm">
                <i className="fas fa-brain text-2xl"></i>
             </div>
             <div>
                <h4 className="font-black text-slate-800 tracking-tight text-xl">{t.settings_ai_config}</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t.settings_ai_config_desc}</p>
             </div>
          </div>

          {/* 供应商信息卡片 - 始终显示 */}
          <div className="p-5 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100">
            <div className="flex items-center space-x-2 mb-4">
              <i className="fas fa-info-circle text-violet-500"></i>
              <p className="text-sm font-bold text-violet-900">
                {lang === 'zh' ? 'LLM 供应商说明' : 'LLM Provider Information'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {providerInfoList.map((info) => {
                const isSelected = config.llmProvider === info.name.toLowerCase();
                return (
                  <button
                    key={info.name}
                    onClick={() => {
                      const models = getModelOptions(info.name.toLowerCase());
                      onUpdateConfig({
                        llmProvider: info.name.toLowerCase(),
                        llmModel: models[0] || ''
                      });
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                      isSelected
                        ? `${info.color} ring-2 ring-violet-400 ring-offset-2`
                        : 'bg-white/60 border-slate-200 hover:border-violet-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-black text-slate-800">{info.name}</span>
                      {getProviderBadge(info.name.toLowerCase())}
                    </div>
                    {info.nameCn && <p className="text-[9px] text-slate-500 font-medium mb-1">{info.nameCn}</p>}
                    <p className="text-[10px] text-slate-600 leading-relaxed">{info.desc}</p>
                    {info.modelCount > 0 && (
                      <p className="text-[9px] text-slate-400 mt-2 flex items-center">
                        <i className="fas fa-microchip mr-1"></i>
                        {info.modelCount} {lang === 'zh' ? '个可用模型' : ' models'}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* LLM 供应商选择 */}
            <div className="relative">
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group hover:border-violet-200 transition-all">
                <div className="mb-6">
                  <span className="text-sm font-black text-slate-700 block tracking-tight mb-2">{t.settings_llm_provider}</span>
                  <p className="text-[10px] text-slate-400">{lang === 'zh' ? '选择 AI 分析使用的 LLM 供应商' : 'Select LLM provider for AI analysis'}</p>
                </div>

                {isLoadingProviders ? (
                  <div className="flex items-center justify-center h-12">
                    <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsProviderDropdownOpen(!isProviderDropdownOpen);
                        setIsModelDropdownOpen(false);
                      }}
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 text-left flex items-center justify-between hover:border-violet-300 focus:border-violet-500 outline-none transition-all shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        {config.llmProvider ? (
                          <>
                            {getProviderIcon(config.llmProvider)}
                            <span className="text-sm font-bold text-slate-800 capitalize">{config.llmProvider}</span>
                          </>
                        ) : (
                          <span className="text-sm font-medium text-slate-400">{t.settings_llm_provider_placeholder}</span>
                        )}
                      </div>
                      <i className={`fas fa-chevron-down text-slate-400 transition-transform ${isProviderDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>

                    {/* 下拉菜单 */}
                    {isProviderDropdownOpen && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="py-2">
                          {providers.map((provider) => (
                            <button
                              key={provider.name}
                              onClick={() => {
                                const models = getModelOptions(provider.name);
                                onUpdateConfig({
                                  llmProvider: provider.name,
                                  llmModel: models[0] || ''
                                });
                                setIsProviderDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-5 py-3 hover:bg-violet-50 transition-colors ${
                                config.llmProvider === provider.name ? 'bg-violet-50' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                {getProviderIcon(provider.name)}
                                <div className="text-left">
                                  <p className="text-sm font-bold text-slate-800 capitalize">{provider.name}</p>
                                  <p className="text-[9px] text-slate-500">{provider.models?.length || 0} {lang === 'zh' ? '个模型' : ' models'} · {provider.model}</p>
                                </div>
                              </div>
                              {provider.available && (
                                <i className="fas fa-check text-emerald-500 text-xs"></i>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 模型选择 */}
            <div className="relative">
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group hover:border-violet-200 transition-all">
                <div className="mb-6">
                  <span className="text-sm font-black text-slate-700 block tracking-tight mb-2">{t.settings_llm_model}</span>
                  <p className="text-[10px] text-slate-400">{lang === 'zh' ? '选择具体的模型版本' : 'Select specific model version'}</p>
                </div>

                <div className="relative">
                  <button
                    onClick={() => {
                      setIsModelDropdownOpen(!isModelDropdownOpen);
                      setIsProviderDropdownOpen(false);
                    }}
                    disabled={!config.llmProvider}
                    className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 text-left flex items-center justify-between hover:border-violet-300 focus:border-violet-500 outline-none transition-all shadow-sm disabled:bg-slate-100 disabled:border-slate-200 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center space-x-3">
                      {config.llmModel ? (
                        <>
                          <i className="fas fa-microchip text-violet-500"></i>
                          <span className="text-sm font-bold text-slate-800">{config.llmModel}</span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">{t.settings_llm_model_placeholder}</span>
                      )}
                    </div>
                    <i className={`fas fa-chevron-down text-slate-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`}></i>
                  </button>

                  {/* 下拉菜单 */}
                  {isModelDropdownOpen && config.llmProvider && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                      <div className="py-2">
                        {currentModelOptions.map((model) => {
                          const isDefaultModel = model === providers.find(p => p.name === config.llmProvider)?.model;
                          return (
                            <button
                              key={model}
                              onClick={() => {
                                onUpdateConfig({ llmModel: model });
                                setIsModelDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-5 py-3 hover:bg-violet-50 transition-colors ${
                                config.llmModel === model ? 'bg-violet-50' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <i className="fas fa-microchip text-violet-400 text-xs"></i>
                                <span className="text-sm font-bold text-slate-800">{model}</span>
                                {isDefaultModel && (
                                  <span className="text-[9px] text-violet-500 font-bold uppercase">DEFAULT</span>
                                )}
                              </div>
                              {config.llmModel === model && (
                                <i className="fas fa-check text-violet-500 text-xs"></i>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 当前配置提示 */}
          {config.llmProvider && config.llmModel && (
            <div className="flex items-center justify-center space-x-2 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <i className="fas fa-circle-check text-emerald-500"></i>
              <span className="text-sm font-bold text-emerald-800">
                {lang === 'zh'
                  ? `当前使用：${config.llmProvider} · ${config.llmModel}`
                  : `Current: ${config.llmProvider} · ${config.llmModel}`}
              </span>
            </div>
          )}
        </section>

        {/* 通信通道配置 */}
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

        {/* AI 行为通知监听 */}
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
          onClick={() => toast.showSuccess(lang === 'zh' ? '设置已保存' : 'Settings saved')}
          className="w-full bg-slate-950 text-white py-6 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all hover:scale-[1.02] active:scale-95"
        >
          {t.settings_save_btn}
        </button>
      </div>
    </div>
  );
};

export default Settings;
