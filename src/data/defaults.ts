import type { Meta, Settings } from './types';
import { program } from './program';
import { todayLocal } from '../lib/date';

export const defaultSettings: Settings = {
  unit: 'kg',
  theme: 'dark',
  accent: 'emerald',
  weekStartsOn: 1,
  weeklyTarget: 3,
  scheduleMode: 'rotation',
  restTimerDefaultSec: 60,
  autoStartRestTimer: true,
  haptics: true,
  metronome: false,
  defaultPaused: false,
};

export function defaultMeta(): Meta {
  return {
    schemaVersion: 1,
    programStartDate: todayLocal(),
    nextDayId: program.days[0].id,
  };
}