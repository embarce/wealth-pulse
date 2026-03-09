import React, { useContext, useState, useEffect } from 'react';
import { I18nContext } from '../App';
import { stockApi, HkStockAllNews, HkStockNews, HkStockImportantNews } from '../services/stockApi';

interface NewsPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type NewsTab = 'important' | 'rank' | 'company' | 'all';

const NewsPanelModal: React.FC<NewsPanelModalProps> = ({ isOpen, onClose }) => {
  const { t } = useContext(I18nContext);

  const [news, setNews] = useState<HkStockAllNews | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NewsTab>('all');
  const [filterText, setFilterText] = useState('');

  const loadNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await stockApi.getAllHkStockNews();
      setNews(data);
    } catch (err: any) {
      setError(err.message || t.news_panel_error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNews();
    }
  }, [isOpen]);

  const filterNews = <T extends { title: string }>(newsList: T[]): T[] => {
    if (!filterText.trim()) return newsList;
    return newsList.filter(item =>
      item.title.toLowerCase().includes(filterText.toLowerCase())
    );
  };

  const getFilteredNews = () => {
    if (!news) return [];

    switch (activeTab) {
      case 'important':
        return filterNews(news.importantNews || []);
      case 'rank':
        return filterNews(news.rankNews || []);
      case 'company':
        return filterNews(news.companyNews || []);
      case 'all':
      default:
        const allNews = [
          ...(news.importantNews || []).map(n => ({ ...n, type: 'important' as const })),
          ...(news.rankNews || []).map(n => ({ ...n, type: 'rank' as const })),
          ...(news.companyNews || []).map(n => ({ ...n, type: 'company' as const })),
        ];
        // Sort by publish time if available, otherwise keep original order
        return filterNews(allNews).sort((a, b) => {
          const timeA = (a as any).publishTime || '';
          const timeB = (b as any).publishTime || '';
          return timeB.localeCompare(timeA);
        });
    }
  };

  const filteredNews = getFilteredNews();

  const NewsItem: React.FC<{ item: HkStockImportantNews | HkStockNews & { type?: string }; type?: string }> = ({ item, type }) => {
    const isImportant = type === 'important' || !('publishTime' in item);

    return (
      <div className="bg-white border border-slate-100 rounded-xl p-4 hover:bg-slate-50 hover:border-indigo-200 transition-colors duration-150">
        <div className="flex items-start gap-3">
          {/* Type indicator */}
          <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
            type === 'important' ? 'bg-rose-500' :
            type === 'rank' ? 'bg-indigo-500' :
            'bg-emerald-500'
          }`} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-800 hover:text-indigo-600 line-clamp-2 leading-relaxed"
            >
              {item.title}
            </a>

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <i className="fas fa-newspaper"></i>
                {item.datasource || 'N/A'}
              </span>
              {'publishTime' in item && item.publishTime && (
                <span className="flex items-center gap-1">
                  <i className="fas fa-clock"></i>
                  {formatTime(item.publishTime)}
                </span>
              )}
            </div>
          </div>

          {/* External link icon */}
          <div className="text-slate-300 hover:text-indigo-400 transition-colors">
            <i className="fas fa-external-link-alt"></i>
          </div>
        </div>
      </div>
    );
  };

  const formatTime = (timeStr: string): string => {
    // Directly return the original time string without formatting
    return timeStr;
  };

  const tabs = [
    { key: 'all' as NewsTab, label: t.news_panel_all, count: news?.summary?.totalCount || 0, color: 'slate' },
    { key: 'important' as NewsTab, label: t.news_panel_important, count: news?.summary?.importantNewsCount || 0, color: 'rose' },
    { key: 'rank' as NewsTab, label: t.news_panel_rank, count: news?.summary?.rankNewsCount || 0, color: 'indigo' },
    { key: 'company' as NewsTab, label: t.news_panel_company, count: news?.summary?.companyNewsCount || 0, color: 'emerald' },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto flex flex-col">
          {/* Header */}
          <div className="px-6 lg:px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                <i className="fas fa-newspaper"></i>
              </div>
              <h3 className="text-lg lg:text-xl font-black text-slate-800">{t.news_panel_title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadNews}
                disabled={loading}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
              >
                <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 lg:px-8 py-4 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between gap-4">
              {/* Tab buttons */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-black transition-all flex items-center gap-2 ${
                      activeTab === tab.key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search filter */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t.news_panel_filter_placeholder}
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/50">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-3xl text-indigo-400 mb-4"></i>
                  <p className="text-slate-500 text-sm">{t.news_panel_loading}</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <i className="fas fa-exclamation-triangle text-3xl text-rose-400 mb-4"></i>
                  <p className="text-slate-500 text-sm">{error}</p>
                  <button
                    onClick={loadNews}
                    className="mt-4 bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-xl font-black text-sm transition-all"
                  >
                    <i className="fas fa-redo mr-2"></i>
                    {t.news_panel_refresh}
                  </button>
                </div>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <i className="fas fa-newspaper text-4xl text-slate-300 mb-4"></i>
                  <p className="text-slate-500 text-sm">{t.news_panel_empty}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNews.map((item, index) => (
                  <NewsItem
                    key={`${item.type || 'news'}-${item.title}-${index}`}
                    item={item}
                    type={item.type || activeTab}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 lg:px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="text-xs text-slate-400">
              {news?.warnings?.map((warning, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  <i className="fas fa-exclamation-circle text-amber-500"></i>
                  {warning}
                </span>
              ))}
            </div>
            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewsPanelModal;
