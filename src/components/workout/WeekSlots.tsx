import { cn } from '../../lib/cn';

export function WeekSlots({ completed, target }: { completed: number; target: number }) {
  return (
    <div
      className="flex items-center gap-1.5"
      role="img"
      aria-label={`${completed} of ${target} sessions this week`}
    >
      {Array.from({ length: target }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-2.5 w-2.5 rounded-full border',
            i < completed ? 'bg-accent border-transparent' : 'bg-transparent border-border-strong',
          )}
        />
      ))}
    </div>
  );
}