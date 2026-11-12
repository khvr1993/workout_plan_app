import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DEMOS, demoImages, demoVideoUrl } from './demos';
import { program, allExercises } from './program';

const exercises = allExercises(program);

describe('exercise form demos', () => {
  it('covers every seed exercise', () => {
    expect(exercises).toHaveLength(16);
    for (const ex of exercises) {
      expect(DEMOS[ex.id], `missing demo for ${ex.id}`).toBeDefined();
    }
  });

  it('has well-formed steps for every demo', () => {
    for (const [id, demo] of Object.entries(DEMOS)) {
      expect(demo.steps.length, id).toBeGreaterThanOrEqual(3);
      expect(demo.source, id).toBeTruthy();
      expect(demo.videoQuery, id).toBeTruthy();
      const phases = new Set(demo.steps.map((s) => s.phase));
      expect(phases.has(0), id).toBe(true);
      expect(phases.has(1), id).toBe(true);
      for (const s of demo.steps) {
        expect(s.text.trim().length, id).toBeGreaterThan(10);
        expect([0, 1]).toContain(s.phase);
      }
    }
  });

  it('ships both photos for every demo in public/exercises', () => {
    for (const id of Object.keys(DEMOS)) {
      for (const i of [0, 1]) {
        const file = join(process.cwd(), 'public', 'exercises', id, `${i}.jpg`);
        expect(existsSync(file), file).toBe(true);
        expect(statSync(file).size, file).toBeGreaterThan(10_000);
      }
    }
  });

  it('builds base-aware image paths', () => {
    const [a, b] = demoImages('tempo-db-rdl');
    expect(a).toBe(`${import.meta.env.BASE_URL}exercises/tempo-db-rdl/0.jpg`);
    expect(b).toBe(`${import.meta.env.BASE_URL}exercises/tempo-db-rdl/1.jpg`);
  });

  it('builds an encoded YouTube search link', () => {
    const url = demoVideoUrl(DEMOS['one-and-half-db-squat']);
    expect(url).toBe(
      `https://www.youtube.com/results?search_query=${encodeURIComponent('1.5 rep dumbbell squat form')}`,
    );
  });

  it('flags equipment substitutions with a note', () => {
    expect(DEMOS['weighted-bench-hip-thrust'].note).toMatch(/dumbbell/i);
    expect(DEMOS['flat-bb-skull-crusher'].note).toMatch(/straight bar/i);
    expect(DEMOS['tempo-db-rdl'].note).toMatch(/3s/i);
  });
});