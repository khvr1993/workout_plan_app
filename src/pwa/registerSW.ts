import { registerSW as register } from 'virtual:pwa-register';

let updateCallback: (() => void) | null = null;

export function registerSW() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  updateCallback = register({
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('sw-update-available'));
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('sw-offline-ready'));
    },
  });
}

export function applyUpdate() {
  updateCallback?.();
}