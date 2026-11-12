import { NavLink } from 'react-router-dom';
import { CalendarDays, Dumbbell, Home, Settings, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/cn';

export const NAV_ITEMS = [
  { to: '/', label: 'Today', icon: Home, end: true },
  { to: '/program', label: 'Program', icon: Dumbbell, end: false },
  { to: '/history', label: 'History', icon: CalendarDays, end: false },
  { to: '/progress', label: 'Progress', icon: TrendingUp, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

export function navLinkClass(isActive: boolean) {
  return cn(
    'flex items-center gap-3 rounded-sm px-3 h-10 text-sm transition-colors duration-150',
    isActive
      ? 'bg-surface-2 text-text font-medium'
      : 'text-text-secondary hover:bg-surface-2 hover:text-text',
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-62 border-r border-border bg-surface hidden lg:flex flex-col z-40">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
        <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-accent">
          <Dumbbell size={16} strokeWidth={2} className="text-accent-fg" />
        </span>
        <span className="text-h3 text-text">Workout</span>
      </div>
      <nav aria-label="Primary" className="flex flex-col gap-0.5 p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => navLinkClass(isActive)}>
            <Icon size={17} strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-4 border-t border-border">
        <p className="text-[11px] leading-4 text-text-muted">
          3-Day Full-Body
          <br />
          Lean Muscle · v1.0
        </p>
      </div>
    </aside>
  );
}