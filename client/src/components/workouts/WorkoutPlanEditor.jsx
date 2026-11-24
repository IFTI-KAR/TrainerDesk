import { useEffect, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Copy, Dumbbell, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  createClientUid,
  createDefaultExerciseEntry,
  serializeWorkoutDays,
} from '../../lib/workouts.api';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import ExercisePickerModal from '../exercises/ExercisePickerModal';
import SortableExerciseRow from './SortableExerciseRow';

function hydrateDraftDays(days = []) {
  return days.map((day) => ({
    ...day,
    _uid: day.id || createClientUid(),
    exercises: (day.exercises || []).map((ex) => ({
      ...ex,
      _uid: ex.id || createClientUid(),
    })),
  }));
}

export function WorkoutPlanEditor({
  initialPlan,
  onSave,
  onDuplicateDay,
  isSaving = false,
  headerActions = null,
}) {
  const { trainer } = useAuth();
  const weightUnit = trainer?.preferences?.weightUnit || 'kg';

  const [name, setName] = useState(initialPlan?.name || '');
  const [description, setDescription] = useState(initialPlan?.description || '');
  const [days, setDays] = useState(() => hydrateDraftDays(initialPlan?.workoutDays || []));
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    setName(initialPlan?.name || '');
    setDescription(initialPlan?.description || '');
    const hydrated = hydrateDraftDays(initialPlan?.workoutDays || []);
    setDays(hydrated);
    setActiveDayIndex((prev) => (prev < hydrated.length ? prev : 0));
    setIsDirty(false);
  }, [initialPlan]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeDay = days[activeDayIndex] || null;

  const markDays = (updater) => {
    setDays((prev) => updater(prev));
    setIsDirty(true);
  };

  const addDay = () => {
    const nextLetter = String.fromCharCode(65 + (days.length % 26));
    const newDay = {
      _uid: createClientUid(),
      name: `Day ${nextLetter}`,
      focus: '',
      notes: '',
      exercises: [],
    };
    markDays((prev) => [...prev, newDay]);
    setActiveDayIndex(days.length);
  };

  const removeActiveDay = () => {
    if (!activeDay) return;
    markDays((prev) => prev.filter((_, idx) => idx !== activeDayIndex));
    setActiveDayIndex((prev) => Math.max(0, prev - 1));
  };

  const duplicateActiveDayLocalOrRemote = () => {
    if (!activeDay) return;
    if (onDuplicateDay && activeDay.id && !isDirty) {
      onDuplicateDay(activeDay.id);
      return;
    }
    const cloned = {
      ...activeDay,
      id: undefined,
      _uid: createClientUid(),
      name: `${activeDay.name} (Copy)`,
      exercises: (activeDay.exercises || []).map((ex) => ({
        ...ex,
        id: undefined,
        _uid: createClientUid(),
      })),
    };
    markDays((prev) => [...prev, cloned]);
    setActiveDayIndex(days.length);
  };

  const updateActiveDayField = (field, value) => {
    markDays((prev) =>
      prev.map((d, idx) => (idx === activeDayIndex ? { ...d, [field]: value } : d))
    );
  };

  const handleAddExercises = (chosenExercises) => {
    if (!activeDay) return;
    const newEntries = chosenExercises.map((ex) => createDefaultExerciseEntry(ex, weightUnit));
    markDays((prev) =>
      prev.map((d, idx) =>
        idx === activeDayIndex
          ? { ...d, exercises: [...(d.exercises || []), ...newEntries] }
          : d
      )
    );
  };

  const handleExerciseChange = (exIdx, updatedEx) => {
    markDays((prev) =>
      prev.map((d, idx) =>
        idx === activeDayIndex
          ? {
              ...d,
              exercises: d.exercises.map((item, i) => (i === exIdx ? updatedEx : item)),
            }
          : d
      )
    );
  };

  const handleExerciseRemove = (exIdx) => {
    markDays((prev) =>
      prev.map((d, idx) =>
        idx === activeDayIndex
          ? { ...d, exercises: d.exercises.filter((_, i) => i !== exIdx) }
          : d
      )
    );
  };

  const handleExerciseMove = (fromIdx, toIdx) => {
    if (toIdx < 0 || !activeDay || toIdx >= activeDay.exercises.length) return;
    markDays((prev) =>
      prev.map((d, idx) =>
        idx === activeDayIndex
          ? { ...d, exercises: arrayMove(d.exercises, fromIdx, toIdx) }
          : d
      )
    );
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeDay) return;
    const oldIndex = activeDay.exercises.findIndex((ex) => (ex._uid || ex.id) === active.id);
    const newIndex = activeDay.exercises.findIndex((ex) => (ex._uid || ex.id) === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      handleExerciseMove(oldIndex, newIndex);
    }
  };

  const handleSave = () => {
    onSave({
      name: name.trim() || 'Workout Plan',
      description: description.trim(),
      workoutDays: serializeWorkoutDays(days),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ink-muted">Plan name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Push / Pull / Legs"
                className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm font-medium text-ink"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ink-muted">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="4-day hypertrophy progression"
                className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:pt-5">
            {headerActions}
            <Button onClick={handleSave} isLoading={isSaving} disabled={!isDirty && Boolean(initialPlan?.id)}>
              <Save className="h-4 w-4" strokeWidth={1.75} />
              {isDirty ? 'Save changes' : 'Saved'}
            </Button>
          </div>
        </div>

        {/* Workout Days Strip */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          {days.map((day, idx) => (
            <button
              key={day._uid}
              type="button"
              onClick={() => setActiveDayIndex(idx)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors',
                idx === activeDayIndex
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line bg-canvas text-ink-secondary hover:text-ink'
              )}
            >
              <span>{day.name || `Day ${idx + 1}`}</span>
              <span className="font-mono text-[11px] opacity-75 tabular-nums">
                ({day.exercises?.length || 0})
              </span>
            </button>
          ))}
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={addDay}>
            <Plus className="h-3.5 w-3.5" />
            Add day
          </Button>
        </div>
      </Card>

      {!activeDay ? (
        <EmptyState
          icon={Dumbbell}
          title="No workout days yet"
          description="Add your first workout day (e.g. Day A - Push) and pick exercises from the visual library."
          action={
            <Button size="sm" onClick={addDay}>
              <Plus className="h-4 w-4" />
              Add first day
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ink-muted">Day title</label>
                  <input
                    type="text"
                    value={activeDay.name}
                    onChange={(e) => updateActiveDayField('name', e.target.value)}
                    placeholder="Day A - Push"
                    className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm font-medium text-ink"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ink-muted">
                    Focus muscles (optional)
                  </label>
                  <input
                    type="text"
                    value={activeDay.focus || ''}
                    onChange={(e) => updateActiveDayField('focus', e.target.value)}
                    placeholder="Chest, shoulders, triceps"
                    className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={duplicateActiveDayLocalOrRemote}>
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate day
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={removeActiveDay}>
                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                  Remove day
                </Button>
                <Button type="button" size="sm" onClick={() => setIsPickerOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add exercises
                </Button>
              </div>
            </div>
          </Card>

          {activeDay.exercises.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title={`No exercises in ${activeDay.name}`}
              description="Browse the visual exercise grid to add movements, set weights, and group supersets."
              action={
                <Button size="sm" onClick={() => setIsPickerOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Pick exercises
                </Button>
              }
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeDay.exercises.map((ex) => ex._uid || ex.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {activeDay.exercises.map((ex, idx) => (
                    <SortableExerciseRow
                      key={ex._uid || ex.id}
                      exercise={ex}
                      index={idx}
                      totalCount={activeDay.exercises.length}
                      defaultWeightUnit={weightUnit}
                      onChange={(updated) => handleExerciseChange(idx, updated)}
                      onRemove={() => handleExerciseRemove(idx)}
                      onMove={handleExerciseMove}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      <ExercisePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onAddExercises={handleAddExercises}
      />
    </div>
  );
}

export default WorkoutPlanEditor;
