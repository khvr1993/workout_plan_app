import { registerSW as register } from 'virtual:pwa-register';

let updateCallback: (() => void) | null = null;
let pendingUpdate = false;

/** True when an update was found before the toast listener mounted. */
export function hasPendingUpdate(): boolean {
  return pendingUpdate;
}

export function registerSW() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  updateCallback = register({
    onNeedRefresh() {
      pendingUpdate = true;
      window.dispatchEvent(new CustomEvent('sw-update-available'));
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('sw-offline-ready'));
    },
  });
}

export function applyUpdate() {
  pendingUpdate = false;
  updateCallback?.();
}