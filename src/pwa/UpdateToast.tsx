import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { applyUpdate } from './registerSW';

export function UpdateToast() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const onUpdate = () => setAvailable(true);
    window.addEventListener('sw-update-available', onUpdate);
    return () => window.removeEventListener('sw-update-available', onUpdate);
  }, []);

  return (
    <AnimatePresence>
      {available && (
        <motion.div
          initial={{ opacity: 0, transform: 'translateY(8px)' }}
          animate={{ opacity: 1, transform: 'translateY(0)' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3"
          style={{ boxShadow: 'var(--overlay-shadow)' }}
          role="status"
        >
          <RefreshCw size={15} strokeWidth={1.5} className="text-accent" />
          <span className="text-[13px] text-text">New version available</span>
          <button
            type="button"
            onClick={() => applyUpdate()}
            className="h-8 rounded-sm bg-accent px-3 text-[13px] font-medium text-accent-fg hover:bg-accent-hover cursor-pointer"
          >
            Reload
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}