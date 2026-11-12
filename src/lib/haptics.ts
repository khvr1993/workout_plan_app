export function vibrate(enabled: boolean, pattern: number | number[] = 10) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // unsupported platform
  }
}