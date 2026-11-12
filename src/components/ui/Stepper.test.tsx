import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Stepper } from './Stepper';

afterEach(cleanup);

function renderStepper(value: number, onChange = vi.fn()) {
  render(
    <Stepper
      value={value}
      min={15}
      max={300}
      step={10}
      editable
      ariaLabel="Default rest seconds"
      onChange={onChange}
    />,
  );
  return onChange;
}

describe('Stepper', () => {
  it('steps by the configured amount', () => {
    const onChange = renderStepper(60);

    fireEvent.click(screen.getByRole('button', { name: 'Increase Default rest seconds' }));
    expect(onChange).toHaveBeenLastCalledWith(70);

    fireEvent.click(screen.getByRole('button', { name: 'Decrease Default rest seconds' }));
    expect(onChange).toHaveBeenLastCalledWith(50);
  });

  it('clamps stepped values to the allowed range', () => {
    const onChange = renderStepper(295);

    fireEvent.click(screen.getByRole('button', { name: 'Increase Default rest seconds' }));
    expect(onChange).toHaveBeenLastCalledWith(300);
  });

  it('accepts a typed value on blur and clamps it', () => {
    const onChange = renderStepper(60);
    const input = screen.getByRole('textbox', { name: 'Default rest seconds' });

    fireEvent.change(input, { target: { value: '125' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(125);

    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(300);
  });

  it('steps from the typed value before it is blurred', () => {
    const onChange = renderStepper(60);
    const input = screen.getByRole('textbox', { name: 'Default rest seconds' });

    fireEvent.change(input, { target: { value: '125' } });
    fireEvent.click(screen.getByRole('button', { name: 'Increase Default rest seconds' }));

    expect(onChange).toHaveBeenLastCalledWith(135);
  });
});
