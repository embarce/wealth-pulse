import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastType } from '../components/Toast';

export interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

// 默认显示时长（毫秒）
const DEFAULT_DURATIONS = {
  success: 3000,  // 成功：3秒
  error: 5000,    // 错误：5秒（给用户更多时间阅读）
  warning: 4000,  // 警告：4秒
  info: 3000,     // 信息：3秒
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    // 如果没有指定 duration，使用类型的默认值
    const finalDuration = duration ?? DEFAULT_DURATIONS[type];
    const newToast: Toast = { id, type, message, duration: finalDuration };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {/* Toast Container will be rendered in App.tsx */}
      <div id="toast-container-root">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast-item" data-toast-id={toast.id}>
            {/* Toast items will be rendered by ToastContainer component */}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Export a simple container to be used in App.tsx
export const ToastContainerWrapper: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-[10000] flex flex-col space-y-3 max-w-md w-full sm:w-auto pointer-events-none">
      {toasts.map((toast) => {
        const styles = {
          success: {
            bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            icon: 'fa-check-circle',
            shadow: 'shadow-emerald-500/30',
          },
          error: {
            bg: 'bg-gradient-to-br from-rose-500 to-rose-600',
            icon: 'fa-exclamation-circle',
            shadow: 'shadow-rose-500/30',
          },
          warning: {
            bg: 'bg-gradient-to-br from-amber-500 to-amber-600',
            icon: 'fa-exclamation-triangle',
            shadow: 'shadow-amber-500/30',
          },
          info: {
            bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
            icon: 'fa-info-circle',
            shadow: 'shadow-indigo-500/30',
          },
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`
              flex items-center space-x-3 px-4 sm:px-6 py-3 sm:py-4
              rounded-2xl sm:rounded-3xl
              shadow-2xl ${styles.shadow}
              ${styles.bg}
              text-white
              transform transition-all duration-300
              animate-in slide-in-from-right-full fade-in
              pointer-events-auto
              backdrop-blur-sm
              border border-white/20
              min-w-[300px] sm:min-w-[360px]
            `}
          >
            {/* 图标 */}
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/20 rounded-full">
              <i className={`fas ${styles.icon} text-base sm:text-lg`}></i>
            </div>

            {/* 消息内容 */}
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-bold tracking-wide leading-snug">
                {toast.message}
              </p>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={() => onRemove(toast.id)}
              className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-all active:scale-95"
              aria-label="关闭"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
};
