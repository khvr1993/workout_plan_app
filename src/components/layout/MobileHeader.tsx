import { Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 lg:hidden border-b border-border bg-surface safe-top">
      <div className="flex items-center gap-2.5 px-5 h-14">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Workout home">
          <span className="flex h-6 w-6 items-center justify-center rounded-xs bg-accent">
            <Dumbbell size={14} strokeWidth={2} className="text-accent-fg" />
          </span>
          <span className="text-h3 text-text">Workout</span>
        </Link>
      </div>
    </header>
  );
}