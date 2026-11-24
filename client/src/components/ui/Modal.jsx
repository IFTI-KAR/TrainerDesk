import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Modal({ isOpen, onClose, title, description, children, className, size = 'md' }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={cn(
          'w-full rounded-t-2xl border border-line bg-surface p-6 shadow-xl sm:rounded-2xl',
          'max-h-[90vh] overflow-y-auto',
          sizeClass,
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 pb-4">
          <div className="space-y-1">
            {title && (
              <h3 id="modal-title" className="text-lg font-semibold text-ink">
                {title}
              </h3>
            )}
            {description && <p className="text-sm text-ink-secondary">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
