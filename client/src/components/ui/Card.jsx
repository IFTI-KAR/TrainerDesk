import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('rounded-xl border border-line bg-surface p-5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 pb-4', className)}>
      <div className="space-y-1">
        {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
        {description && <p className="text-sm text-ink-secondary">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default Card;
