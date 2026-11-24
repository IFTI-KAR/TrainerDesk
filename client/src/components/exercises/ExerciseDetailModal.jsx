import { useEffect, useState } from 'react';
import { Dumbbell, ExternalLink, Pencil, Star, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatLabel } from '../../lib/exercises.api';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export function ExerciseDetailModal({
  exercise,
  isOpen,
  onClose,
  onToggleFavorite,
  onEdit,
  onDelete,
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setActiveImageIndex(0);
    setImgError(false);
  }, [exercise?.id]);

  if (!exercise) return null;

  const images = [exercise.imageUrl, exercise.secondaryImageUrl].filter(Boolean);
  const currentImage = images[activeImageIndex] || exercise.imageUrl;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={exercise.name} size="lg">
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-xl border border-line bg-surface-raised">
          <div className="aspect-[16/10] w-full">
            {!imgError && currentImage ? (
              <img
                src={currentImage}
                alt={exercise.name}
                onError={() => setImgError(true)}
                className="h-full w-full object-contain bg-black/5 dark:bg-black/25"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-muted">
                <Dumbbell className="h-10 w-10" strokeWidth={1.5} />
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-line bg-surface p-2">
              {images.map((_src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setImgError(false);
                    setActiveImageIndex(idx);
                  }}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    activeImageIndex === idx
                      ? 'bg-accent text-white'
                      : 'bg-surface-raised text-ink-secondary hover:text-ink'
                  )}
                >
                  {idx === 0 ? 'Start position' : 'End position'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">{formatLabel(exercise.primaryMuscle)}</Badge>
          <Badge tone="neutral">{formatLabel(exercise.equipment)}</Badge>
          <Badge tone="neutral">{formatLabel(exercise.category)}</Badge>
          <Badge tone="neutral">{formatLabel(exercise.difficulty)}</Badge>
          {exercise.isCustom && <Badge tone="success">Custom exercise</Badge>}
        </div>

        {exercise.secondaryMuscles?.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-medium text-ink-muted">Secondary muscles</h4>
            <div className="flex flex-wrap gap-1.5">
              {exercise.secondaryMuscles.map((muscle) => (
                <Badge key={muscle} tone="neutral">
                  {formatLabel(muscle)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {exercise.instructions?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-ink">Instructions</h4>
            <ol className="space-y-2 text-sm text-ink-secondary">
              {exercise.instructions.map((step, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-raised font-mono text-xs font-medium text-ink tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {exercise.tips?.length > 0 && (
          <div className="space-y-2 rounded-xl border border-line bg-surface-raised/60 p-4">
            <h4 className="text-sm font-semibold text-ink">Coaching cues</h4>
            <ul className="list-disc space-y-1 pl-4 text-sm text-ink-secondary">
              {exercise.tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {onToggleFavorite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleFavorite(exercise.id)}
              >
                <Star
                  className={cn('h-4 w-4', exercise.isFavorite ? 'text-accent' : '')}
                  strokeWidth={1.75}
                  fill={exercise.isFavorite ? 'currentColor' : 'none'}
                />
                {exercise.isFavorite ? 'Favorited' : 'Favorite'}
              </Button>
            )}

            {exercise.mediaUrl && (
              <a
                href={exercise.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                Video / GIF
              </a>
            )}
          </div>

          {exercise.isCustom && (
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button variant="secondary" size="sm" onClick={() => onEdit(exercise)}>
                  <Pencil className="h-4 w-4" strokeWidth={1.75} />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button variant="danger" size="sm" onClick={() => onDelete(exercise)}>
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default ExerciseDetailModal;
