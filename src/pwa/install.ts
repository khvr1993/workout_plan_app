import { useEffect } from 'react';
import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallState {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
  setDeferred: (e: BeforeInstallPromptEvent | null) => void;
  setInstalled: (v: boolean) => void;
}

export const useInstallStore = create<InstallState>((set) => ({
  deferred: null,
  installed:
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true),
  setDeferred: (deferred) => set({ deferred }),
  setInstalled: (installed) => set({ installed }),
}));

export function useInstallCapture() {
  const setDeferred = useInstallStore((s) => s.setDeferred);
  const setInstalled = useInstallStore((s) => s.setInstalled);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [setDeferred, setInstalled]);
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const { deferred, setDeferred } = useInstallStore.getState();
  if (!deferred) return 'unavailable';
  await deferred.prompt();
  const choice = await deferred.userChoice;
  if (choice.outcome === 'accepted') setDeferred(null);
  return choice.outcome;
}