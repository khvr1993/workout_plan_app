import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useOverlay } from './useOverlay';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useOverlay(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0"
            style={{ background: 'var(--backdrop)' }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, transform: 'translateY(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            exit={{ opacity: 0, transform: 'translateY(8px)' }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative w-full max-w-sm rounded-md border border-border bg-surface p-5"
            style={{ boxShadow: 'var(--overlay-shadow)' }}
          >
            <h2 className="text-h2 text-text mb-2">{title}</h2>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}