import { registerSW as register } from 'virtual:pwa-register';

let updateCallback: (() => void) | null = null;
let pendingUpdate = false;
let swRegistration: ServiceWorkerRegistration | null = null;
let lastUpdateCheck = 0;
let updateChecksBound = false;

const UPDATE_CHECK_THROTTLE_MS = 5 * 60 * 1000;
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** True when an update was found before the toast listener mounted. */
export function hasPendingUpdate(): boolean {
  return pendingUpdate;
}

async function checkForUpdate(): Promise<void> {
  if (!swRegistration) return;
  const now = Date.now();
  if (now - lastUpdateCheck < UPDATE_CHECK_THROTTLE_MS) return;
  lastUpdateCheck = now;
  try {
    await swRegistration.update();
  } catch {
    // Offline or registration not ready; the next resume will retry.
  }
}

function bindUpdateChecks(registration: ServiceWorkerRegistration): void {
  swRegistration = registration;
  if (updateChecksBound) return;
  updateChecksBound = true;

  const onForeground = () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  };
  document.addEventListener('visibilitychange', onForeground);
  window.addEventListener('focus', onForeground);
  window.addEventListener('pageshow', onForeground);
  window.addEventListener('online', () => void checkForUpdate());
  window.setInterval(() => void checkForUpdate(), UPDATE_CHECK_INTERVAL_MS);
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
    onRegisteredSW(_swUrl, registration) {
      if (registration) bindUpdateChecks(registration);
    },
  });
}

export function applyUpdate() {
  pendingUpdate = false;
  updateCallback?.();
}
