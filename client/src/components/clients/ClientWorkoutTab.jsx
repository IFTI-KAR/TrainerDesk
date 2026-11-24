import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookmarkPlus, Copy, Dumbbell, Layers, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  assignWorkoutTemplate,
  createWorkoutPlan,
  deleteWorkoutPlan,
  duplicateWorkoutDay,
  duplicateWorkoutPlan,
  fetchWorkoutPlans,
  fetchWorkoutTemplates,
  savePlanAsTemplate,
  updateWorkoutPlan,
} from '../../lib/workouts.api';
import { fetchClients } from '../../lib/clients.api';
import { getApiErrorMessage } from '../../lib/utils';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Skeleton from '../ui/Skeleton';
import WorkoutPlanEditor from '../workouts/WorkoutPlanEditor';

export function ClientWorkoutTab({ client }) {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [isAssignTplOpen, setIsAssignTplOpen] = useState(false);
  const [selectedTplId, setSelectedTplId] = useState('');
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [targetClientId, setTargetClientId] = useState('');
  const [copyPlanName, setCopyPlanName] = useState('');
  const [isSaveTplOpen, setIsSaveTplOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['workout-plans', { clientId: client.id }],
    queryFn: () => fetchWorkoutPlans({ clientId: client.id }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['workout-templates'],
    queryFn: () => fetchWorkoutTemplates(),
    enabled: isAssignTplOpen || plans.length === 0,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'all-for-copy'],
    queryFn: () => fetchClients({ limit: 100 }),
    enabled: isCopyOpen,
  });

  useEffect(() => {
    if (plans.length === 0) {
      setSelectedPlanId('');
      return;
    }
    if (!selectedPlanId || !plans.some((p) => p.id === selectedPlanId)) {
      const active = plans.find((p) => p.isActive) || plans[0];
      setSelectedPlanId(active.id);
    }
  }, [plans, selectedPlanId]);

  const activePlan = plans.find((p) => p.id === selectedPlanId) || null;

  const invalidatePlanData = () => {
    queryClient.invalidateQueries({ queryKey: ['workout-plans', { clientId: client.id }] });
    queryClient.invalidateQueries({ queryKey: ['client', client.id] });
  };

  const createMutation = useMutation({
    mutationFn: createWorkoutPlan,
    onSuccess: (created) => {
      invalidatePlanData();
      setSelectedPlanId(created.id);
      setIsNewPlanOpen(false);
      setNewPlanName('');
      toast.success('Workout plan created');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to create plan')),
  });

  const updateMutation = useMutation({
    mutationFn: updateWorkoutPlan,
    onSuccess: (updated) => {
      invalidatePlanData();
      toast.success(`Saved (v${updated.version})`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save plan')),
  });

  const duplicateDayMutation = useMutation({
    mutationFn: duplicateWorkoutDay,
    onSuccess: () => {
      invalidatePlanData();
      toast.success('Workout day duplicated');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to duplicate day')),
  });

  const assignTplMutation = useMutation({
    mutationFn: assignWorkoutTemplate,
    onSuccess: (created) => {
      invalidatePlanData();
      setSelectedPlanId(created.id);
      setIsAssignTplOpen(false);
      toast.success('Template assigned to client');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to assign template')),
  });

  const copyPlanMutation = useMutation({
    mutationFn: duplicateWorkoutPlan,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      setIsCopyOpen(false);
      toast.success(
        created.clientId === client.id ? 'Plan duplicated' : 'Plan copied to client'
      );
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to copy plan')),
  });

  const saveTplMutation = useMutation({
    mutationFn: savePlanAsTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      setIsSaveTplOpen(false);
      setTplName('');
      toast.success('Saved to Workout Templates');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save template')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkoutPlan,
    onSuccess: () => {
      invalidatePlanData();
      setIsDeleteOpen(false);
      toast.success('Workout plan deleted');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete plan')),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plans.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={`No workout plan for ${client.name}`}
          description="Build a multi-day training split using the visual exercise picker or assign one of your saved templates."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => setIsNewPlanOpen(true)}>
                <Plus className="h-4 w-4" />
                Create blank plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAssignTplOpen(true)}
                disabled={templates.length === 0}
              >
                <Layers className="h-4 w-4" />
                Assign from template
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                aria-label="Select workout plan"
                className="h-10 rounded-lg border border-line bg-canvas px-3 text-sm font-medium text-ink"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>

              {activePlan && (
                <div className="flex items-center gap-1.5">
                  <Badge tone={activePlan.isActive ? 'success' : 'neutral'}>
                    {activePlan.isActive ? 'Active' : 'Archived'}
                  </Badge>
                  <span className="rounded bg-surface-raised px-2 py-0.5 font-mono text-xs text-ink-secondary tabular-nums">
                    v{activePlan.version}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsNewPlanOpen(true)}>
                <Plus className="h-4 w-4" />
                New plan
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsAssignTplOpen(true)}>
                <Layers className="h-4 w-4" />
                From template
              </Button>
              {activePlan && (
                <>
                  {!activePlan.isActive && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({
                          id: activePlan.id,
                          payload: { isActive: true },
                        })
                      }
                    >
                      Set active
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTargetClientId(client.id);
                      setCopyPlanName(`${activePlan.name} (Copy)`);
                      setIsCopyOpen(true);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTplName(activePlan.name);
                      setIsSaveTplOpen(true);
                    }}
                  >
                    <BookmarkPlus className="h-4 w-4" />
                    Save template
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </>
              )}
            </div>
          </Card>

          {activePlan && (
            <WorkoutPlanEditor
              initialPlan={activePlan}
              isSaving={updateMutation.isPending}
              onSave={(payload) => updateMutation.mutate({ id: activePlan.id, payload })}
              onDuplicateDay={(dayId) =>
                duplicateDayMutation.mutate({ planId: activePlan.id, dayId })
              }
            />
          )}
        </>
      )}

      {/* Create Blank Plan Modal */}
      <Modal
        isOpen={isNewPlanOpen}
        onClose={() => setIsNewPlanOpen(false)}
        title="Create workout plan"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newPlanName.trim()) return;
            createMutation.mutate({
              clientId: client.id,
              name: newPlanName.trim(),
              isActive: true,
              workoutDays: [{ name: 'Day A', focus: '', exercises: [] }],
            });
          }}
          className="space-y-4"
        >
          <Input
            label="Plan name"
            placeholder="4-Day Upper / Lower Split"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsNewPlanOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign From Template Modal */}
      <Modal
        isOpen={isAssignTplOpen}
        onClose={() => setIsAssignTplOpen(false)}
        title="Assign from workout template"
        size="sm"
      >
        {templates.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            No workout templates saved yet. Save any plan as a template or create one in Templates.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedTplId) return;
              assignTplMutation.mutate({
                id: selectedTplId,
                payload: { clientId: client.id, setAsActive: true },
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">Choose template</label>
              <select
                value={selectedTplId}
                onChange={(e) => setSelectedTplId(e.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
                required
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.workoutDays?.length || 0} days)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAssignTplOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={assignTplMutation.isPending}>
                Assign template
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Copy Plan Modal */}
      <Modal
        isOpen={isCopyOpen}
        onClose={() => setIsCopyOpen(false)}
        title="Duplicate or copy plan"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!activePlan) return;
            copyPlanMutation.mutate({
              id: activePlan.id,
              payload: {
                targetClientId: targetClientId || client.id,
                name: copyPlanName.trim() || undefined,
                setAsActive: true,
              },
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ink">Target client</label>
            <select
              value={targetClientId}
              onChange={(e) => setTargetClientId(e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            >
              <option value={client.id}>{client.name} (Same client)</option>
              {(clientsData?.clients || [])
                .filter((c) => c.id !== client.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <Input
            label="New plan name"
            value={copyPlanName}
            onChange={(e) => setCopyPlanName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCopyOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={copyPlanMutation.isPending}>
              Copy plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Save As Template Modal */}
      <Modal
        isOpen={isSaveTplOpen}
        onClose={() => setIsSaveTplOpen(false)}
        title="Save as reusable template"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!activePlan || !tplName.trim()) return;
            saveTplMutation.mutate({
              id: activePlan.id,
              payload: { name: tplName.trim(), goal: client.goal || '' },
            });
          }}
          className="space-y-4"
        >
          <Input
            label="Template name"
            value={tplName}
            onChange={(e) => setTplName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsSaveTplOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveTplMutation.isPending}>
              Save template
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => activePlan && deleteMutation.mutate(activePlan.id)}
        title="Delete workout plan"
        description={`Delete "${activePlan?.name}" from ${client.name}? Past completed session logs will keep their prescribed snapshot.`}
        confirmLabel="Delete plan"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default ClientWorkoutTab;
