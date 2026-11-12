import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { NAV_ITEMS } from './Sidebar';

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-border bg-surface safe-bottom"
    >
      <div className="grid grid-cols-5 h-14">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
                isActive ? 'text-text' : 'text-text-muted hover:text-text-secondary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-6 w-10 items-center justify-center rounded-xs',
                    isActive && 'bg-surface-2',
                  )}
                >
                  <Icon size={18} strokeWidth={1.5} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}