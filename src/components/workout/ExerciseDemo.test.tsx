import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExerciseDemo } from './ExerciseDemo';
import { DEMOS } from '../../data/demos';

describe('ExerciseDemo', () => {
  it('renders both position photos and the numbered steps', () => {
    render(<ExerciseDemo exerciseId="bulgarian-split-squat" name="Bulgarian Split Squat" />);
    const start = screen.getByAltText('Bulgarian Split Squat — start position');
    const end = screen.getByAltText('Bulgarian Split Squat — end position');
    expect(start).toHaveAttribute('src', '/exercises/bulgarian-split-squat/0.jpg');
    expect(end).toHaveAttribute('src', '/exercises/bulgarian-split-squat/1.jpg');
    expect(start.className).toContain('opacity-100');
    expect(end.className).toContain('opacity-0');
    expect(screen.getAllByRole('listitem')).toHaveLength(
      DEMOS['bulgarian-split-squat'].steps.length,
    );
  });

  it('plays by default and can be paused', async () => {
    const user = userEvent.setup();
    render(<ExerciseDemo exerciseId="tempo-db-rdl" name="Tempo Dumbbell RDL" />);
    const pause = screen.getByRole('button', { name: 'Pause animation' });
    await user.click(pause);
    expect(screen.getByRole('button', { name: 'Play animation' })).toBeInTheDocument();
  });

  it('manual position selection pauses and swaps the visible photo', async () => {
    const user = userEvent.setup();
    render(<ExerciseDemo exerciseId="db-lateral-raise" name="Dumbbell Lateral Raise" />);
    await user.click(screen.getByRole('button', { name: 'End' }));
    expect(screen.getByRole('button', { name: 'Play animation' })).toBeInTheDocument();
    expect(screen.getByAltText('Dumbbell Lateral Raise — end position').className).toContain(
      'opacity-100',
    );
    expect(screen.getByAltText('Dumbbell Lateral Raise — start position').className).toContain(
      'opacity-0',
    );
  });

  it('links out to a video search and shows substitution notes', () => {
    render(<ExerciseDemo exerciseId="weighted-bench-hip-thrust" name="Weighted Bench Hip Thrust" />);
    const link = screen.getByRole('link', { name: /Videos/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('href')).toContain('youtube.com/results?search_query=');
    expect(screen.getByText(/balance your 15 kg dumbbell/i)).toBeInTheDocument();
  });

  it('renders nothing for exercises without a demo', () => {
    const { container } = render(<ExerciseDemo exerciseId="custom-move-123" name="Custom Move" />);
    expect(container).toBeEmptyDOMElement();
  });
});