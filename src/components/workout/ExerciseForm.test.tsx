import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExerciseForm } from './ExerciseForm';
import { exerciseSchema } from '../../data/schema';
import type { Exercise } from '../../data/types';

function setup() {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(<ExerciseForm onSubmit={onSubmit} onCancel={onCancel} />);
  return { user, onSubmit, onCancel };
}

describe('ExerciseForm', () => {
  it('submits a schema-valid exercise with sensible defaults', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Name'), 'Farmer Carry');
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const ex: Exercise = onSubmit.mock.calls[0][0];
    expect(exerciseSchema.safeParse(ex).success).toBe(true);
    expect(ex.name).toBe('Farmer Carry');
    expect(ex.sets).toBe(3);
    expect(ex.reps).toEqual({ min: 10, max: 12, unit: 'reps' });
    expect(ex.loadType).toBe('dumbbells');
    expect(ex.loadOptions).toEqual([7.5, 10, 15]);
    expect(ex.id).toMatch(/^custom-farmer-carry-/);
    expect(ex.tempo).toBeUndefined();
  });

  it('requires a name', async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Give the exercise a name.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('collects every detail: volume, unit, tempo, load, equipment, notes', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Name'), '  Zercher Carry  ');
    await user.click(screen.getByRole('button', { name: 'Increase Sets' }));
    await user.click(screen.getByRole('button', { name: 'Increase Minimum reps' }));
    await user.click(screen.getByRole('button', { name: 'Increase Maximum reps' }));
    await user.click(screen.getByRole('button', { name: 'Per leg' }));
    await user.type(screen.getByLabelText(/Tempo/), '3-1-1-0');
    await user.click(screen.getByRole('button', { name: 'Barbell' }));
    await user.click(screen.getByRole('button', { name: 'Toggle 7.5 kg' }));
    await user.type(screen.getByLabelText('Custom weight in kg'), '20');
    await user.click(screen.getByRole('button', { name: 'Add weight' }));
    await user.type(screen.getByLabelText(/Equipment/), '20 kg barbell');
    await user.type(screen.getByLabelText(/Execution/), 'Walk tall, brace hard.');
    await user.type(screen.getByLabelText(/Coach cue/), 'Ribs down.');
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const ex: Exercise = onSubmit.mock.calls[0][0];
    expect(ex).toMatchObject({
      name: 'Zercher Carry',
      sets: 4,
      reps: { min: 11, max: 13, unit: 'perLeg' },
      tempo: '3-1-1-0',
      loadType: 'barbell',
      loadOptions: [10, 15, 20],
      equipment: '20 kg barbell',
      execution: 'Walk tall, brace hard.',
      cue: 'Ribs down.',
    });
    expect(exerciseSchema.safeParse(ex).success).toBe(true);
  });

  it('requires at least one weight for loaded movements', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Name'), 'Row');
    for (const kg of [7.5, 10, 15]) {
      await user.click(screen.getByRole('button', { name: `Toggle ${kg} kg` }));
    }
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pick at least one weight');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('supports bodyweight with no load options', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Name'), 'Push-up');
    await user.click(screen.getByRole('button', { name: 'Bodyweight' }));
    expect(screen.queryByRole('button', { name: 'Toggle 7.5 kg' })).not.toBeInTheDocument();
    expect(screen.getByText(/No load needed/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const ex: Exercise = onSubmit.mock.calls[0][0];
    expect(ex.loadType).toBe('bodyweight');
    expect(ex.loadOptions).toEqual([]);
  });

  it('validates tempo format and the 2–4s eccentric constraint', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Name'), 'Curl');
    const tempoInput = screen.getByLabelText(/Tempo/);
    await user.type(tempoInput, 'fast');
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('3-1-1-0');
    await user.clear(tempoInput);
    await user.type(tempoInput, '5-0-1-0');
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('2–4s');
    expect(onSubmit).not.toHaveBeenCalled();
    await user.clear(tempoInput);
    await user.type(tempoInput, '4-0-1-0');
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].tempo).toBe('4-0-1-0');
  });

  it('rejects invalid custom weights', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Custom weight in kg'), '-5');
    await user.click(screen.getByRole('button', { name: 'Add weight' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('positive weight');
    expect(screen.queryByRole('button', { name: 'Toggle -5 kg' })).not.toBeInTheDocument();
  });

  it('links to the free-exercise-db reference library', () => {
    setup();
    const link = screen.getByRole('link', { name: /free-exercise-db/ });
    expect(link).toHaveAttribute('href', 'https://yuhonas.github.io/free-exercise-db/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('calls onCancel', async () => {
    const { user, onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});