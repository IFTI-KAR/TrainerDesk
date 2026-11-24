import { Check, Dumbbell, History, Plus, Timer, Trophy } from 'lucide-react';
import { formatLabel } from '../../lib/exercises.api';
import { cn } from '../../lib/utils';
import Badge from '../ui/Badge';
import Card from '../ui/Card';

function formatPrevSummary(previousData, trackingType) {
  if (!previousData || !previousData.sets?.length) return '';
  return previousData.sets
    .map((s) =>
      trackingType === 'duration'
        ? `${s.durationSec ?? 0}s`
        : s.weight !== null && s.weight !== undefined
          ? `${s.reps ?? 0}×${s.weight}${s.weightUnit || 'kg'}`
          : `${s.reps ?? 0}`
    )
    .join(' · ');
}

export function LiveExerciseCard({
  snapshotExercise,
  loggedExercise,
  previousData,
  isReadOnly = false,
  onUpdateSet,
  onToggleSetComplete,
  onAddSet,
  onNotesChange,
  onStartRest,
}) {
  const sets = loggedExercise?.sets || [];
  const targetSets = snapshotExercise?.targetSets || [];
  const trackingType = snapshotExercise?.trackingType || 'reps_weight';
  const isTimed = trackingType === 'duration';
  const showWeight = trackingType === 'reps_weight';
  const completedCount = sets.filter((s) => s.completed).length;

  const prevSummary = formatPrevSummary(previousData, trackingType);
  const defaultRest = targetSets[0]?.restSec ?? 60;

  return (
    <Card
      className={cn(
        'p-4 sm:p-5',
        snapshotExercise?.supersetGroup ? 'border-l-4 border-l-accent' : ''
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {snapshotExercise?.imageUrl ? (
            <img
              src={snapshotExercise.imageUrl}
              alt={snapshotExercise.name}
              loading="lazy"
              className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover bg-surface-raised"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-raised text-ink-muted">
              <Dumbbell className="h-5 w-5" strokeWidth={1.5} />
            </div>
          )}

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-ink">
                {snapshotExercise?.name || loggedExercise?.exerciseName}
              </h3>
              {snapshotExercise?.supersetGroup && (
                <Badge tone="accent">Superset {snapshotExercise.supersetGroup}</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
              {snapshotExercise?.primaryMuscle && (
                <span>{formatLabel(snapshotExercise.primaryMuscle)}</span>
              )}
              {snapshotExercise?.tempo && (
                <span className="font-mono">Tempo {snapshotExercise.tempo}</span>
              )}
              <span className="font-mono tabular-nums text-ink-muted">
                {completedCount}/{sets.length} sets
              </span>
            </div>
          </div>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => onStartRest(defaultRest)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg border border-line bg-canvas px-3 text-xs font-medium text-ink-secondary hover:text-ink transition-colors"
          >
            <Timer className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
            Rest {defaultRest}s
          </button>
        )}
      </div>

      {snapshotExercise?.notes && (
        <p className="mt-2.5 rounded-lg bg-surface-raised/70 px-3 py-2 text-xs text-ink-secondary">
          Cue: {snapshotExercise.notes}
        </p>
      )}

      {prevSummary && (
        <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink-secondary">
          <History className="h-3.5 w-3.5 shrink-0 text-ink-muted" strokeWidth={1.75} />
          <span className="truncate font-mono tabular-nums">
            Last time ({previousData.date}): {prevSummary}
          </span>
        </div>
      )}

      {/* Set rows */}
      <div className="mt-4 space-y-2">
        <div className="grid grid-cols-12 items-center gap-2 px-1 text-[11px] font-medium text-ink-muted">
          <span className="col-span-1">Set</span>
          <span className="col-span-3">Target</span>
          {showWeight && <span className="col-span-3">Weight</span>}
          <span className={showWeight ? 'col-span-3' : 'col-span-6'}>
            {isTimed ? 'Sec' : 'Reps'}
          </span>
          <span className="col-span-2 text-right">Done</span>
        </div>

        {sets.map((setItem, sIdx) => {
          const target = targetSets[sIdx] || targetSets[0];
          const targetText = target
            ? isTimed
              ? `${target.targetDurationSec ?? 0}s`
              : `${target.targetReps}${target.targetWeight !== null && target.targetWeight !== undefined ? ` × ${target.targetWeight}${target.weightUnit || 'kg'}` : ''}`
            : '-';

          return (
            <div
              key={sIdx}
              className={cn(
                'grid grid-cols-12 items-center gap-2 rounded-xl border px-2 py-2 transition-colors',
                setItem.completed
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-line bg-canvas'
              )}
            >
              <div className="col-span-1 flex items-center gap-1">
                <span className="font-mono text-xs font-semibold tabular-nums text-ink-secondary">
                  {setItem.setNumber}
                </span>
              </div>

              <div className="col-span-3 min-w-0">
                <p className="truncate font-mono text-xs text-ink-secondary tabular-nums">
                  {targetText}
                </p>
                {setItem.isPR && (
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-warning">
                    <Trophy className="h-2.5 w-2.5" />
                    PR
                  </span>
                )}
              </div>

              {showWeight && (
                <div className="col-span-3">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.5"
                    disabled={isReadOnly}
                    value={setItem.weight ?? ''}
                    onChange={(e) =>
                      onUpdateSet(
                        sIdx,
                        'weight',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    aria-label={`Set ${setItem.setNumber} weight`}
                    className="h-11 w-full rounded-lg border border-line bg-surface px-2.5 text-center font-mono text-sm font-medium tabular-nums text-ink"
                  />
                </div>
              )}

              <div className={showWeight ? 'col-span-3' : 'col-span-6'}>
                {isTimed ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    disabled={isReadOnly}
                    value={setItem.durationSec ?? ''}
                    onChange={(e) =>
                      onUpdateSet(
                        sIdx,
                        'durationSec',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    aria-label={`Set ${setItem.setNumber} duration seconds`}
                    className="h-11 w-full rounded-lg border border-line bg-surface px-2.5 text-center font-mono text-sm font-medium tabular-nums text-ink"
                  />
                ) : (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    disabled={isReadOnly}
                    value={setItem.reps ?? ''}
                    onChange={(e) =>
                      onUpdateSet(
                        sIdx,
                        'reps',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    aria-label={`Set ${setItem.setNumber} reps`}
                    className="h-11 w-full rounded-lg border border-line bg-surface px-2.5 text-center font-mono text-sm font-medium tabular-nums text-ink"
                  />
                )}
              </div>

              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => onToggleSetComplete(sIdx, target?.restSec ?? defaultRest)}
                  aria-label={`Mark set ${setItem.setNumber} complete`}
                  aria-pressed={Boolean(setItem.completed)}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-lg border transition-colors',
                    setItem.completed
                      ? 'border-success bg-success text-white'
                      : 'border-line bg-surface text-ink-muted hover:border-accent hover:text-ink'
                  )}
                >
                  <Check className="h-5 w-5" strokeWidth={2.25} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        {!isReadOnly && (
          <button
            type="button"
            onClick={onAddSet}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-dashed border-line px-3 text-xs font-medium text-accent hover:border-accent hover:bg-accent-soft transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add set
          </button>
        )}
        <input
          type="text"
          disabled={isReadOnly}
          value={loggedExercise?.notes || ''}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Exercise notes (form cue, pain, RPE)"
          className="h-9 flex-1 rounded-lg border border-line bg-canvas px-3 text-xs text-ink placeholder:text-ink-muted"
        />
      </div>
    </Card>
  );
}

export default LiveExerciseCard;
