import { useAppStore } from './useAppStore';
import { nextDay } from '../lib/stats';

export function useNextDay() {
  const meta = useAppStore((s) => s.meta);
  const program = useAppStore((s) => s.program);
  return nextDay(meta, program);
}

export function useInProgressSession() {
  return useAppStore((s) => s.sessions.find((x) => x.status === 'in-progress') ?? null);
}

export function useUnit() {
  return useAppStore((s) => s.settings.unit);
}