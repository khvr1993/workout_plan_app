import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { useAppStore } from '../store/useAppStore';
import { program } from '../data/program';
import { defaultMeta, defaultSettings } from '../data/defaults';
import { ENVELOPE_VERSION } from '../data/storage';

function resetStore() {
  useAppStore.setState({
    program,
    sessions: [],
    settings: defaultSettings,
    meta: defaultMeta(),
    progression: {},
    safeMode: false,
    storageIssue: null,
    storageNotice: null,
    storageError: null,
    restEndsAt: null,
    restTotalSec: 0,
  });
  window.location.hash = '#/';
}

beforeEach(resetStore);

describe('full session flow', () => {
  it('starts, logs a superset round, auto-starts one rest timer, finishes, advances rotation', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByText('Day 1 · Full Body 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start workout' }));

    // Session screen with warm-up and all three blocks
    expect(await screen.findByText('Bulgarian Split Squat')).toBeInTheDocument();
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
    expect(screen.getByText('Incline Dumbbell Press')).toBeInTheDocument();
    expect(screen.getByText('Chest-Supported Dumbbell Row')).toBeInTheDocument();

    // Single-exercise block: completing round 1 starts rest immediately
    await user.click(screen.getByRole('button', { name: 'Complete Bulgarian Split Squat round 1' }));
    expect(await screen.findByRole('timer')).toBeInTheDocument();
    expect(useAppStore.getState().restEndsAt).not.toBeNull();

    // Skip rest
    await user.click(screen.getByRole('button', { name: /Skip rest/ }));
    await waitFor(() => expect(screen.queryByRole('timer')).not.toBeInTheDocument());

    // Superset: first half does NOT start the timer
    await user.click(screen.getByRole('button', { name: 'Complete Incline Dumbbell Press round 1' }));
    expect(useAppStore.getState().restEndsAt).toBeNull();

    // Second half completes the round → exactly one timer
    await user.click(screen.getByRole('button', { name: 'Complete Chest-Supported Dumbbell Row round 1' }));
    expect(await screen.findByRole('timer')).toBeInTheDocument();
    const endsAt = useAppStore.getState().restEndsAt!;
    expect(endsAt).toBeGreaterThan(Date.now() + 55_000);

    // Finish → summary → save
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(await screen.findByText('Finish workout')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '8' })); // RPE
    await user.click(screen.getByRole('button', { name: 'Save workout' }));

    // Lands on session detail, rotation advanced exactly once
    await waitFor(() => expect(useAppStore.getState().meta.nextDayId).toBe('day-b'));
    const session = useAppStore.getState().sessions[0];
    expect(session.status).toBe('completed');
    expect(session.rpe).toBe(8);
    expect(await screen.findByRole('heading', { name: 'Day 1' })).toBeInTheDocument();
  });

  it('recovers an in-progress draft with logged sets after remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Start workout' }));
    await screen.findByText('Bulgarian Split Squat');

    await user.click(screen.getByRole('button', { name: 'Complete Bulgarian Split Squat round 2' }));
    const sessionId = useAppStore.getState().sessions[0].id;
    unmount();

    // Simulate app kill + reopen at the same route
    window.location.hash = '#/session/day-a';
    render(<App />);
    expect(await screen.findByText('Bulgarian Split Squat')).toBeInTheDocument();
    const state = useAppStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].id).toBe(sessionId);
    const entry = state.sessions[0].blocks[0].exercises[0].sets[1];
    expect(entry.completed).toBe(true);
    // The check renders pressed
    expect(
      screen.getByRole('button', { name: 'Complete Bulgarian Split Squat round 2' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('settles on the first draft when two in-progress workouts already exist', async () => {
    useAppStore.getState().startSession('day-a');
    useAppStore.getState().startSession('day-b');
    window.location.hash = '#/session/day-b';
    render(<App />);

    // The second draft must redirect to the first, not ping-pong forever.
    expect(await screen.findByText('Bulgarian Split Squat')).toBeInTheDocument();
    expect(
      useAppStore.getState().sessions.filter((s) => s.status === 'in-progress'),
    ).toHaveLength(2);
  });

  it('discarding a workout keeps it as abandoned and does not advance rotation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Start workout' }));
    await screen.findByText('Bulgarian Split Squat');

    await user.click(screen.getByRole('button', { name: 'Close workout' }));
    expect(await screen.findByText('Discard this workout?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    await waitFor(() => expect(useAppStore.getState().sessions[0].status).toBe('abandoned'));
    expect(useAppStore.getState().meta.nextDayId).toBe('day-a');
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
  });
});

describe('program editing', () => {
  it('adds a library exercise from the picker and turns the block into a superset', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/program/day-a';
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add to Block 1' });
    await user.click(within(dialog).getByRole('button', { name: /Tempo Dumbbell RDL/ }));

    await waitFor(() => {
      const block = useAppStore.getState().program.days[0].blocks[0];
      expect(block.exercises).toHaveLength(2);
      expect(block.superset).toBe(true);
    });
    expect(useAppStore.getState().program.days[0].blocks[0].exercises[1].id).toBe('tempo-db-rdl');
  });

  it('adds a custom exercise with full details and persists it', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/program/day-a';
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));
    const picker = await screen.findByRole('dialog', { name: 'Add to Block 1' });
    await user.click(within(picker).getByRole('button', { name: 'Create custom exercise' }));

    const dialog = screen.getByRole('dialog', { name: 'New exercise' });
    await user.type(within(dialog).getByLabelText('Name'), 'Farmer Carry');
    await user.type(within(dialog).getByLabelText(/Tempo/), '3-0-1-0');
    await user.type(within(dialog).getByLabelText(/Equipment/), '15 kg DBs');
    await user.type(within(dialog).getByLabelText(/Execution/), 'Walk tall for 40 steps.');
    await user.type(within(dialog).getByLabelText(/Coach cue/), 'Brace, ribs down.');
    await user.click(within(dialog).getByRole('button', { name: 'Add exercise' }));

    await waitFor(() => {
      expect(useAppStore.getState().program.days[0].blocks[0].exercises).toHaveLength(2);
    });
    const block = useAppStore.getState().program.days[0].blocks[0];
    expect(block.superset).toBe(true);
    expect(block.exercises[1]).toMatchObject({
      name: 'Farmer Carry',
      sets: 3,
      reps: { min: 10, max: 12, unit: 'reps' },
      tempo: '3-0-1-0',
      loadType: 'dumbbells',
      loadOptions: [7.5, 10, 15],
      equipment: '15 kg DBs',
      execution: 'Walk tall for 40 steps.',
      cue: 'Brace, ribs down.',
    });

    const env = JSON.parse(localStorage.getItem('wt:program')!);
    expect(env.v).toBe(ENVELOPE_VERSION);
    expect(env.value.days[0].blocks[0].exercises[1].name).toBe('Farmer Carry');

    expect(await screen.findByText('Farmer Carry')).toBeInTheDocument();
  });

  it('creates a new block with a bodyweight exercise', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/program/day-a';
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'New block' }));
    const dialog = await screen.findByRole('dialog', { name: 'New block' });
    await user.type(within(dialog).getByLabelText('Name'), 'Push-up');
    await user.click(within(dialog).getByRole('button', { name: 'Bodyweight' }));
    await user.click(within(dialog).getByRole('button', { name: 'Create block' }));

    await waitFor(() => expect(useAppStore.getState().program.days[0].blocks).toHaveLength(4));
    const block = useAppStore.getState().program.days[0].blocks[3];
    expect(block.label).toBe('Block 4');
    expect(block.superset).toBe(false);
    expect(block.restSeconds).toBe(60);
    expect(block.exercises[0]).toMatchObject({
      name: 'Push-up',
      loadType: 'bodyweight',
      loadOptions: [],
    });
    expect(await screen.findByText('Block 4')).toBeInTheDocument();
  });
});