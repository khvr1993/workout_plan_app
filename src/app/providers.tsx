import { useEffect, type ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ToastHost } from '../components/ui/Toast';
import { UpdateToast } from '../pwa/UpdateToast';
import { useInstallCapture } from '../pwa/install';
import { initAutoBackup } from '../store/useBackupStore';

function applyTheme(theme: 'system' | 'light' | 'dark', accent: string) {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.accent = accent;
}

export function Providers({ children }: { children: ReactNode }) {
  const theme = useAppStore((s) => s.settings.theme);
  const accent = useAppStore((s) => s.settings.accent);
  useInstallCapture();
  useEffect(() => initAutoBackup(), []);

  useEffect(() => {
    applyTheme(theme, accent);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyTheme('system', accent);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, accent]);

  return (
    <>
      {children}
      <ToastHost />
      <UpdateToast />
    </>
  );
}