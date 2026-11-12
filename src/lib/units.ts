import type { Unit } from '../data/types';

const KG_PER_LB = 0.45359237;

export function toDisplay(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

export function fromDisplay(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function formatWeight(kg: number | null | undefined, unit: Unit): string {
  if (kg == null) return '—';
  const v = toDisplay(kg, unit);
  const rounded = Math.round(v * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} ${unit}`;
}

export function formatWeightNumber(kg: number, unit: Unit): string {
  const v = Math.round(toDisplay(kg, unit) * 10) / 10;
  return v % 1 === 0 ? v.toFixed(0) : v.toFixed(1);
}

export function formatVolume(kg: number, unit: Unit): string {
  const v = toDisplay(kg, unit);
  return `${Math.round(v).toLocaleString()} ${unit}`;
}

/** For values already stored in `unit` (e.g. a session's logged sets) — no conversion. */
export function formatStored(value: number | null | undefined, unit: Unit): string {
  if (value == null) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} ${unit}`;
}