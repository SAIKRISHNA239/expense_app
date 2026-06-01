import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const icon = (type: ToastType) => {
    if (type === 'success') return <CheckCircle2 className="w-4 h-4 shrink-0" />;
    if (type === 'error') return <XCircle className="w-4 h-4 shrink-0" />;
    return <AlertCircle className="w-4 h-4 shrink-0" />;
  };

  const colors = (type: ToastType) => {
    if (type === 'success') return 'toast-success';
    if (type === 'error') return 'toast-error';
    return 'toast-info';
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none safe-top"
        style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-item flex items-center gap-2.5 px-4 py-3 rounded-2xl border font-bold text-[13px] shadow-xl backdrop-blur-md ${colors(t.type)}`}
          >
            {icon(t.type)}
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
