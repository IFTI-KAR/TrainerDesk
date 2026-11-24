import { cn } from '../../lib/utils';

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-raised text-ink-secondary">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-base font-medium text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default EmptyState;
