import { cn } from '../../lib/utils';

const TONE_CLASSES = {
  neutral: 'bg-surface-raised text-ink-secondary border-line',
  accent: 'bg-accent-soft text-accent border-transparent',
  success: 'bg-emerald-500/10 text-success border-transparent',
  warning: 'bg-amber-500/10 text-warning border-transparent',
  danger: 'bg-red-500/10 text-danger border-transparent',
};

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone] || TONE_CLASSES.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
