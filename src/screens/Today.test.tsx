import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Today } from './Today';
import { useAppStore } from '../store/useAppStore';
import { useInstallStore } from '../pwa/install';
import { useToastStore } from '../components/ui/Toast';
import { program } from '../data/program';
import { defaultMeta, defaultSettings } from '../data/defaults';

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
  useInstallStore.setState({ deferred: null, installed: false });
  useToastStore.setState({ toasts: [] });
});

function renderToday() {
  return render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  );
}

describe('Today header actions', () => {
  it('cycles dark → system → light → dark from the header toggle', async () => {
    const user = userEvent.setup();
    renderToday();

    // Cycling means the header can always get back to following the device.
    await user.click(screen.getByRole('button', { name: 'Switch to system theme' }));
    expect(useAppStore.getState().settings.theme).toBe('system');

    await user.click(await screen.findByRole('button', { name: 'Switch to light theme' }));
    expect(useAppStore.getState().settings.theme).toBe('light');

    await user.click(await screen.findByRole('button', { name: 'Switch to dark theme' }));
    expect(useAppStore.getState().settings.theme).toBe('dark');
  });

  it('shows install guidance when the browser offers no install prompt', async () => {
    const user = userEvent.setup();
    renderToday();

    await user.click(screen.getByRole('button', { name: 'Install app' }));

    expect(useToastStore.getState().toasts.at(-1)?.message).toMatch(/Add to Home Screen/);
  });

  it('hides the install button once the app is installed', () => {
    useInstallStore.setState({ installed: true });
    renderToday();

    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
  });
});
