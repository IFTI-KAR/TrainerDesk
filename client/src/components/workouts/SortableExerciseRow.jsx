import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  Dumbbell,
  GripVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  SUPERSET_GROUPS,
  TRACKING_TYPES,
  formatExercisePrescription,
} from '../../lib/workouts.api';
import { formatLabel } from '../../lib/exercises.api';
import { cn } from '../../lib/utils';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export function SortableExerciseRow({
  exercise,
  index,
  totalCount,
  defaultWeightUnit = 'kg',
  onChange,
  onRemove,
  onMove,
}) {
  const uid = exercise._uid || exercise.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: uid,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [quickSets, setQuickSets] = useState(exercise.sets?.length || 3);
  const [quickReps, setQuickReps] = useState(exercise.sets?.[0]?.targetReps || '10');
  const [quickDuration, setQuickDuration] = useState(
    exercise.sets?.[0]?.targetDurationSec ?? 45
  );
  const [quickWeight, setQuickWeight] = useState(exercise.sets?.[0]?.targetWeight ?? 20);
  const [quickRest, setQuickRest] = useState(exercise.sets?.[0]?.restSec ?? 60);

  const isTimed = exercise.trackingType === 'duration';
  const showWeight = exercise.trackingType === 'reps_weight';

  const applyQuickShortcut = () => {
    const count = Math.max(1, Math.min(12, Number(quickSets) || 3));
    const unit = exercise.sets?.[0]?.weightUnit || defaultWeightUnit;
    const nextSets = Array.from({ length: count }, (_, idx) => ({
      setNumber: idx + 1,
      targetReps: isTimed ? '' : String(quickReps || '10'),
      targetDurationSec: isTimed ? Number(quickDuration) || 45 : null,
      targetWeight: showWeight ? Number(quickWeight || 0) : null,
      weightUnit: unit,
      restSec: Number(quickRest ?? 60),
    }));
    onChange({ ...exercise, sets: nextSets });
  };

  const updateSetField = (setIndex, field, value) => {
    const nextSets = exercise.sets.map((s, idx) =>
      idx === setIndex ? { ...s, [field]: value } : s
    );
    onChange({ ...exercise, sets: nextSets });
  };

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1] || {
      targetReps: '10',
      targetDurationSec: isTimed ? 45 : null,
      targetWeight: showWeight ? 20 : null,
      weightUnit: defaultWeightUnit,
      restSec: 60,
    };
    const nextSets = [
      ...exercise.sets,
      {
        ...last,
        setNumber: exercise.sets.length + 1,
      },
    ];
    onChange({ ...exercise, sets: nextSets });
  };

  const removeSet = (setIndex) => {
    if (exercise.sets.length <= 1) return;
    const nextSets = exercise.sets
      .filter((_, idx) => idx !== setIndex)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    onChange({ ...exercise, sets: nextSets });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative rounded-xl border bg-surface p-4 transition-colors',
        exercise.supersetGroup ? 'border-l-4 border-l-accent border-line' : 'border-line',
        isDragging ? 'z-20 opacity-85 shadow-lg' : ''
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised hover:text-ink active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" strokeWidth={1.75} />
          </button>

          {exercise.exerciseImageUrl ? (
            <img
              src={exercise.exerciseImageUrl}
              alt={exercise.exerciseName}
              loading="lazy"
              className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover bg-surface-raised"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-raised text-ink-muted">
              <Dumbbell className="h-5 w-5" strokeWidth={1.5} />
            </div>
          )}

          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm font-semibold text-ink">
                {exercise.exerciseName}
              </h4>
              {exercise.supersetGroup && (
                <Badge tone="accent">Superset {exercise.supersetGroup}</Badge>
              )}
            </div>
            <p className="text-xs text-ink-secondary">
              {exercise.primaryMuscle ? `${formatLabel(exercise.primaryMuscle)} · ` : ''}
              <span className="font-mono tabular-nums">
                {formatExercisePrescription(exercise)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={exercise.supersetGroup || ''}
            onChange={(e) => onChange({ ...exercise, supersetGroup: e.target.value })}
            aria-label="Superset group"
            className="h-9 rounded-lg border border-line bg-canvas px-2 text-xs text-ink"
          >
            {SUPERSET_GROUPS.map((g) => (
              <option key={g || 'none'} value={g}>
                {g ? `Superset ${g}` : 'No superset'}
              </option>
            ))}
          </select>

          <select
            value={exercise.trackingType || 'reps_weight'}
            onChange={(e) => onChange({ ...exercise, trackingType: e.target.value })}
            aria-label="Tracking type"
            className="h-9 rounded-lg border border-line bg-canvas px-2 text-xs text-ink"
          >
            {TRACKING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-lg border border-line bg-canvas">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMove(index, index - 1)}
              aria-label="Move up"
              className="inline-flex h-8 w-8 items-center justify-center text-ink-secondary hover:text-ink disabled:opacity-30"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={index === totalCount - 1}
              onClick={() => onMove(index, index + 1)}
              aria-label="Move down"
              className="inline-flex h-8 w-8 items-center justify-center text-ink-secondary hover:text-ink disabled:opacity-30"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${exercise.exerciseName}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised hover:text-danger transition-colors"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Quick shortcut bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-xs">
        <span className="font-medium text-ink-secondary">Quick fill:</span>
        <label className="flex items-center gap-1 text-ink-muted">
          Sets
          <input
            type="number"
            min={1}
            max={12}
            value={quickSets}
            onChange={(e) => setQuickSets(e.target.value)}
            className="h-7 w-14 rounded border border-line bg-surface px-2 font-mono text-xs text-ink tabular-nums"
          />
        </label>
        {isTimed ? (
          <label className="flex items-center gap-1 text-ink-muted">
            Sec
            <input
              type="number"
              min={1}
              value={quickDuration}
              onChange={(e) => setQuickDuration(e.target.value)}
              className="h-7 w-16 rounded border border-line bg-surface px-2 font-mono text-xs text-ink tabular-nums"
            />
          </label>
        ) : (
          <label className="flex items-center gap-1 text-ink-muted">
            Reps
            <input
              type="text"
              value={quickReps}
              onChange={(e) => setQuickReps(e.target.value)}
              placeholder="8-12"
              className="h-7 w-16 rounded border border-line bg-surface px-2 font-mono text-xs text-ink"
            />
          </label>
        )}
        {showWeight && (
          <label className="flex items-center gap-1 text-ink-muted">
            Weight ({defaultWeightUnit})
            <input
              type="number"
              min={0}
              step="0.5"
              value={quickWeight}
              onChange={(e) => setQuickWeight(e.target.value)}
              className="h-7 w-16 rounded border border-line bg-surface px-2 font-mono text-xs text-ink tabular-nums"
            />
          </label>
        )}
        <label className="flex items-center gap-1 text-ink-muted">
          Rest (s)
          <input
            type="number"
            min={0}
            step={15}
            value={quickRest}
            onChange={(e) => setQuickRest(e.target.value)}
            className="h-7 w-16 rounded border border-line bg-surface px-2 font-mono text-xs text-ink tabular-nums"
          />
        </label>
        <Button type="button" variant="secondary" size="sm" className="h-7 px-2.5 text-xs" onClick={applyQuickShortcut}>
          Apply
        </Button>
      </div>

      {/* Per-set targets table */}
      <div className="mt-3 space-y-1.5">
        <div className="grid grid-cols-12 gap-2 px-1 text-[11px] font-medium text-ink-muted">
          <span className="col-span-2">Set</span>
          <span className={showWeight ? 'col-span-3' : 'col-span-5'}>
            {isTimed ? 'Duration (s)' : 'Target reps'}
          </span>
          {showWeight && <span className="col-span-3">Weight ({defaultWeightUnit})</span>}
          <span className="col-span-3">Rest (s)</span>
          <span className="col-span-1" />
        </div>

        {exercise.sets.map((setItem, sIdx) => (
          <div key={sIdx} className="grid grid-cols-12 items-center gap-2">
            <span className="col-span-2 px-1 font-mono text-xs font-medium text-ink-secondary tabular-nums">
              #{sIdx + 1}
            </span>

            {isTimed ? (
              <input
                type="number"
                min={0}
                value={setItem.targetDurationSec ?? ''}
                onChange={(e) =>
                  updateSetField(
                    sIdx,
                    'targetDurationSec',
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
                aria-label={`Set ${sIdx + 1} duration`}
                className="col-span-5 h-9 rounded-lg border border-line bg-canvas px-2.5 font-mono text-xs text-ink tabular-nums"
              />
            ) : (
              <input
                type="text"
                value={setItem.targetReps ?? ''}
                onChange={(e) => updateSetField(sIdx, 'targetReps', e.target.value)}
                placeholder="10"
                aria-label={`Set ${sIdx + 1} target reps`}
                className={cn(
                  'h-9 rounded-lg border border-line bg-canvas px-2.5 font-mono text-xs text-ink',
                  showWeight ? 'col-span-3' : 'col-span-5'
                )}
              />
            )}

            {showWeight && (
              <input
                type="number"
                min={0}
                step="0.5"
                value={setItem.targetWeight ?? ''}
                onChange={(e) =>
                  updateSetField(
                    sIdx,
                    'targetWeight',
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
                placeholder="0"
                aria-label={`Set ${sIdx + 1} weight`}
                className="col-span-3 h-9 rounded-lg border border-line bg-canvas px-2.5 font-mono text-xs text-ink tabular-nums"
              />
            )}

            <input
              type="number"
              min={0}
              step={15}
              value={setItem.restSec ?? 60}
              onChange={(e) => updateSetField(sIdx, 'restSec', Number(e.target.value || 0))}
              aria-label={`Set ${sIdx + 1} rest seconds`}
              className="col-span-3 h-9 rounded-lg border border-line bg-canvas px-2.5 font-mono text-xs text-ink tabular-nums"
            />

            <button
              type="button"
              onClick={() => removeSet(sIdx)}
              disabled={exercise.sets.length <= 1}
              aria-label={`Remove set ${sIdx + 1}`}
              className="col-span-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:text-danger disabled:opacity-25"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <div className="pt-1">
          <button
            type="button"
            onClick={addSet}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add set
          </button>
        </div>
      </div>

      {/* Tempo & notes */}
      <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-3">
        <input
          type="text"
          value={exercise.tempo || ''}
          onChange={(e) => onChange({ ...exercise, tempo: e.target.value })}
          placeholder="Tempo (e.g. 3-1-1-0)"
          className="h-9 rounded-lg border border-line bg-canvas px-2.5 text-xs text-ink placeholder:text-ink-muted"
        />
        <input
          type="text"
          value={exercise.notes || ''}
          onChange={(e) => onChange({ ...exercise, notes: e.target.value })}
          placeholder="Exercise coaching notes"
          className="h-9 rounded-lg border border-line bg-canvas px-2.5 text-xs text-ink placeholder:text-ink-muted sm:col-span-2"
        />
      </div>
    </div>
  );
}

export default SortableExerciseRow;
