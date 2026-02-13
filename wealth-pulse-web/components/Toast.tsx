import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// 默认显示时长（毫秒）
export const DEFAULT_DURATIONS = {
  success: 3000,  // 成功：3秒
  error: 5000,    // 错误：5秒（给用户更多时间阅读）
  warning: 4000,  // 警告：4秒
  info: 3000,     // 信息：3秒
};

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || DEFAULT_DURATIONS[toast.type]);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, toast.type, onRemove]);

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
      style={{ animationDuration: '300ms' }}
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
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return createPortal(
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col space-y-3 max-w-md w-full sm:w-auto pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>,
    document.body
  );
};

export default ToastContainer;
