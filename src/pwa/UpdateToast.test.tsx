import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { UpdateToast } from './UpdateToast';

afterEach(cleanup);

describe('UpdateToast', () => {
  it('shows the reload prompt when the service worker announces an update', () => {
    render(<UpdateToast />);
    expect(screen.queryByText('New version available')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-update-available'));
    });

    expect(screen.getByText('New version available')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });
});
