import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-sm text-text-secondary transition-colors duration-150',
        'hover:bg-surface-2 hover:text-text cursor-pointer disabled:opacity-50 disabled:pointer-events-none',
        size === 'md' ? 'h-11 w-11' : 'h-9 w-9',
        className,
      )}
      {...props}
    />
  );
});