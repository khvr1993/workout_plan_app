import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { defaultMeta, defaultSettings } from '../../data/defaults';
import { program } from '../../data/program';
import { useAppStore } from '../../store/useAppStore';
import { useBackupStore } from '../../store/useBackupStore';
import { useInstallStore } from '../../pwa/install';
import { AutoBackupSettings } from './AutoBackupSettings';

let enableMock: ReturnType<typeof vi.fn<() => Promise<void>>>;
let reconnectMock: ReturnType<typeof vi.fn<() => Promise<void>>>;
let disableMock: ReturnType<typeof vi.fn<() => Promise<void>>>;
let backupNowMock: ReturnType<typeof vi.fn<() => Promise<void>>>;

beforeEach(() => {
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
  enableMock = vi.fn(async () => {});
  reconnectMock = vi.fn(async () => {});
  disableMock = vi.fn(async () => {});
  backupNowMock = vi.fn(async () => {});
  useBackupStore.setState({
    status: 'off',
    fileName: null,
    error: null,
    busy: false,
    enable: enableMock,
    reconnect: reconnectMock,
    disable: disableMock,
    backupNow: backupNowMock,
  });
  useInstallStore.setState({ installed: true, deferred: null });
});

afterEach(() => {
  cleanup();
});

describe('AutoBackupSettings', () => {
  it('is hidden outside the installed app', () => {
    useInstallStore.setState({ installed: false });
    const { container } = render(<AutoBackupSettings />);
    expect(container).toBeEmptyDOMElement();
  });

  it('explains the manual fallback in unsupported browsers', () => {
    useBackupStore.setState({ status: 'unsupported' });
    render(<AutoBackupSettings />);

    expect(screen.getByText('Not supported')).toBeInTheDocument();
    expect(screen.getByText(/cannot overwrite a file automatically/i)).toBeInTheDocument();
    expect(screen.getByText(/Use Export below/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enable' })).not.toBeInTheDocument();
  });

  it('offers Enable when automatic backup is off', () => {
    render(<AutoBackupSettings />);

    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText(/overwritten every day and after your changes/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));
    expect(enableMock).toHaveBeenCalledTimes(1);
  });

  it('shows the file, last backup time, and maintenance actions when on', () => {
    useAppStore.setState({
      meta: { ...defaultMeta(), lastBackupAt: new Date(2026, 0, 15, 9, 5).toISOString() },
    });
    useBackupStore.setState({ status: 'on', fileName: 'workout-backup.json' });
    render(<AutoBackupSettings />);

    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByText(/workout-backup\.json · Last backup Jan 15, 09:05/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back up now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change file' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));
    expect(backupNowMock).toHaveBeenCalledTimes(1);
    expect(enableMock).toHaveBeenCalledTimes(1);
    expect(disableMock).toHaveBeenCalledTimes(1);
  });

  it('shows a pending hint before the first automatic backup', () => {
    useBackupStore.setState({ status: 'on', fileName: 'workout-backup.json' });
    render(<AutoBackupSettings />);
    expect(screen.getByText(/first backup pending/)).toBeInTheDocument();
  });

  it('disables actions and shows progress while a write is in flight', () => {
    useBackupStore.setState({ status: 'on', fileName: 'workout-backup.json', busy: true });
    render(<AutoBackupSettings />);

    expect(screen.getByText(/Backing up to workout-backup\.json…/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back up now' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Change file' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Turn off' })).toBeDisabled();
  });

  it('offers Reconnect when write permission expired', () => {
    useBackupStore.setState({ status: 'needs-permission', fileName: 'workout-backup.json' });
    render(<AutoBackupSettings />);

    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByText(/Write access to workout-backup\.json expired/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));
    expect(reconnectMock).toHaveBeenCalledTimes(1);
    expect(disableMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces errors with a choose-again action', () => {
    useBackupStore.setState({
      status: 'error',
      error: 'The backup file could not be found. Choose it again.',
    });
    render(<AutoBackupSettings />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText(/could not be found/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose file again' }));
    expect(enableMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Turn off' })).toBeEnabled();
  });
});