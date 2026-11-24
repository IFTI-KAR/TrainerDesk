import { cn } from '../../lib/utils';

export function Skeleton({ className }) {
  return <div className={cn('rounded-lg bg-surface-raised animate-pulse', className)} />;
}

export default Skeleton;
