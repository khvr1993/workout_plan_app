import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover border border-transparent',
  secondary: 'bg-surface-2 text-text border border-border hover:border-border-strong',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-2 hover:text-text border border-transparent',
  danger: 'bg-danger text-white border border-transparent hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-sm font-medium transition-colors duration-150',
        'disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});