import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TempoCue } from '../components/workout/TempoCue';
import { WeightPicker } from '../components/workout/WeightPicker';
import { RestTimerSheet } from '../components/workout/RestTimerSheet';
import { useAppStore } from '../store/useAppStore';
import { program } from '../data/program';
import { defaultMeta, defaultSettings } from '../data/defaults';

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
}

describe('P0 freeze & interaction regressions', () => {
  beforeEach(() => {
    resetStore();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.style.overflow = '';
  });

  it('restores document.body.style.overflow when chaining two ConfirmDialogs', async () => {
    function ChainedDialogs() {
      const [first, setFirst] = useState(true);
      const [second, setSecond] = useState(false);
      return (
        <>
          <ConfirmDialog
            open={first}
            onClose={() => setFirst(false)}
            onConfirm={() => setSecond(true)}
            title="Step 1"
            body="First confirm"
            confirmLabel="Continue"
          />
          <ConfirmDialog
            open={second}
            onClose={() => setSecond(false)}
            onConfirm={() => undefined}
            title="Step 2"
            body="Second confirm"
            confirmLabel="Finish"
          />
        </>
      );
    }

    render(<ChainedDialogs />);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(document.body.style.overflow).toBe('');
  });

  it('falls back to 2s interval when TempoCue receives non-numeric tempo', () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const oscStart = vi.fn();
    const oscStop = vi.fn();

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => undefined);
      createOscillator() {
        return {
          frequency: { value: 0 },
          type: 'sine',
          connect: () => ({ connect: () => undefined }),
          start: oscStart,
          stop: oscStop,
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        };
      }
    }

    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;

    render(
      <TempoCue
        exercise={{
          id: 'custom-bad-tempo',
          name: 'Test',
          sets: 3,
          reps: { min: 8, max: 12, unit: 'reps' },
          tempo: 'slow-1-1-0',
          loadType: 'bodyweight',
          loadOptions: [],
          equipment: 'Bodyweight',
          execution: '',
          cue: '',
        }}
        metronomeEnabled
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle tempo metronome' }));
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    expect(oscStart).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(oscStart).toHaveBeenCalledTimes(2);
  });

  it('cancels WeightPicker long-press timer on pointercancel', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(
      <WeightPicker
        options={[10, 15]}
        value={10}
        unit="kg"
        label="Row round 1"
        onChange={onChange}
      />,
    );

    const btn = screen.getByRole('button', { name: '10' });
    fireEvent.pointerDown(btn);
    fireEvent.pointerCancel(btn);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByLabelText('Custom weight in kg')).not.toBeInTheDocument();
  });

  it('shows accurate remaining time on first frame when RestTimerSheet starts long after mount', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    render(<RestTimerSheet />);

    // Advance 20 minutes while timer is idle.
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
      useAppStore.getState().startRest(60);
    });

    expect(screen.getByText('1:00')).toBeInTheDocument();
  });
});
