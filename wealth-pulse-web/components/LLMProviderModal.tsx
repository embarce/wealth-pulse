import React, { useEffect, useState } from 'react';
import { AppConfig } from '../types';
import { LLMProviderInfo, aiAnalysisApi } from '../services/aiAnalysis';
import { Language } from '../i18n';

interface LLMProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig | null;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => void;
  lang: Language;
  toast?: {
    showSuccess: (message: string, duration?: number) => void;
    showError: (message: string, duration?: number) => void;
  };
}

interface ProviderDisplayInfo {
  name: string;
  nameCn: string;
  desc: string;
  color: string;
  iconColor: string;
}

const LLMProviderModal: React.FC<LLMProviderModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  lang,
  toast,
}) => {
  const [providers, setProviders] = useState<LLMProviderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>(config?.llmProvider || '');
  const [selectedModel, setSelectedModel] = useState<string>(config?.llmModel || '');
  const [isSaving, setIsSaving] = useState(false);

  // 供应商显示信息映射
  const providerDisplayInfo: Record<string, ProviderDisplayInfo> = {
    doubao: { name: 'Doubao', nameCn: '豆包', desc: lang === 'zh' ? '火山引擎，性价比高' : 'Volcengine, cost-effective', color: 'bg-blue-50 border-blue-200', iconColor: 'text-blue-500' },
    openai: { name: 'OpenAI', nameCn: '', desc: lang === 'zh' ? '分析质量高，理解能力强' : 'High quality analysis', color: 'bg-emerald-50 border-emerald-200', iconColor: 'text-emerald-500' },
    qwen: { name: 'Qwen', nameCn: '通义千问', desc: lang === 'zh' ? '阿里达摩院，中文理解好' : 'Alibaba DAMO, good Chinese understanding', color: 'bg-purple-50 border-purple-200', iconColor: 'text-purple-500' },
    gemini: { name: 'Gemini', nameCn: '', desc: lang === 'zh' ? 'Google 模型，多语言支持' : 'Google model, multi-language', color: 'bg-indigo-50 border-indigo-200', iconColor: 'text-indigo-500' },
    gitee: { name: 'GiteeAI', nameCn: '魔力方舟', desc: lang === 'zh' ? 'Gitee AI，国产算力平台' : 'Gitee AI, domestic platform', color: 'bg-red-50 border-red-200', iconColor: 'text-red-500' },
    anthropic: { name: 'Anthropic', nameCn: '', desc: lang === 'zh' ? 'Claude 系列模型' : 'Claude AI models', color: 'bg-orange-50 border-orange-200', iconColor: 'text-orange-500' },
    deepseek: { name: 'DeepSeek', nameCn: '深度求索', desc: lang === 'zh' ? '国产大模型' : 'Chinese LLM models', color: 'bg-cyan-50 border-cyan-200', iconColor: 'text-cyan-500' },
    zhipu: { name: 'ZhipuAI', nameCn: '智谱 AI', desc: lang === 'zh' ? 'GLM 系列模型，国产算力' : 'GLM models, domestic AI', color: 'bg-violet-50 border-violet-200', iconColor: 'text-violet-500' },
  };

  // 加载供应商列表
  useEffect(() => {
    if (isOpen) {
      fetchProviders();
      setSelectedProvider(config?.llmProvider || '');
      setSelectedModel(config?.llmModel || '');
    }
  }, [isOpen, config]);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const data = await aiAnalysisApi.listProviders();
      setProviders(data);
    } catch (err) {
      console.error('获取 LLM 供应商列表失败:', err);
      toast?.showError(lang === 'zh' ? '获取供应商列表失败' : 'Failed to fetch providers');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取当前选中供应商的模型列表
  const getCurrentModels = (): string[] => {
    const provider = providers.find(p => p.name === selectedProvider);
    if (!provider) return [];

    const apiModels = provider.models || [];
    const defaultModel = provider.model;

    if (!apiModels.includes(defaultModel)) {
      return [defaultModel, ...apiModels];
    }
    return apiModels;
  };

  const handleSave = async () => {
    if (!selectedProvider || !selectedModel) {
      toast?.showError(lang === 'zh' ? '请选择供应商和模型' : 'Please select provider and model');
      return;
    }

    setIsSaving(true);
    onUpdateConfig({
      llmProvider: selectedProvider,
      llmModel: selectedModel,
    });

    toast?.showSuccess(lang === 'zh' ? 'LLM 配置已保存' : 'LLM configuration saved');
    setIsSaving(false);
    onClose();
  };

  const getProviderIcon = (name: string): React.ReactNode => {
    const displayInfo = providerDisplayInfo[name.toLowerCase()] || { iconColor: 'text-slate-500' };
    return (
      <div className={`w-7 h-7 rounded-md bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center ${displayInfo.iconColor}`}>
        <i className="fas fa-bolt text-[10px]"></i>
      </div>
    );
  };

  const getProviderBadge = (name: string): React.ReactNode => {
    const provider = providers.find(p => p.name === name);
    if (!provider) return null;

    return provider.available ? (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[8px] font-bold uppercase tracking-wider">
        <i className="fas fa-check mr-0.5"></i>
        {lang === 'zh' ? '已配置' : 'Configured'}
      </span>
    ) : (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[8px] font-bold uppercase tracking-wider">
        <i className="fas fa-circle mr-0.5 text-[3px]"></i>
        {lang === 'zh' ? '未配置' : 'Not Configured'}
      </span>
    );
  };

  if (!isOpen) return null;

  const currentModels = getCurrentModels();
  const currentProviderInfo = providerDisplayInfo[selectedProvider?.toLowerCase()] || {
    name: selectedProvider,
    nameCn: '',
    desc: '',
    color: 'bg-slate-50 border-slate-200',
    iconColor: 'text-slate-500',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-violet-50 to-indigo-50 p-5 border-b border-slate-100 rounded-t-[2.5rem]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-violet-600 shadow-sm border border-violet-100">
                <i className="fas fa-brain text-lg"></i>
              </div>
              <div>
                <h2 className="font-black text-slate-800 tracking-tight text-base">
                  {lang === 'zh' ? 'AI 模型配置' : 'AI Model Configuration'}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {lang === 'zh' ? '选择 LLM 供应商和模型' : 'Select LLM provider and model'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-600 transition-all border border-slate-200"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        {/* Content - Scrollable area */}
        <div className="flex-grow overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* 当前配置提示 */}
          {config?.llmProvider && config?.llmModel && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <i className="fas fa-circle-check text-emerald-500 text-sm"></i>
              <span className="text-xs font-bold text-emerald-800 truncate">
                {lang === 'zh'
                  ? `当前：${config.llmProvider} · ${config.llmModel}`
                  : `Current: ${config.llmProvider} · ${config.llmModel}`}
              </span>
            </div>
          )}

          {/* 供应商列表 */}
          <div>
            <h3 className="text-xs font-black text-slate-700 mb-3 flex items-center">
              <i className="fas fa-layer-group text-violet-500 mr-1.5"></i>
              {lang === 'zh' ? 'LLM 供应商' : 'LLM Provider'}
            </h3>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {providers.map((provider) => {
                  const displayInfo = providerDisplayInfo[provider.name.toLowerCase()] || {
                    name: provider.name,
                    nameCn: '',
                    desc: '',
                    color: 'bg-slate-50 border-slate-200',
                    iconColor: 'text-slate-500',
                  };
                  const isSelected = selectedProvider === provider.name;

                  return (
                    <button
                      key={provider.name}
                      onClick={() => {
                        setSelectedProvider(provider.name);
                        setSelectedModel(provider.model);
                      }}
                      className={`p-2.5 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                        isSelected
                          ? `${displayInfo.color} ring-2 ring-violet-400 ring-offset-2`
                          : 'bg-white border-slate-200 hover:border-violet-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-slate-800">{displayInfo.name}</span>
                        {getProviderBadge(provider.name)}
                      </div>
                      {displayInfo.nameCn && <p className="text-[8px] text-slate-500 font-medium mb-0.5">{displayInfo.nameCn}</p>}
                      <p className="text-[9px] text-slate-500 leading-relaxed truncate">{displayInfo.desc}</p>
                      {(provider.models?.length || 0) > 0 && (
                        <p className="text-[8px] text-slate-400 mt-1 flex items-center">
                          <i className="fas fa-microchip mr-0.5"></i>
                          {provider.models.length} {lang === 'zh' ? '个模型' : ' models'}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 模型选择 */}
          {selectedProvider && currentModels.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-slate-700 mb-3 flex items-center">
                <i className="fas fa-microchip text-violet-500 mr-1.5"></i>
                {lang === 'zh' ? '选择模型' : 'Select Model'}
              </h3>

              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 pr-10 text-xs font-bold focus:border-violet-500 outline-none appearance-none cursor-pointer transition-all hover:border-slate-300"
                >
                  {currentModels.map((model) => {
                    const isDefaultModel = model === providers.find(p => p.name === selectedProvider)?.model;
                    return (
                      <option key={model} value={model}>
                        {model} {isDefaultModel ? `(default)` : ''}
                      </option>
                    );
                  })}
                </select>
                <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
              </div>
            </div>
          )}

          {/* 供应商信息卡片 */}
          {selectedProvider && (
            <div className={`p-3 rounded-xl border-2 ${currentProviderInfo.color}`}>
              <div className="flex items-center space-x-2.5 mb-1.5">
                {getProviderIcon(selectedProvider)}
                <div>
                  <h4 className="font-black text-slate-800 text-sm">{currentProviderInfo.name}</h4>
                  {currentProviderInfo.nameCn && <p className="text-[8px] text-slate-500">{currentProviderInfo.nameCn}</p>}
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{currentProviderInfo.desc}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-b-[2.5rem]">
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-black text-slate-600 bg-white hover:bg-slate-50 transition-all uppercase tracking-widest text-[10px] border border-slate-200"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedProvider || !selectedModel || isSaving}
              className="flex-1 py-3 rounded-xl font-black text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-[10px]"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-circle-notch animate-spin mr-1.5"></i>
                  {lang === 'zh' ? '保存中...' : 'Saving...'}
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-1.5"></i>
                  {lang === 'zh' ? '保存配置' : 'Save'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLMProviderModal;
