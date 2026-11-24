import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Plus, RotateCcw, Search, Star, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  createExercise,
  deleteExercise,
  fetchExercises,
  formatLabel,
  toggleFavoriteExercise,
  updateExercise,
} from '../lib/exercises.api';
import { cn, getApiErrorMessage } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ExerciseCard from '../components/exercises/ExerciseCard';
import ExerciseDetailModal from '../components/exercises/ExerciseDetailModal';
import ExerciseFormModal from '../components/exercises/ExerciseFormModal';

const PAGE_LIMIT = 24;

export default function ExercisesPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [category, setCategory] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [customOnly, setCustomOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [deletingExercise, setDeletingExercise] = useState(null);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      category: category || undefined,
      muscle: muscle || undefined,
      equipment: equipment || undefined,
      favoritesOnly: favoritesOnly ? 'true' : undefined,
      customOnly: customOnly ? 'true' : undefined,
      page,
      limit: PAGE_LIMIT,
    }),
    [debouncedSearch, category, muscle, equipment, favoritesOnly, customOnly, page]
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['exercises', queryParams],
    queryFn: () => fetchExercises(queryParams),
    placeholderData: (prev) => prev,
  });

  const exercises = data?.exercises || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

  const hasActiveFilters = Boolean(
    searchInput || category || muscle || equipment || favoritesOnly || customOnly
  );

  const resetFilters = () => {
    setSearchInput('');
    setCategory('');
    setMuscle('');
    setEquipment('');
    setFavoritesOnly(false);
    setCustomOnly(false);
    setPage(1);
  };

  const favoriteMutation = useMutation({
    mutationFn: toggleFavoriteExercise,
    onMutate: async (exerciseId) => {
      await queryClient.cancelQueries({ queryKey: ['exercises'] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ['exercises'] });

      queryClient.setQueriesData({ queryKey: ['exercises'] }, (old) => {
        if (!old?.exercises) return old;
        return {
          ...old,
          exercises: old.exercises.map((ex) =>
            ex.id === exerciseId ? { ...ex, isFavorite: !ex.isFavorite } : ex
          ),
        };
      });

      setSelectedExercise((prev) =>
        prev && prev.id === exerciseId ? { ...prev, isFavorite: !prev.isFavorite } : prev
      );

      return { previousQueries };
    },
    onError: (err, _id, context) => {
      context?.previousQueries?.forEach(([key, snapshot]) => {
        queryClient.setQueryData(key, snapshot);
      });
      toast.error(getApiErrorMessage(err, 'Failed to update favorite'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const handleSaveExercise = async (formData, editId) => {
    if (editId) {
      const updated = await updateExercise({ id: editId, formData });
      toast.success('Exercise updated');
      setSelectedExercise(updated);
    } else {
      await createExercise(formData);
      toast.success('Exercise created');
      setPage(1);
    }
    await queryClient.invalidateQueries({ queryKey: ['exercises'] });
  };

  const deleteMutation = useMutation({
    mutationFn: deleteExercise,
    onSuccess: () => {
      toast.success('Exercise deleted');
      setDeletingExercise(null);
      setSelectedExercise(null);
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to delete exercise'));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Exercise library</h1>
            <span className="font-mono text-xs text-ink-muted tabular-nums">
              {pagination.total} total
            </span>
          </div>
          <p className="text-sm text-ink-secondary">
            Browse movements, inspect form cues, or upload your own custom exercises
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingExercise(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add exercise
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
              placeholder="Search by exercise, muscle, or equipment"
              aria-label="Search exercises"
              className="h-11 w-full rounded-lg border border-line bg-canvas pl-9 pr-9 text-sm text-ink placeholder:text-ink-muted"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setPage(1);
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <select
              value={muscle}
              onChange={(e) => {
                setMuscle(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by muscle group"
              className="h-11 rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
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
              className="h-11 rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
            >
              <option value="">All equipment</option>
              {EQUIPMENT_TYPES.map((eq) => (
                <option key={eq} value={eq}>
                  {formatLabel(eq)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setCategory('');
                setPage(1);
              }}
              className={cn(
                'h-8 rounded-lg border px-3 text-xs font-medium transition-colors',
                category === ''
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line bg-canvas text-ink-secondary hover:text-ink'
              )}
            >
              All
            </button>
            {EXERCISE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat === category ? '' : cat);
                  setPage(1);
                }}
                className={cn(
                  'h-8 rounded-lg border px-3 text-xs font-medium transition-colors',
                  category === cat
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-canvas text-ink-secondary hover:text-ink'
                )}
              >
                {formatLabel(cat)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setFavoritesOnly((v) => !v);
                setPage(1);
              }}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors',
                favoritesOnly
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line bg-canvas text-ink-secondary hover:text-ink'
              )}
            >
              <Star
                className="h-3.5 w-3.5"
                strokeWidth={1.75}
                fill={favoritesOnly ? 'currentColor' : 'none'}
              />
              Favorites
            </button>

            <button
              type="button"
              onClick={() => {
                setCustomOnly((v) => !v);
                setPage(1);
              }}
              className={cn(
                'inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition-colors',
                customOnly
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line bg-canvas text-ink-secondary hover:text-ink'
              )}
            >
              Custom
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-ink-secondary hover:text-ink"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="overflow-hidden rounded-xl border border-line bg-surface">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={hasActiveFilters ? 'No exercises match these filters' : 'Exercise library is empty'}
          description={
            hasActiveFilters
              ? 'Try clearing a muscle, equipment, or search filter.'
              : 'Run the seed script or add a custom exercise to get started.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIsFormOpen(true)}>
                Add exercise
              </Button>
            )
          }
        />
      ) : (
        <>
          <div
            className={cn(
              'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 transition-opacity',
              isFetching ? 'opacity-70' : 'opacity-100'
            )}
          >
            {exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onSelect={setSelectedExercise}
                onToggleFavorite={(id) => favoriteMutation.mutate(id)}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line pt-4">
              <p className="font-mono text-xs text-ink-secondary tabular-nums">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ExerciseDetailModal
        exercise={selectedExercise}
        isOpen={Boolean(selectedExercise)}
        onClose={() => setSelectedExercise(null)}
        onToggleFavorite={(id) => favoriteMutation.mutate(id)}
        onEdit={(ex) => {
          setEditingExercise(ex);
          setIsFormOpen(true);
        }}
        onDelete={(ex) => setDeletingExercise(ex)}
      />

      <ExerciseFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingExercise(null);
        }}
        initialExercise={editingExercise}
        onSubmitForm={handleSaveExercise}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingExercise)}
        onClose={() => setDeletingExercise(null)}
        onConfirm={() => deletingExercise && deleteMutation.mutate(deletingExercise.id)}
        title="Delete custom exercise"
        description={`Delete "${deletingExercise?.name}" from your exercise library? This cannot be undone.`}
        confirmLabel="Delete exercise"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
