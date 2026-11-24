import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Star, X } from 'lucide-react';
import {
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  fetchExercises,
  formatLabel,
} from '../../lib/exercises.api';
import { cn } from '../../lib/utils';
import { useDebounce } from '../../hooks/useDebounce';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import ExerciseCard from './ExerciseCard';

export function ExercisePickerModal({ isOpen, onClose, onAddExercises }) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 250);
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [category, setCategory] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedMap, setSelectedMap] = useState(() => new Map());

  useEffect(() => {
    if (isOpen) {
      setSelectedMap(new Map());
      setPage(1);
    }
  }, [isOpen]);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      muscle: muscle || undefined,
      equipment: equipment || undefined,
      category: category || undefined,
      favoritesOnly: favoritesOnly ? 'true' : undefined,
      page,
      limit: 16,
    }),
    [debouncedSearch, muscle, equipment, category, favoritesOnly, page]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['exercises', 'picker', queryParams],
    queryFn: () => fetchExercises(queryParams),
    enabled: isOpen,
    placeholderData: (prev) => prev,
  });

  const exercises = data?.exercises || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  const toggleSelect = (exercise) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(exercise.id)) {
        next.delete(exercise.id);
      } else {
        next.set(exercise.id, exercise);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const chosen = Array.from(selectedMap.values());
    if (chosen.length === 0) return;
    onAddExercises(chosen);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select exercises"
      description="Tap any exercise card to select multiple movements, then add them to the day"
      size="xl"
    >
      <div className="space-y-4">
        <div className="space-y-2.5 rounded-xl border border-line bg-canvas p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                strokeWidth={1.75}
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                placeholder="Search exercises"
                className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-8 text-sm text-ink placeholder:text-ink-muted"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={muscle}
              onChange={(e) => {
                setMuscle(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by muscle"
              className="h-10 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink"
            >
              <option value="">All muscles</option>
              {MUSCLE_GROUPS.map((m) => (
                <option key={m} value={m}>
                  {formatLabel(m)}
                </option>
              ))}
            </select>

            <select
              value={equipment}
              onChange={(e) => {
                setEquipment(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by equipment"
              className="h-10 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink"
            >
              <option value="">All equipment</option>
              {EQUIPMENT_TYPES.map((eq) => (
                <option key={eq} value={eq}>
                  {formatLabel(eq)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {['', ...EXERCISE_CATEGORIES].map((cat) => (
              <button
                key={cat || 'all'}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
                className={cn(
                  'h-7 rounded-md border px-2.5 text-xs font-medium transition-colors',
                  category === cat
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-surface text-ink-secondary hover:text-ink'
                )}
              >
                {cat ? formatLabel(cat) : 'All'}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setFavoritesOnly((v) => !v);
                setPage(1);
              }}
              className={cn(
                'ml-auto inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors',
                favoritesOnly
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line bg-surface text-ink-secondary hover:text-ink'
              )}
            >
              <Star
                className="h-3.5 w-3.5"
                strokeWidth={1.75}
                fill={favoritesOnly ? 'currentColor' : 'none'}
              />
              Favorites
            </button>
          </div>
        </div>

        <div className="max-h-[48vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <Skeleton key={idx} className="aspect-[4/3] w-full rounded-xl" />
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-secondary">
              No exercises match these filters
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {exercises.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  selectable
                  selected={selectedMap.has(ex.id)}
                  onSelect={toggleSelect}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex items-center gap-2">
            {pagination.totalPages > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <span className="font-mono text-xs text-ink-secondary tabular-nums">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-ink-secondary tabular-nums">
              {selectedMap.size} selected
            </span>
            {selectedMap.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedMap(new Map())}>
                Clear
              </Button>
            )}
            <Button onClick={handleConfirm} disabled={selectedMap.size === 0}>
              Add {selectedMap.size > 0 ? `${selectedMap.size} ` : ''}
              {selectedMap.size === 1 ? 'exercise' : 'exercises'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ExercisePickerModal;
