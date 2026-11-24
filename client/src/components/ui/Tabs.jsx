import { cn } from '../../lib/utils';

export function Tabs({ tabs, activeTab, onChange, className }) {
  return (
    <div
      role="tablist"
      aria-label="Client sections"
      className={cn(
        'flex items-center gap-1 overflow-x-auto border-b border-line pb-px',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-accent text-ink'
                : 'border-transparent text-ink-secondary hover:text-ink'
            )}
          >
            {Icon && <Icon className="h-4 w-4" strokeWidth={1.75} />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
