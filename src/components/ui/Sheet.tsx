import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useOverlay } from './useOverlay';
import { IconButton } from './IconButton';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Hide the close button when the sheet must be dismissed explicitly. */
  hideClose?: boolean;
}

export function Sheet({ open, onClose, title, children, hideClose }: SheetProps) {
  const ref = useOverlay(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
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
            initial={{ opacity: 0, transform: 'translateY(16px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            exit={{ opacity: 0, transform: 'translateY(16px)' }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative w-full sm:max-w-md max-h-[85dvh] overflow-y-auto rounded-t-md sm:rounded-md border border-border bg-surface safe-bottom"
            style={{ boxShadow: 'var(--overlay-shadow)' }}
          >
            {(title || !hideClose) && (
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <h2 className="text-h2 text-text">{title}</h2>
                {!hideClose && (
                  <IconButton label="Close" size="sm" onClick={onClose}>
                    <X size={18} strokeWidth={1.5} />
                  </IconButton>
                )}
              </div>
            )}
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}