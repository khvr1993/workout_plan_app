import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {icon && <div className="text-text-muted mb-1">{icon}</div>}
      <p className="text-h3 text-text">{title}</p>
      {body && <p className="text-body-sm text-text-muted max-w-70">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}