import { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef(function Input(
  { label, error, hint, id, className, wrapperClassName, rightElement, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(
            'h-11 w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted transition-colors',
            error
              ? 'border-danger focus:outline-danger'
              : 'border-line hover:border-ink-muted/40 focus:border-accent',
            rightElement ? 'pr-10' : '',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">{rightElement}</div>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {!error && hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
});

export default Input;
