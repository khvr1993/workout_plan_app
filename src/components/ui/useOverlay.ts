import { useEffect, useRef } from 'react';

let activeOverlayLocks = 0;
let savedBodyOverflow = '';

/** Escape-to-close, body scroll lock, and focus restore for overlays. */
export function useOverlay(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    if (activeOverlayLocks === 0) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeOverlayLocks += 1;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === 'Tab' && ref.current) {
        const focusables = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const t = window.setTimeout(() => {
      // Respect autoFocus: never steal focus from a field the user may already be typing in.
      if (ref.current && !ref.current.contains(document.activeElement)) {
        ref.current.querySelector<HTMLElement>('button, input, [tabindex]')?.focus();
      }
    }, 50);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      activeOverlayLocks = Math.max(0, activeOverlayLocks - 1);
      if (activeOverlayLocks === 0) {
        document.body.style.overflow = savedBodyOverflow;
      }
      window.clearTimeout(t);
      if (previous?.isConnected) {
        previous.focus?.();
      }
    };
  }, [open]);

  return ref;
}