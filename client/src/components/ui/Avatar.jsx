import { cn, getInitials } from '../../lib/utils';

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({ src, name, size = 'md', className }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Profile'}
        loading="lazy"
        className={cn('rounded-full object-cover border border-line shrink-0', sizeClass, className)}
      />
    );
  }

  return (
    <div
      aria-label={name || 'Avatar'}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised border border-line font-medium text-ink-secondary',
        sizeClass,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

export default Avatar;
