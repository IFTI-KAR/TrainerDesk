import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, Dumbbell, Plus, Trash2, UserPlus, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  assignWorkoutTemplate,
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  fetchWorkoutTemplates,
  updateWorkoutTemplate,
} from '../lib/workouts.api';
import {
  assignDietTemplate,
  createDietTemplate,
  deleteDietTemplate,
  fetchDietTemplates,
  updateDietTemplate,
} from '../lib/diet.api';
import { fetchClients, formatGoal } from '../lib/clients.api';
import { getApiErrorMessage } from '../lib/utils';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import WorkoutPlanEditor from '../components/workouts/WorkoutPlanEditor';
import DietPlanEditor from '../components/diet/DietPlanEditor';

const TEMPLATE_TABS = [
  { id: 'workouts', label: 'Workout Templates', icon: Dumbbell },
  { id: 'diets', label: 'Diet Templates', icon: Utensils },
];

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('workouts');

  const [editingWorkoutTpl, setEditingWorkoutTpl] = useState(null);
  const [assigningWorkoutTpl, setAssigningWorkoutTpl] = useState(null);
  const [deletingWorkoutTpl, setDeletingWorkoutTpl] = useState(null);

  const [editingDietTpl, setEditingDietTpl] = useState(null);
  const [assigningDietTpl, setAssigningDietTpl] = useState(null);
  const [deletingDietTpl, setDeletingDietTpl] = useState(null);

  const [assignClientId, setAssignClientId] = useState('');

  const { data: workoutTemplates = [], isLoading: workoutLoading } = useQuery({
    queryKey: ['workout-templates'],
    queryFn: () => fetchWorkoutTemplates(),
  });

  const { data: dietTemplates = [], isLoading: dietLoading } = useQuery({
    queryKey: ['diet-templates'],
    queryFn: () => fetchDietTemplates(),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'for-template-assign'],
    queryFn: () => fetchClients({ limit: 100 }),
    enabled: Boolean(assigningWorkoutTpl || assigningDietTpl),
  });

  const createWorkoutMutation = useMutation({
    mutationFn: createWorkoutTemplate,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      setEditingWorkoutTpl(created);
      toast.success('Workout template created');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to create template')),
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: updateWorkoutTemplate,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      setEditingWorkoutTpl(updated);
      toast.success('Template saved');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save template')),
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: deleteWorkoutTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      setDeletingWorkoutTpl(null);
      toast.success('Template deleted');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete template')),
  });

  const assignWorkoutMutation = useMutation({
    mutationFn: assignWorkoutTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setAssigningWorkoutTpl(null);
      setAssignClientId('');
      toast.success('Workout template assigned to client');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to assign template')),
  });

  const createDietMutation = useMutation({
    mutationFn: createDietTemplate,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['diet-templates'] });
      setEditingDietTpl(created);
      toast.success('Diet template created');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to create diet template')),
  });

  const updateDietMutation = useMutation({
    mutationFn: updateDietTemplate,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['diet-templates'] });
      setEditingDietTpl(updated);
      toast.success('Diet template saved');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save diet template')),
  });

  const deleteDietMutation = useMutation({
    mutationFn: deleteDietTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diet-templates'] });
      setDeletingDietTpl(null);
      toast.success('Diet template deleted');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete diet template')),
  });

  const assignDietMutation = useMutation({
    mutationFn: assignDietTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diet-plans'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setAssigningDietTpl(null);
      setAssignClientId('');
      toast.success('Diet template assigned to client');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to assign diet template')),
  });

  if (editingWorkoutTpl) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setEditingWorkoutTpl(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Back to templates
          </button>
          {editingWorkoutTpl.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssigningWorkoutTpl(editingWorkoutTpl)}
            >
              <UserPlus className="h-4 w-4" />
              Assign to client
            </Button>
          )}
        </div>
        <WorkoutPlanEditor
          initialPlan={editingWorkoutTpl}
          isSaving={createWorkoutMutation.isPending || updateWorkoutMutation.isPending}
          onSave={(payload) =>
            editingWorkoutTpl.id
              ? updateWorkoutMutation.mutate({ id: editingWorkoutTpl.id, payload })
              : createWorkoutMutation.mutate(payload)
          }
        />
      </div>
    );
  }

  if (editingDietTpl) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setEditingDietTpl(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Back to templates
          </button>
          {editingDietTpl.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssigningDietTpl(editingDietTpl)}
            >
              <UserPlus className="h-4 w-4" />
              Assign to client
            </Button>
          )}
        </div>
        <DietPlanEditor
          initialPlan={editingDietTpl}
          showDayType={false}
          isSaving={createDietMutation.isPending || updateDietMutation.isPending}
          onSave={(payload) =>
            editingDietTpl.id
              ? updateDietMutation.mutate({ id: editingDietTpl.id, payload })
              : createDietMutation.mutate(payload)
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Templates</h1>
          <p className="text-sm text-ink-secondary">
            Reusable workout splits and measured diet frameworks ready to assign to any client
          </p>
        </div>

        {activeTab === 'workouts' ? (
          <Button
            onClick={() =>
              setEditingWorkoutTpl({
                name: 'New Workout Template',
                description: '',
                workoutDays: [{ name: 'Day A', focus: '', exercises: [] }],
              })
            }
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            New workout template
          </Button>
        ) : (
          <Button
            onClick={() =>
              setEditingDietTpl({
                name: 'New Diet Template',
                targets: { calories: 2000, protein: 140, carbs: 220, fat: 65, fiber: 30, waterLiters: 3 },
                meals: [{ name: 'Breakfast', time: '08:00', items: [] }],
                supplements: [],
                notes: '',
              })
            }
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            New diet template
          </Button>
        )}
      </div>

      <Tabs tabs={TEMPLATE_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'workouts' ? (
        workoutLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : workoutTemplates.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No workout templates yet"
            description="Create a reusable workout split or save an existing client plan as a template."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workoutTemplates.map((tpl) => {
              const exCount = (tpl.workoutDays || []).reduce(
                (acc, d) => acc + (d.exercises?.length || 0),
                0
              );
              return (
                <Card key={tpl.id} className="flex flex-col justify-between gap-4 p-5">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-ink">{tpl.name}</h3>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {tpl.isGlobal && <Badge tone="neutral">Built-in</Badge>}
                        {tpl.goal && <Badge tone="accent">{formatGoal(tpl.goal)}</Badge>}
                      </div>
                    </div>
                    {tpl.description && (
                      <p className="line-clamp-2 text-xs text-ink-secondary">{tpl.description}</p>
                    )}
                    <p className="font-mono text-xs text-ink-muted tabular-nums">
                      {tpl.workoutDays?.length || 0} days · {exCount} exercises
                    </p>
                  </div>

                  <div className="flex items-center gap-2 border-t border-line pt-3">
                    {tpl.isGlobal ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setEditingWorkoutTpl({
                            name: `${tpl.name} (Custom)`,
                            description: tpl.description || '',
                            goal: tpl.goal || '',
                            tags: tpl.tags || [],
                            workoutDays: (tpl.workoutDays || []).map((d) => ({
                              ...d,
                              id: undefined,
                            })),
                          })
                        }
                      >
                        Customize copy
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => setEditingWorkoutTpl(tpl)}>
                        Edit
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setAssigningWorkoutTpl(tpl)}>
                      <UserPlus className="h-3.5 w-3.5" />
                      Assign
                    </Button>
                    {!tpl.isGlobal && (
                      <button
                        type="button"
                        onClick={() => setDeletingWorkoutTpl(tpl)}
                        aria-label={`Delete ${tpl.name}`}
                        className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : dietLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : dietTemplates.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No diet templates yet"
          description="Create a reusable diet framework or save a client's meal plan as a template."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dietTemplates.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col justify-between gap-4 p-5">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-ink">{tpl.name}</h3>
                  {tpl.goal && <Badge tone="accent">{formatGoal(tpl.goal)}</Badge>}
                </div>
                <p className="font-mono text-xs text-ink-muted tabular-nums">
                  {tpl.dailyTotals?.calories || 0} kcal · {tpl.dailyTotals?.protein || 0}g P ·{' '}
                  {tpl.meals?.length || 0} meals
                </p>
              </div>

              <div className="flex items-center gap-2 border-t border-line pt-3">
                <Button variant="secondary" size="sm" onClick={() => setEditingDietTpl(tpl)}>
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAssigningDietTpl(tpl)}>
                  <UserPlus className="h-3.5 w-3.5" />
                  Assign
                </Button>
                <button
                  type="button"
                  onClick={() => setDeletingDietTpl(tpl)}
                  aria-label={`Delete ${tpl.name}`}
                  className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Modal (shared for Workout & Diet templates) */}
      <Modal
        isOpen={Boolean(assigningWorkoutTpl || assigningDietTpl)}
        onClose={() => {
          setAssigningWorkoutTpl(null);
          setAssigningDietTpl(null);
          setAssignClientId('');
        }}
        title="Assign template to client"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!assignClientId) return;
            if (assigningWorkoutTpl) {
              assignWorkoutMutation.mutate({
                id: assigningWorkoutTpl.id,
                payload: { clientId: assignClientId, setAsActive: true },
              });
            } else if (assigningDietTpl) {
              assignDietMutation.mutate({
                id: assigningDietTpl.id,
                payload: { clientId: assignClientId, setAsActive: true },
              });
            }
          }}
          className="space-y-4"
        >
          <select
            value={assignClientId}
            onChange={(e) => setAssignClientId(e.target.value)}
            required
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
          >
            <option value="">Select client...</option>
            {(clientsData?.clients || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAssigningWorkoutTpl(null);
                setAssigningDietTpl(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={assignWorkoutMutation.isPending || assignDietMutation.isPending}
            >
              Assign plan
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingWorkoutTpl)}
        onClose={() => setDeletingWorkoutTpl(null)}
        onConfirm={() => deletingWorkoutTpl && deleteWorkoutMutation.mutate(deletingWorkoutTpl.id)}
        title="Delete workout template"
        description={`Delete "${deletingWorkoutTpl?.name}"?`}
        confirmLabel="Delete"
        isLoading={deleteWorkoutMutation.isPending}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingDietTpl)}
        onClose={() => setDeletingDietTpl(null)}
        onConfirm={() => deletingDietTpl && deleteDietMutation.mutate(deletingDietTpl.id)}
        title="Delete diet template"
        description={`Delete "${deletingDietTpl?.name}"?`}
        confirmLabel="Delete"
        isLoading={deleteDietMutation.isPending}
      />
    </div>
  );
}
