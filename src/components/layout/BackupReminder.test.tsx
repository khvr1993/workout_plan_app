import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { defaultMeta, defaultSettings } from '../../data/defaults';
import { program } from '../../data/program';
import { ENVELOPE_VERSION, STORAGE_KEYS, type Envelope } from '../../data/storage';
import type { AppData, Meta } from '../../data/types';
import { downloadJson, parseImport } from '../../lib/export';
import Settings from '../../screens/Settings';
import { useAppStore } from '../../store/useAppStore';
import { useBackupStore } from '../../store/useBackupStore';
import { useToastStore } from '../ui/Toast';
import { BackupReminder, REMIND_AFTER_DAYS } from './BackupReminder';

vi.mock('../../lib/export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/export')>();
  return { ...actual, downloadJson: vi.fn() };
});

const download = vi.mocked(downloadJson);

function resetStore() {
  useAppStore.setState({
    program,
    sessions: [],
    settings: defaultSettings,
    meta: defaultMeta(),
    progression: {},
    safeMode: false,
    storageError: null,
    restEndsAt: null,
    restTotalSec: 0,
  });
}

function storedMeta(): Envelope<Meta> {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.meta)!);
}

function reminder() {
  return screen.queryByRole('region', { name: 'Backup reminder' });
}

function daysAgoLocal(days: number, hour = 10): string {
  return new Date(2026, 0, 15 - days, hour).toISOString();
}

let enableMock: ReturnType<typeof vi.fn<() => Promise<void>>>;
let reconnectMock: ReturnType<typeof vi.fn<() => Promise<void>>>;

beforeEach(() => {
  vi.useFakeTimers();
  // Numeric constructors deliberately use local calendar dates, not UTC dates.
  vi.setSystemTime(new Date(2026, 0, 15, 12));
  download.mockReset();
  resetStore();
  useToastStore.setState({ toasts: [] });
  enableMock = vi.fn(async () => {});
  reconnectMock = vi.fn(async () => {});
  useBackupStore.setState({
    status: 'unsupported',
    fileName: null,
    error: null,
    busy: false,
    enable: enableMock,
    reconnect: reconnectMock,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  useToastStore.setState({ toasts: [] });
});

describe('BackupReminder scheduling', () => {
  it('shows the reminder when no backup exists, with export and a 3-day snooze', () => {
    render(<BackupReminder />);

    expect(reminder()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export backup' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Remind me in 3 days' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Enable auto-backup' })).not.toBeInTheDocument();
    expect(screen.getByText(/Save a JSON copy to Files or Downloads/)).toBeInTheDocument();
    expect(REMIND_AFTER_DAYS).toBe(3);
    expect(download).not.toHaveBeenCalled();
  });

  it('offers to enable automatic backup when the browser supports it', () => {
    useBackupStore.setState({ status: 'off' });
    render(<BackupReminder />);

    fireEvent.click(screen.getByRole('button', { name: 'Enable auto-backup' }));

    expect(enableMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/overwrite one file daily/i)).toBeInTheDocument();
  });

  it.each([0, 1, 2])('stays hidden %i day(s) after the last backup', (days) => {
    useAppStore.getState().markBackup(daysAgoLocal(days));
    render(<BackupReminder />);
    expect(reminder()).not.toBeInTheDocument();
  });

  it.each([3, 10])('returns %i days after the last backup', (days) => {
    useAppStore.getState().markBackup(daysAgoLocal(days));
    render(<BackupReminder />);
    expect(reminder()).toBeInTheDocument();
  });

  it('persists a dismissal as a local date and stays hidden after restoring it and remounting', () => {
    const { unmount } = render(<BackupReminder />);

    fireEvent.click(screen.getByRole('button', { name: 'Remind me in 3 days' }));

    expect(reminder()).not.toBeInTheDocument();
    expect(useAppStore.getState().meta.backupReminderDismissedOn).toBe('2026-01-15');
    expect(useAppStore.getState().meta.lastBackupAt).toBeUndefined();
    const persisted = storedMeta();
    expect(persisted).toEqual({
      v: ENVELOPE_VERSION,
      value: { ...defaultMeta(), backupReminderDismissedOn: '2026-01-15' },
    });

    unmount();
    resetStore();
    useAppStore.setState({ meta: persisted.value });
    render(<BackupReminder />);

    expect(reminder()).not.toBeInTheDocument();
    expect(download).not.toHaveBeenCalled();
  });

  it.each([1, 2])('stays hidden %i day(s) after a dismissal', (days) => {
    useAppStore.setState({
      meta: { ...defaultMeta(), backupReminderDismissedOn: daysAgoLocal(days).slice(0, 10) },
    });
    render(<BackupReminder />);
    expect(reminder()).not.toBeInTheDocument();
  });

  it.each([3, 5])('returns %i days after a dismissal', (days) => {
    useAppStore.setState({
      meta: { ...defaultMeta(), backupReminderDismissedOn: daysAgoLocal(days).slice(0, 10) },
    });
    render(<BackupReminder />);
    expect(reminder()).toBeInTheDocument();
  });

  it('snoozes across midnight and returns exactly three local days after each dismissal', () => {
    vi.setSystemTime(new Date(2026, 0, 15, 23, 59, 59, 500));
    render(<BackupReminder />);
    fireEvent.click(screen.getByRole('button', { name: 'Remind me in 3 days' }));

    act(() => vi.advanceTimersByTime(500));
    expect(new Date()).toEqual(new Date(2026, 0, 16));
    expect(reminder()).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(new Date(2026, 0, 18).getTime() - Date.now()));
    expect(reminder()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remind me in 3 days' }));
    expect(storedMeta().value.backupReminderDismissedOn).toBe('2026-01-18');
    expect(reminder()).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(new Date(2026, 0, 21).getTime() - Date.now()));
    expect(reminder()).toBeInTheDocument();
    expect(download).not.toHaveBeenCalled();
  });

  it('returns at local midnight three days after the last backup, not before', () => {
    vi.setSystemTime(new Date(2026, 0, 15, 23, 59, 59, 500));
    useAppStore.getState().markBackup(new Date(2026, 0, 15, 0, 1).toISOString());
    render(<BackupReminder />);

    act(() => vi.advanceTimersByTime(500));
    expect(new Date()).toEqual(new Date(2026, 0, 16));
    expect(reminder()).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(new Date(2026, 0, 18).getTime() - Date.now()));
    expect(reminder()).toBeInTheDocument();
  });

  it.each([
    { event: 'focus', reason: 'dismissal' },
    { event: 'visibilitychange', reason: 'dismissal' },
    { event: 'focus', reason: 'backup' },
    { event: 'visibilitychange', reason: 'backup' },
  ])('refreshes on $event after resuming three days past a same-day $reason', ({ event, reason }) => {
    if (reason === 'backup') {
      useAppStore.getState().markBackup(new Date().toISOString());
    } else {
      useAppStore.getState().dismissBackupReminder();
    }
    render(<BackupReminder />);
    expect(reminder()).not.toBeInTheDocument();

    // Move the wall clock without running the midnight timer, as on a suspended tab.
    act(() => vi.setSystemTime(new Date(2026, 0, 18, 8)));
    expect(reminder()).not.toBeInTheDocument();
    fireEvent(event === 'focus' ? window : document, new Event(event));

    expect(reminder()).toBeInTheDocument();
    expect(download).not.toHaveBeenCalled();
  });

  it.each(['not-a-date', '2026-99-99', ''])('treats invalid lastBackupAt %j as stale without crashing', (lastBackupAt) => {
    useAppStore.setState({ meta: { ...defaultMeta(), lastBackupAt } });
    expect(() => render(<BackupReminder />)).not.toThrow();
    expect(reminder()).toBeInTheDocument();
  });

  it.each(['garbage', ''])('ignores an invalid dismissal date %j', (dismissedOn) => {
    useAppStore.setState({ meta: { ...defaultMeta(), backupReminderDismissedOn: dismissedOn } });
    render(<BackupReminder />);
    expect(reminder()).toBeInTheDocument();
  });

  it('suppresses the reminder in safe mode without changing backup metadata', () => {
    const metaBefore = useAppStore.getState().meta;
    const persistedBefore = localStorage.getItem(STORAGE_KEYS.meta);
    useAppStore.setState({ safeMode: true });
    render(<BackupReminder />);

    expect(reminder()).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(new Date(2026, 0, 20).getTime() - Date.now()));
    fireEvent.focus(window);
    fireEvent(document, new Event('visibilitychange'));
    expect(reminder()).not.toBeInTheDocument();
    expect(useAppStore.getState().meta).toBe(metaBefore);
    expect(localStorage.getItem(STORAGE_KEYS.meta)).toBe(persistedBefore);
    expect(download).not.toHaveBeenCalled();

    act(() => useAppStore.setState({ safeMode: false }));
    expect(reminder()).toBeInTheDocument();
  });

  it('stays hidden while automatic backup is on, even with stale backup metadata', () => {
    useBackupStore.setState({ status: 'on', fileName: 'workout-backup.json' });
    render(<BackupReminder />);
    expect(reminder()).not.toBeInTheDocument();

    act(() => useBackupStore.setState({ status: 'off' }));
    expect(reminder()).toBeInTheDocument();
  });

  it('shows a reconnect action when automatic backup lost write permission', () => {
    useBackupStore.setState({ status: 'needs-permission', fileName: 'workout-backup.json' });
    render(<BackupReminder />);

    expect(screen.getByText('Automatic backup is paused')).toBeInTheDocument();
    expect(screen.getByText(/workout-backup\.json/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));
    expect(reconnectMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Export backup' })).toBeEnabled();
  });

  it('surfaces the automatic backup error and points at Settings', () => {
    useBackupStore.setState({
      status: 'error',
      error: 'The backup file could not be found. Choose it again.',
    });
    render(<BackupReminder />);

    expect(screen.getByText('Automatic backup needs attention')).toBeInTheDocument();
    expect(screen.getByText(/could not be found/)).toBeInTheDocument();
    expect(screen.getByText(/Settings → Data/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reconnect' })).not.toBeInTheDocument();
  });

  it('disables automation actions while a backup write is in flight', () => {
    useBackupStore.setState({ status: 'off', busy: true });
    render(<BackupReminder />);
    expect(screen.getByRole('button', { name: 'Enable auto-backup' })).toBeDisabled();
  });

  it('cleans up its midnight timer and foreground listeners on unmount', () => {
    const { unmount } = render(<BackupReminder />);
    const timersBeforeUnmount = vi.getTimerCount();

    unmount();
    expect(vi.getTimerCount()).toBe(timersBeforeUnmount - 1);
    fireEvent.focus(window);
    fireEvent(document, new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(timersBeforeUnmount - 1);
    expect(download).not.toHaveBeenCalled();
  });
});

describe('BackupExportButton', () => {
  it('exports every current AppData slice with the new timestamp, roundtrips through parseImport, then persists the timestamp', () => {
    vi.setSystemTime(new Date(2026, 0, 15, 0, 1));
    const editedProgram = structuredClone(program);
    editedProgram.name = 'My edited program';
    editedProgram.days[0].blocks[0].exercises[0].cue = 'Keep the custom coaching cue';
    useAppStore.getState().setProgram(editedProgram);
    useAppStore.getState().updateSettings({ unit: 'lb', accent: 'indigo', weeklyTarget: 4 });
    const session = useAppStore.getState().startSession('day-a');
    const block = session.blocks[0];
    const exercise = block.exercises[0];
    useAppStore.getState().updateSet(session.id, block.blockId, exercise.exerciseId, 0, {
      weight: 30,
      reps: 12,
      completed: true,
      paused: true,
    });
    useAppStore.getState().finishSession(session.id, { rpe: 8, notes: 'Backup these notes' });
    useAppStore.getState().setProgression(exercise.exerciseId, { stage: 'tempo', tempoSeconds: 3, weeksAtStage: 2 });
    useAppStore.getState().logRecovery('2026-01-14', 'Recovery walk');
    useAppStore.getState().startSession('day-b');
    useAppStore.setState({
      meta: {
        ...useAppStore.getState().meta,
        lastBackupAt: new Date(2026, 0, 10, 10).toISOString(),
        backupReminderDismissedOn: '2026-01-10',
      },
    });
    render(<BackupReminder />);
    // An edit after mount must be included in the one-tap snapshot too.
    act(() => useAppStore.getState().updateSettings({ haptics: false }));
    const state = useAppStore.getState();
    const exportedAt = new Date().toISOString();
    const expectedData: AppData = {
      program: state.program,
      sessions: state.sessions,
      settings: state.settings,
      meta: { ...state.meta, lastBackupAt: exportedAt },
      progression: state.progression,
    };
    const persistedBefore = localStorage.getItem(STORAGE_KEYS.meta);
    let metaAtDownload: Meta | undefined;
    let persistedAtDownload: string | null | undefined;
    download.mockImplementationOnce(() => {
      metaAtDownload = useAppStore.getState().meta;
      persistedAtDownload = localStorage.getItem(STORAGE_KEYS.meta);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Export backup' }));

    expect(download).toHaveBeenCalledExactlyOnceWith('workout-export-2026-01-15.json', {
      app: 'workout-tracker',
      version: 1,
      exportedAt,
      data: expectedData,
    });
    expect(metaAtDownload).toBe(state.meta);
    expect(persistedAtDownload).toBe(persistedBefore);
    const payload = download.mock.calls[0][1];
    const imported = parseImport(JSON.stringify(payload));
    expect(imported).toEqual({ ok: true, data: JSON.parse(JSON.stringify(expectedData)) });
    expect(useAppStore.getState().meta).toEqual(expectedData.meta);
    expect(storedMeta()).toEqual({ v: ENVELOPE_VERSION, value: expectedData.meta });
    expect(reminder()).not.toBeInTheDocument();
    expect(useToastStore.getState().toasts.at(-1)?.message).toMatch(/saving is not confirmed/i);

    if (!imported.ok) throw new Error(imported.error);
    cleanup();
    resetStore();
    useAppStore.getState().importAll(imported.data);
    for (const key of Object.keys(STORAGE_KEYS) as Array<keyof AppData>) {
      expect(useAppStore.getState()[key]).toEqual(imported.data[key]);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS[key])!)).toEqual({
        v: ENVELOPE_VERSION,
        value: imported.data[key],
      });
    }
    render(<BackupReminder />);
    expect(reminder()).not.toBeInTheDocument();
  });

  it.each([undefined, new Date(2026, 0, 10, 10).toISOString()])(
    'does not mark a backup or hide the reminder when download initiation fails (previous: %s)',
    (lastBackupAt) => {
      useAppStore.setState({ meta: { ...defaultMeta(), lastBackupAt } });
      const metaBefore = useAppStore.getState().meta;
      const persistedBefore = localStorage.getItem(STORAGE_KEYS.meta);
      download.mockImplementationOnce(() => {
        throw new Error('Browser blocked the download');
      });
      render(<BackupReminder />);

      fireEvent.click(screen.getByRole('button', { name: 'Export backup' }));

      expect(download).toHaveBeenCalledTimes(1);
      expect(reminder()).toBeInTheDocument();
      expect(useAppStore.getState().meta).toBe(metaBefore);
      expect(localStorage.getItem(STORAGE_KEYS.meta)).toBe(persistedBefore);
      expect(useToastStore.getState().toasts.at(-1)).toMatchObject({
        tone: 'error',
        message: 'Could not start the export. Please try again.',
      });

      fireEvent.click(screen.getByRole('button', { name: 'Export backup' }));
      expect(download).toHaveBeenCalledTimes(2);
      expect(useAppStore.getState().meta.lastBackupAt).toBe(new Date().toISOString());
      expect(reminder()).not.toBeInTheDocument();
    },
  );

  it('uses the shared Settings Export button to persist a backup and suppress the mounted reminder', () => {
    const { unmount } = render(
      <>
        <BackupReminder />
        <Settings />
      </>,
    );
    expect(reminder()).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    const exportedAt = new Date().toISOString();
    expect(download).toHaveBeenCalledTimes(1);
    expect(parseImport(JSON.stringify(download.mock.calls[0][1]))).toMatchObject({
      ok: true,
      data: { meta: { lastBackupAt: exportedAt } },
    });
    expect(useAppStore.getState().meta.lastBackupAt).toBe(exportedAt);
    expect(storedMeta().value.lastBackupAt).toBe(exportedAt);
    expect(reminder()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
    expect(screen.getByText(/Last backup/)).toBeInTheDocument();

    unmount();
    render(<BackupReminder />);
    expect(reminder()).not.toBeInTheDocument();
  });

  it('markBackup persists the supplied ISO timestamp rather than the current clock', () => {
    const exportedAt = new Date(2026, 0, 14, 23, 59).toISOString();
    useAppStore.getState().dismissBackupReminder();
    const previousMeta = useAppStore.getState().meta;

    useAppStore.getState().markBackup(exportedAt);

    expect(useAppStore.getState().meta).toEqual({ ...previousMeta, lastBackupAt: exportedAt });
    expect(storedMeta()).toEqual({
      v: ENVELOPE_VERSION,
      value: { ...previousMeta, lastBackupAt: exportedAt },
    });
  });
});