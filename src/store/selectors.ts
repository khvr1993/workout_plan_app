import { useAppStore } from './useAppStore';
import { nextDay } from '../lib/stats';

export function useNextDay() {
  const meta = useAppStore((s) => s.meta);
  const program = useAppStore((s) => s.program);
  return nextDay(meta, program);
}

export function useInProgressSession() {
  // A strength draft without a day cannot be resumed; do not send the user to
  // /session/undefined because of a malformed legacy record.
  return useAppStore(
    (s) => s.sessions.find((x) => x.status === 'in-progress' && Boolean(x.dayId)) ?? null,
  );
}

export function useUnit() {
  return useAppStore((s) => s.settings.unit);
}