import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { LocalStorageAdapter, wrap, unwrap, STORAGE_KEYS } from './storage';
import { loadKey } from './migrations';
import { metaSchema, programSchema, sessionSchema, settingsSchema } from './schema';
import { defaultSettings } from './defaults';
import { buildExport, parseImport } from '../lib/export';
import { program } from './program';
import { defaultMeta } from './defaults';
import type { AppData } from './types';

describe('storage adapter', () => {
  it('round-trips values and notifies subscribers', () => {
    const adapter = new LocalStorageAdapter();
    let seen: unknown = null;
    const unsub = adapter.subscribe('wt:test', (v) => {
      seen = v;
    });
    adapter.set('wt:test', { a: 1 });
    expect(adapter.get('wt:test')).toEqual({ a: 1 });
    expect(seen).toEqual({ a: 1 });
    unsub();
    adapter.set('wt:test', { a: 2 });
    expect(seen).toEqual({ a: 1 });
  });

  it('returns null for corrupt JSON instead of throwing', () => {
    localStorage.setItem('wt:bad', '{not json');
    const adapter = new LocalStorageAdapter();
    expect(adapter.get('wt:bad')).toBeNull();
  });

  it('usageBytes counts only wt: keys', () => {
    localStorage.setItem('other', 'x'.repeat(1000));
    localStorage.setItem('wt:x', 'y'.repeat(10));
    const adapter = new LocalStorageAdapter();
    expect(adapter.usageBytes()).toBeLessThan(200);
  });
});

describe('envelope + migrations', () => {
  it('wraps and unwraps current version', () => {
    const env = wrap(defaultSettings);
    const { value, unknownVersion } = unwrap<typeof defaultSettings>(env);
    expect(unknownVersion).toBe(false);
    expect(value).toEqual(defaultSettings);
  });

  it('flags newer versions as read-only', () => {
    const res = loadKey({ v: 99, value: defaultSettings }, settingsSchema);
    expect(res.readOnly).toBe(true);
    expect(res.value).toBeNull();
  });

  it('flags corrupt payloads as read-only rather than overwriting', () => {
    const res = loadKey(wrap({ unit: 'stone' }), settingsSchema);
    expect(res.readOnly).toBe(true);
  });

  it('accepts a valid wrapped payload', () => {
    const res = loadKey(wrap(defaultSettings), settingsSchema);
    expect(res.readOnly).toBe(false);
    expect(res.value?.unit).toBe('kg');
  });
});

describe('import validation', () => {
  const data: AppData = {
    program,
    sessions: [],
    settings: defaultSettings,
    meta: defaultMeta(),
    progression: {},
  };

  it('accepts a well-formed export', () => {
    const result = parseImport(JSON.stringify(buildExport(data)));
    expect(result.ok).toBe(true);
  });

  it('rejects malformed JSON loudly', () => {
    const result = parseImport('{oops');
    expect(result.ok).toBe(false);
  });

  it('rejects foreign files', () => {
    const result = parseImport(JSON.stringify({ app: 'something-else', version: 1, data }));
    expect(result.ok).toBe(false);
  });

  it('rejects schema violations with a path', () => {
    const bad = {
      ...buildExport(data),
      data: { ...data, settings: { ...defaultSettings, unit: 'stones' } },
    };
    const result = parseImport(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('settings.unit');
  });

  it('rejects unsupported export versions', () => {
    const result = parseImport(JSON.stringify({ ...buildExport(data), version: 2 }));
    expect(result.ok).toBe(false);
  });
});

describe('storage keys', () => {
  it('uses the wt: namespace', () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(key.startsWith('wt:')).toBe(true);
    }
  });
});

describe('v1 → v2 day rename migration', () => {
  const legacyProgram = {
    ...program,
    days: program.days.map((d, i) => ({
      ...d,
      label: `Day ${'ABC'[i]}`,
      title: `Full Body ${'ABC'[i]}`,
    })),
  };

  const legacySessions = ['A', 'B', 'C'].map((letter, i) => ({
    id: `s-${letter.toLowerCase()}`,
    type: 'strength',
    date: `2026-11-0${i + 2}`,
    startedAt: `2026-11-0${i + 2}T08:00:00.000Z`,
    dayId: `day-${letter.toLowerCase()}`,
    dayLabel: `Day ${letter}`,
    status: i === 2 ? 'in-progress' : 'completed',
    blocks: [],
    unit: 'kg',
  }));

  it('renames program labels and titles while keeping ids stable', () => {
    const res = loadKey({ v: 1, value: legacyProgram }, programSchema);
    expect(res.readOnly).toBe(false);
    expect(res.value?.days.map((d) => d.label)).toEqual(['Day 1', 'Day 2', 'Day 3']);
    expect(res.value?.days.map((d) => d.title)).toEqual([
      'Full Body 1',
      'Full Body 2',
      'Full Body 3',
    ]);
    expect(res.value?.days.map((d) => d.id)).toEqual(['day-a', 'day-b', 'day-c']);
  });

  it('renames session dayLabel snapshots and leaves recovery walks alone', () => {
    const walk = {
      id: 's-walk',
      type: 'recovery',
      date: '2026-11-05',
      startedAt: '2026-11-05T09:00:00.000Z',
      status: 'completed',
      blocks: [],
      unit: 'kg',
    };
    const res = loadKey({ v: 1, value: [...legacySessions, walk] }, z.array(sessionSchema));
    expect(res.readOnly).toBe(false);
    expect(res.value?.map((s) => s.dayLabel)).toEqual(['Day 1', 'Day 2', 'Day 3', undefined]);
    expect(res.value?.map((s) => s.dayId)).toEqual(['day-a', 'day-b', 'day-c', undefined]);
  });

  it('passes meta through untouched so rotation state survives', () => {
    const meta = { ...defaultMeta(), nextDayId: 'day-c' };
    const res = loadKey({ v: 1, value: meta }, metaSchema);
    expect(res.readOnly).toBe(false);
    expect(res.value).toEqual(meta);
  });

  it('leaves custom day labels untouched', () => {
    const custom = {
      ...program,
      days: [{ ...program.days[0], id: 'custom-day', label: 'Push', title: 'Push Day' }],
    };
    const res = loadKey({ v: 1, value: custom }, programSchema);
    expect(res.readOnly).toBe(false);
    expect(res.value?.days[0].label).toBe('Push');
    expect(res.value?.days[0].title).toBe('Push Day');
  });
});

describe('v2 → v3 load options migration', () => {
  it('normalizes every loaded exercise to the three selectable loads', () => {
    const legacy = {
      ...program,
      days: program.days.map((d, i) => ({
        ...d,
        blocks: d.blocks.map((b, j) => ({
          ...b,
          exercises: b.exercises.map((e, k) => ({
            ...e,
            loadOptions: i === 0 && j === 0 && k === 0 ? [15] : [5, 7.5],
          })),
        })),
      })),
    };
    const res = loadKey({ v: 2, value: legacy }, programSchema);
    expect(res.readOnly).toBe(false);
    for (const day of res.value!.days) {
      for (const block of day.blocks) {
        for (const ex of block.exercises) {
          expect(ex.loadOptions).toEqual([7.5, 10, 15]);
        }
      }
    }
  });

  it('keeps bodyweight load-free and never rewrites logged session weights', () => {
    const bw = {
      ...program.days[0].blocks[0].exercises[0],
      id: 'bw-move',
      loadType: 'bodyweight',
      loadOptions: [],
    };
    const legacyProgram = {
      ...program,
      days: [
        { ...program.days[0], blocks: [{ ...program.days[0].blocks[0], exercises: [bw] }] },
      ],
    };
    const res = loadKey({ v: 2, value: legacyProgram }, programSchema);
    expect(res.readOnly).toBe(false);
    expect(res.value?.days[0].blocks[0].exercises[0].loadOptions).toEqual([]);

    const sessions = [
      {
        id: 's1',
        type: 'strength',
        date: '2026-11-01',
        startedAt: '2026-11-01T08:00:00.000Z',
        dayId: 'day-a',
        dayLabel: 'Day 1',
        status: 'completed',
        blocks: [
          {
            blockId: 'a-b1',
            restSeconds: 60,
            exercises: [
              {
                exerciseId: 'bulgarian-split-squat',
                exerciseName: 'Bulgarian Split Squat',
                sets: [{ weight: 5, reps: 10, completed: true }],
              },
            ],
          },
        ],
        unit: 'kg',
      },
    ];
    const sres = loadKey({ v: 2, value: sessions }, z.array(sessionSchema));
    expect(sres.readOnly).toBe(false);
    expect(sres.value?.[0].blocks[0].exercises[0].sets[0].weight).toBe(5);
  });
});