import { describe, expect, it } from 'vitest';
import { program, allExercises, LOAD_OPTIONS } from '../data/program';

describe('program seed', () => {
  it('has 3 days with 16 exercises total', () => {
    expect(program.days).toHaveLength(3);
    expect(allExercises(program)).toHaveLength(16);
  });

  it('every exercise offers exactly the three selectable loads', () => {
    for (const ex of allExercises(program)) {
      expect(ex.loadOptions).toEqual(LOAD_OPTIONS);
    }
    expect(LOAD_OPTIONS).toEqual([7.5, 10, 15]);
  });

  it('every exercise has execution notes and a coach cue', () => {
    for (const ex of allExercises(program)) {
      expect(ex.execution.length).toBeGreaterThan(10);
      expect(ex.cue.length).toBeGreaterThan(10);
    }
  });

  it('superset blocks have two exercises, single blocks have one', () => {
    for (const day of program.days) {
      for (const block of day.blocks) {
        expect(block.exercises.length).toBe(block.superset ? 2 : 1);
      }
    }
  });

  it('day B block 1 is a 4-set tempo RDL', () => {
    const rdl = program.days[1].blocks[0].exercises[0];
    expect(rdl.id).toBe('tempo-db-rdl');
    expect(rdl.sets).toBe(4);
    expect(rdl.tempo).toBe('3-1-1-0');
  });

  it('day C block 1 is a superset (1.5-rep squat + hip thrust)', () => {
    const block = program.days[2].blocks[0];
    expect(block.superset).toBe(true);
    expect(block.exercises.map((e) => e.id)).toEqual([
      'one-and-half-db-squat',
      'weighted-bench-hip-thrust',
    ]);
  });
});