import { create } from 'zustand';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface ToastItem {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastItem['tone']) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, tone }] }));
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, tone: ToastItem['tone'] = 'info') {
  useToastStore.getState().push(message, tone);
}

const icons = {
  info: <Info size={16} strokeWidth={1.5} className="text-text-secondary shrink-0" />,
  success: <CheckCircle2 size={16} strokeWidth={1.5} className="text-accent shrink-0" />,
  error: <AlertCircle size={16} strokeWidth={1.5} className="text-danger shrink-0" />,
};

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, transform: 'translateY(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            exit={{ opacity: 0, transform: 'translateY(8px)' }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            className="pointer-events-auto flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-[13px] text-text cursor-pointer w-full"
            style={{ boxShadow: 'var(--overlay-shadow)' }}
          >
            {icons[t.tone]}
            <span className="text-left">{t.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}