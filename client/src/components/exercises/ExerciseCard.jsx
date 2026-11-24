import { useState } from 'react';
import { Check, Dumbbell, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatLabel } from '../../lib/exercises.api';
import Badge from '../ui/Badge';

export function ExerciseCard({
  exercise,
  onSelect,
  onToggleFavorite,
  selectable = false,
  selected = false,
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-surface transition-colors',
        selected
          ? 'border-accent ring-2 ring-accent/30'
          : 'border-line hover:border-ink-muted/40'
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(exercise)}
        className="flex flex-1 flex-col text-left focus-visible:outline-none"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-raised">
          {!imgError && exercise.imageUrl ? (
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-muted">
              <Dumbbell className="h-7 w-7" strokeWidth={1.5} />
            </div>
          )}

          {exercise.isCustom && (
            <div className="absolute left-2.5 top-2.5">
              <Badge tone="accent" className="bg-surface/90 backdrop-blur-sm">
                Custom
              </Badge>
            </div>
          )}

          {selectable && (
            <div
              className={cn(
                'absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                selected
                  ? 'border-accent bg-accent text-white'
                  : 'border-white/70 bg-black/40 text-transparent'
              )}
              aria-hidden="true"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between gap-1.5 p-3">
          <h3 className="line-clamp-1 text-sm font-medium text-ink">{exercise.name}</h3>
          <p className="line-clamp-1 text-xs text-ink-secondary">
            {formatLabel(exercise.primaryMuscle)} · {formatLabel(exercise.equipment)}
          </p>
        </div>
      </button>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(exercise.id);
          }}
          aria-label={exercise.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={cn(
            'absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-sm transition-colors',
            exercise.isFavorite
              ? 'border-accent/30 bg-surface/95 text-accent'
              : 'border-line bg-surface/85 text-ink-secondary hover:text-ink'
          )}
        >
          <Star
            className="h-4 w-4"
            strokeWidth={1.75}
            fill={exercise.isFavorite ? 'currentColor' : 'none'}
          />
        </button>
      )}
    </div>
  );
}

export default ExerciseCard;
