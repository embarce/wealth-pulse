import React, { useContext, useState, useEffect } from 'react';
import { I18nContext } from '../App';
import { aiAnalysisApi, HkStockMarketAnalysis } from '../services/aiAnalysis';
import MarkdownViewer from './MarkdownViewer';
import NewsPanelModal from './NewsPanelModal';
import MarketSnapshotPanel from './MarketSnapshotPanel';

interface MarketAnalysisDailyProps {
  onViewNews?: () => void;
}

const MarketAnalysisDaily: React.FC<MarketAnalysisDailyProps> = ({ onViewNews }) => {
  const { t } = useContext(I18nContext);

  const [analysis, setAnalysis] = useState<HkStockMarketAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [showNewsPanel, setShowNewsPanel] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAnalysis = async (useRealtime = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = useRealtime
        ? await aiAnalysisApi.analyzeHkStockMarketRealtime()
        : await aiAnalysisApi.getHkStockMarketAnalysis();
      setAnalysis(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || t.ai_report_error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, []);

  const handleRefresh = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmRefresh = () => {
    setShowConfirmModal(false);
    loadAnalysis(true);
  };

  const handleViewDetails = () => {
    setShowFullReport(true);
  };

  const handleViewNews = () => {
    setShowNewsPanel(true);
  };

  return (
    <>
      {/* AI 分析日报 - 全新美化版本 */}
      <div className="relative rounded-[3rem] lg:rounded-[3.5rem] overflow-hidden shadow-2xl">
        {/* 多层背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c0f1a] via-[#141829] to-[#0f1424]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/15 via-transparent to-transparent"></div>

        {/* 动态网格背景 */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:50px_50px] opacity-60"></div>

        {/* 浮动光斑 */}
        <div className="absolute top-10 right-20 w-64 h-64 bg-indigo-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-purple-500/8 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>

        {/* 内容区域 */}
        <div className="relative z-10 p-8 lg:p-10">
          {/* Header - 标题栏 */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-5">
              {/* 动态图标容器 */}
              <div className="relative">
                {/* 外环旋转光晕 */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-lg opacity-60 animate-spin-slow"></div>
                {/* 内层渐变球 */}
                <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_50%)]"></div>
                  <i className="fas fa-microchip text-2xl lg:text-3xl text-white relative z-10"></i>
                </div>
                {/* LIVE 状态指示器 */}
                <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-[#1a1d2d] border-2 border-[#1a1d2d] rounded-full px-2 py-0.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
              </div>

              {/* 标题文字 */}
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.3em]">
                    {t.ai_daily_report}
                  </span>
                  <span className="px-2.5 py-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 text-[7px] font-black uppercase tracking-wider rounded-full border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    Real-time
                  </span>
                </div>
                <h3 className="text-lg lg:text-xl font-black tracking-tight leading-relaxed">
                  <span className="bg-gradient-to-r from-white via-indigo-100 to-white bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    {t.ai_report_title}
                  </span>
                </h3>
              </div>
            </div>

            {/* 操作按钮组 */}
            <div className="flex items-center gap-3">
              {/* 新闻按钮 */}
              <button
                onClick={handleViewNews}
                className="group relative bg-gradient-to-r from-indigo-600/90 to-purple-600/90 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all duration-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <div className="flex items-center gap-2.5 relative z-10">
                  <i className="fas fa-newspaper group-hover:rotate-12 transition-transform duration-300"></i>
                  {t.news_panel_title}
                </div>
              </button>

              {/* 刷新按钮 */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="group relative bg-white/10 hover:bg-white/20 text-white px-5 py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] border border-white/10 hover:border-white/20"
              >
                <div className="flex items-center gap-2">
                  <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-all duration-700`}></i>
                  <span>重新分析</span>
                </div>
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center relative">
                {/* 多层旋转环 */}
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-400 border-r-purple-400 animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-3 border-purple-500/20"></div>
                  <div className="absolute inset-2 rounded-full border-3 border-transparent border-t-purple-400 border-r-pink-400 animate-spin reverse"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-microchip text-2xl text-indigo-400 animate-pulse"></i>
                  </div>
                </div>
                <p className="text-slate-400 text-sm font-medium">{t.ai_report_loading}</p>
                <p className="text-slate-500 text-xs mt-2">AI 正在分析最新市场数据...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                {/* 错误图标 */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl"></div>
                  <div className="relative w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                    <i className="fas fa-exclamation-triangle text-3xl text-rose-400"></i>
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-6">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="group bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white px-8 py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_40px_rgba(244,63,94,0.5)] hover:-translate-y-0.5"
                >
                  <i className="fas fa-redo mr-2 group-hover:rotate-180 transition-transform duration-500"></i>
                  {t.ai_report_refresh}
                </button>
              </div>
            </div>
          ) : analysis ? (
            <>
              {/* 报告预览卡片 - 极光渐变设计 */}
              <div className="mb-10">
                <div className="relative rounded-[2rem] overflow-hidden">
                  {/* 背景 - 深色玻璃态 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-[#0c0f1a]/90 backdrop-blur-xl"></div>

                  {/* 顶部极光条 */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                  {/* 左侧光晕 */}
                  <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-indigo-500/10 to-transparent blur-2xl"></div>

                  {/* 右侧光晕 */}
                  <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-purple-500/10 to-transparent blur-2xl"></div>

                  {/* 内容容器 */}
                  <div className="relative p-7 lg:p-8">
                    {/* 标题栏 */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <i className="fas fa-file-waveform text-white text-sm"></i>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">AI 市场分析报告</h4>
                        <p className="text-[10px] text-slate-400">基于最新市场数据生成</p>
                      </div>
                    </div>

                    {/* 报告正文 */}
                    <div
                      className="text-slate-300 text-[13px] leading-loose line-clamp-4 font-light pl-4 border-l-2 border-indigo-500/50"
                      dangerouslySetInnerHTML={{
                        __html: analysis.investmentReport
                          ? analysis.investmentReport.replace(/\n/g, '<br/>')
                          : ''
                      }}
                    />

                    {/* 右下角装饰 */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] text-indigo-400">
                      <i className="fas fa-sparkles"></i>
                      <span>AI Powered</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 新闻统计卡片 - 统一深色风格 */}
              {analysis.newsSummary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                  <DarkStatCard
                    value={analysis.newsSummary.importantNewsCount}
                    label={t.ai_report_important_news}
                    color="indigo"
                    icon="fa-star"
                  />
                  <DarkStatCard
                    value={analysis.newsSummary.rankNewsCount}
                    label={t.ai_report_rank_news}
                    color="purple"
                    icon="fa-file-lines"
                  />
                  <DarkStatCard
                    value={analysis.newsSummary.companyNewsCount}
                    label={t.ai_report_company_news}
                    color="pink"
                    icon="fa-building"
                  />
                  <DarkStatCard
                    value={analysis.newsSummary.totalCount}
                    label={t.ai_report_total_news}
                    color="emerald"
                    icon="fa-chart-simple"
                  />
                </div>
              )}

              {/* 市场快照按钮 */}
              {analysis?.marketSnapshot && (
                <div className="mb-10">
                  <button
                    onClick={() => setShowSnapshot(true)}
                    className="w-full group relative bg-gradient-to-r from-indigo-600/20 to-purple-600/20 hover:from-indigo-600/30 hover:to-purple-600/30 text-white px-6 py-5 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all duration-500 border border-indigo-500/30 hover:border-indigo-500/50 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                          <i className="fas fa-chart-bar text-white text-sm"></i>
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold mb-0.5">市场快照</div>
                          <div className="text-[9px] text-slate-400">查看实时市场数据、指数表现、资金流向</div>
                        </div>
                      </div>
                      <i className="fas fa-chevron-right text-slate-400 group-hover:text-white transition-colors"></i>
                    </div>
                  </button>
                </div>
              )}

              {/* 底部操作栏 - 分离式设计 */}
              <div className="flex items-center justify-between pt-8 border-t border-white/5">
                {/* 更新时间 */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                  {lastUpdated && (
                    <div className="text-xs">
                      <div className="text-slate-500 mb-0.5">{t.ai_report_last_updated}</div>
                      <div className="text-slate-300 font-mono text-[11px]">{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  )}
                </div>

                {/* 查看详情按钮 - 幽灵按钮风格 */}
                <button
                  onClick={handleViewDetails}
                  className="group relative bg-white text-slate-950 px-10 lg:px-12 py-4 rounded-[1.25rem] font-black text-[9px] lg:text-[10px] transition-all duration-500 shadow-xl hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:-translate-y-1 overflow-hidden"
                >
                  {/* 渐变背景动画 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  {/* 扫光 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  {/* 内容 */}
                  <div className="flex items-center gap-3 relative z-10 group-hover:text-white transition-colors duration-500">
                    <span>{t.ai_report_view_details}</span>
                    <i className="fas fa-arrow-right-long group-hover:translate-x-1.5 transition-transform duration-300"></i>
                  </div>
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Full Report Modal */}
      <MarkdownViewer
        isOpen={showFullReport}
        onClose={() => setShowFullReport(false)}
        content={analysis?.investmentReport || analysis?.rawReport || ''}
        title={t.ai_report_title}
      />

      {/* Market Snapshot Modal */}
      {showSnapshot && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998] bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowSnapshot(false)}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-gradient-to-br from-slate-900 via-[#1a1d2d] to-[#0f172a] w-full max-w-4xl max-h-[85vh] rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 pointer-events-auto border border-white/10">
              {/* Header */}
              <div className="relative h-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute inset-0 flex items-center px-8">
                  <div>
                    <h3 className="text-2xl font-black text-white mb-1">市场快照</h3>
                    <p className="text-xs text-white/80">实时市场数据监控</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSnapshot(false)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <i className="fas fa-times text-white"></i>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-6rem)]">
                <MarketSnapshotPanel snapshot={analysis?.marketSnapshot || null} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* News Panel Modal */}
      <NewsPanelModal
        isOpen={showNewsPanel}
        onClose={() => setShowNewsPanel(false)}
      />

      {/* Confirm Refresh Modal - 美化确认弹窗 */}
      {showConfirmModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998] bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowConfirmModal(false)}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-gradient-to-br from-slate-900 via-[#1a1d2d] to-[#0f172a] w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 pointer-events-auto border border-white/10">
              {/* Header with gradient */}
              <div className="relative h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

                {/* Icon */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-2xl border-4 border-[#1a1d2d]">
                    <i className="fas fa-microchip text-4xl text-white"></i>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="pt-12 pb-8 px-8">
                {/* Title */}
                <h3 className="text-xl font-black text-white text-center mb-3">
                  {t.refresh_confirm_title}
                </h3>

                {/* Warning message */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                      <i className="fas fa-exclamation-triangle text-amber-400 text-sm"></i>
                    </div>
                    <div className="space-y-2">
                      <p className="text-amber-200 text-sm font-bold leading-relaxed">
                        {t.refresh_confirm_warning}
                      </p>
                      <ul className="text-amber-300/80 text-xs space-y-1">
                        <li className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                          <span>{t.refresh_confirm_time} <strong className="text-amber-200">30-60 秒</strong></span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                          <span>{t.refresh_confirm_token}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                          <span>{t.refresh_confirm_data}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 px-6 py-4 rounded-2xl font-black text-sm transition-all duration-300 border border-white/10 hover:border-white/20"
                  >
                    {t.refresh_confirm_cancel}
                  </button>
                  <button
                    onClick={handleConfirmRefresh}
                    className="flex-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white px-6 py-4 rounded-2xl font-black text-sm transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-bolt text-amber-300"></i>
                    {t.refresh_confirm_confirm}
                  </button>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 left-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-4 right-4 w-20 h-20 bg-pink-500/10 rounded-full blur-xl"></div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

// 深色统计卡片子组件
interface DarkStatCardProps {
  value: number;
  label: string;
  color: 'indigo' | 'purple' | 'pink' | 'emerald';
  icon: string;
}

const DarkStatCard: React.FC<DarkStatCardProps> = ({ value, label, color, icon }) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      hoverBorder: 'group-hover:border-indigo-500/40',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      iconShadow: 'shadow-indigo-500/30',
      text: 'text-indigo-400',
      gradient: 'from-indigo-400 to-indigo-300'
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      hoverBorder: 'group-hover:border-purple-500/40',
      iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      iconShadow: 'shadow-purple-500/30',
      text: 'text-purple-400',
      gradient: 'from-purple-400 to-purple-300'
    },
    pink: {
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      hoverBorder: 'group-hover:border-pink-500/40',
      iconBg: 'bg-gradient-to-br from-pink-500 to-pink-600',
      iconShadow: 'shadow-pink-500/30',
      text: 'text-pink-400',
      gradient: 'from-pink-400 to-pink-300'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      hoverBorder: 'group-hover:border-emerald-500/40',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      iconShadow: 'shadow-emerald-500/30',
      text: 'text-emerald-400',
      gradient: 'from-emerald-400 to-emerald-300'
    }
  };

  const theme = colorMap[color];

  return (
    <div className={`group relative rounded-[1.5rem] p-5 transition-all duration-500 hover:-translate-y-1.5 ${theme.bg} border ${theme.border} ${theme.hoverBorder}`}>
      {/* 角落装饰 */}
      <div className="absolute top-3 right-3 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>

      {/* 内容 */}
      <div className="relative">
        {/* 图标 */}
        <div className={`w-11 h-11 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-lg ${theme.iconShadow} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 mb-4`}>
          <i className={`fas ${icon} text-white text-sm`}></i>
        </div>

        {/* 数值 */}
        <div className={`text-3xl font-black bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent mb-1.5`}>
          {value}
        </div>

        {/* 标签 */}
        <div className={`text-[9px] ${theme.text} font-black uppercase tracking-wider`}>
          {label}
        </div>
      </div>
    </div>
  );
};

export default MarketAnalysisDaily;
