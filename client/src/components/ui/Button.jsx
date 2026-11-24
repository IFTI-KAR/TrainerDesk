import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const VARIANT_CLASSES = {
  primary: 'bg-accent text-white hover:bg-accent-hover border border-transparent',
  secondary:
    'bg-surface-raised text-ink hover:bg-line border border-line',
  outline:
    'bg-transparent text-ink hover:bg-surface-raised border border-line',
  ghost: 'bg-transparent text-ink-secondary hover:text-ink hover:bg-surface-raised border border-transparent',
  danger: 'bg-danger text-white hover:opacity-90 border border-transparent',
};

const SIZE_CLASSES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  icon: 'h-10 w-10 p-0',
};

export const Button = forwardRef(function Button(
  {
    type = 'button',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    className,
    children,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary,
        SIZE_CLASSES[size] || SIZE_CLASSES.md,
        className
      )}
      {...props}
    >
      {isLoading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});

export default Button;
