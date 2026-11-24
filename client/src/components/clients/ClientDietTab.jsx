import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookmarkPlus,
  Copy,
  Download,
  ExternalLink,
  Layers,
  Plus,
  Share2,
  Trash2,
  Utensils,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { exportDietPlanPdf } from '../../lib/pdfExport';
import {
  assignDietTemplate,
  createDietPlan,
  deleteDietPlan,
  duplicateDietPlan,
  fetchDietPlans,
  fetchDietTemplates,
  saveDietPlanAsTemplate,
  updateDietPlan,
} from '../../lib/diet.api';
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
import DietPlanEditor from '../diet/DietPlanEditor';

const DAY_TYPE_LABELS = {
  all: 'All days',
  training: 'Training days',
  rest: 'Rest days',
};

export function ClientDietTab({ client }) {
  const { trainer } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDayType, setNewDayType] = useState('all');

  const [isTplOpen, setIsTplOpen] = useState(false);
  const [selectedTplId, setSelectedTplId] = useState('');

  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [targetClientId, setTargetClientId] = useState('');
  const [copyName, setCopyName] = useState('');

  const [isSaveTplOpen, setIsSaveTplOpen] = useState(false);
  const [saveTplName, setSaveTplName] = useState('');

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['diet-plans', { clientId: client.id }],
    queryFn: () => fetchDietPlans({ clientId: client.id }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['diet-templates'],
    queryFn: () => fetchDietTemplates(),
    enabled: isTplOpen || plans.length === 0,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'for-diet-copy'],
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

  const invalidateDiet = () => {
    queryClient.invalidateQueries({ queryKey: ['diet-plans'] });
    queryClient.invalidateQueries({ queryKey: ['client', client.id] });
  };

  const createMutation = useMutation({
    mutationFn: createDietPlan,
    onSuccess: (created) => {
      invalidateDiet();
      setSelectedPlanId(created.id);
      setIsNewOpen(false);
      setNewName('');
      toast.success('Diet plan created');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to create diet plan')),
  });

  const updateMutation = useMutation({
    mutationFn: updateDietPlan,
    onSuccess: () => {
      invalidateDiet();
      toast.success('Diet plan saved');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save diet plan')),
  });

  const assignTplMutation = useMutation({
    mutationFn: assignDietTemplate,
    onSuccess: (created) => {
      invalidateDiet();
      setSelectedPlanId(created.id);
      setIsTplOpen(false);
      toast.success('Diet template assigned');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to assign template')),
  });

  const copyMutation = useMutation({
    mutationFn: duplicateDietPlan,
    onSuccess: () => {
      invalidateDiet();
      setIsCopyOpen(false);
      toast.success('Diet plan copied');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to copy diet plan')),
  });

  const saveTplMutation = useMutation({
    mutationFn: saveDietPlanAsTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diet-templates'] });
      setIsSaveTplOpen(false);
      toast.success('Saved to Diet Templates');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save template')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDietPlan,
    onSuccess: () => {
      invalidateDiet();
      setIsDeleteOpen(false);
      toast.success('Diet plan deleted');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete diet plan')),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const shareUrl = activePlan?.shareToken
    ? `${window.location.origin}/share/diet/${activePlan.shareToken}`
    : '';
  const whatsappHref = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(
        `Hi ${client.name.split(' ')[0]}, here is your TrainerDesk diet plan (${activePlan.name}): ${shareUrl}`
      )}`
    : '';

  return (
    <div className="space-y-4">
      {plans.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title={`No diet plan for ${client.name}`}
          description="Set calorie and macro targets and prescribe measured meals using grams, rotis, katori, and cups."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => setIsNewOpen(true)}>
                <Plus className="h-4 w-4" />
                Create diet plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={templates.length === 0}
                onClick={() => setIsTplOpen(true)}
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
                aria-label="Select diet plan"
                className="h-10 rounded-lg border border-line bg-canvas px-3 text-sm font-medium text-ink"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {DAY_TYPE_LABELS[p.dayType || 'all']}
                  </option>
                ))}
              </select>

              {activePlan && (
                <Badge tone="accent">{DAY_TYPE_LABELS[activePlan.dayType || 'all']}</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsNewOpen(true)}>
                <Plus className="h-4 w-4" />
                New plan
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsTplOpen(true)}>
                <Layers className="h-4 w-4" />
                From template
              </Button>
              {activePlan && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTargetClientId(client.id);
                      setCopyName(`${activePlan.name} (Copy)`);
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
                      setSaveTplName(activePlan.name);
                      setIsSaveTplOpen(true);
                    }}
                  >
                    <BookmarkPlus className="h-4 w-4" />
                    Template
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsShareOpen(true)}>
                    <Share2 className="h-4 w-4" />
                    Share / Print
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </>
              )}
            </div>
          </Card>

          {activePlan && (
            <DietPlanEditor
              initialPlan={activePlan}
              isSaving={updateMutation.isPending}
              onSave={(payload) => updateMutation.mutate({ id: activePlan.id, payload })}
            />
          )}
        </>
      )}

      {/* Create New Diet Plan */}
      <Modal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        title="Create diet plan"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            createMutation.mutate({
              clientId: client.id,
              name: newName.trim(),
              dayType: newDayType,
              meals: [
                { name: 'Breakfast', time: '08:00', items: [] },
                { name: 'Lunch', time: '13:30', items: [] },
                { name: 'Dinner', time: '20:30', items: [] },
              ],
            });
          }}
          className="space-y-4"
        >
          <Input
            label="Plan name"
            placeholder="Fat Loss 1800 kcal"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ink">Day type</label>
            <select
              value={newDayType}
              onChange={(e) => setNewDayType(e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            >
              <option value="all">All days</option>
              <option value="training">Training days</option>
              <option value="rest">Rest days</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign From Diet Template */}
      <Modal
        isOpen={isTplOpen}
        onClose={() => setIsTplOpen(false)}
        title="Assign diet template"
        size="sm"
      >
        {templates.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            No diet templates saved yet. Save a plan as a template or create one in Templates.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedTplId) return;
              assignTplMutation.mutate({
                id: selectedTplId,
                payload: { clientId: client.id },
              });
            }}
            className="space-y-4"
          >
            <select
              value={selectedTplId}
              onChange={(e) => setSelectedTplId(e.target.value)}
              required
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            >
              <option value="">Select template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.dailyTotals?.calories || 0} kcal)
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsTplOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={assignTplMutation.isPending}>
                Assign
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Copy Diet Plan */}
      <Modal
        isOpen={isCopyOpen}
        onClose={() => setIsCopyOpen(false)}
        title="Copy diet plan"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!activePlan) return;
            copyMutation.mutate({
              id: activePlan.id,
              payload: {
                targetClientId: targetClientId || client.id,
                name: copyName.trim() || undefined,
              },
            });
          }}
          className="space-y-4"
        >
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
          <Input
            label="Plan name"
            value={copyName}
            onChange={(e) => setCopyName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCopyOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={copyMutation.isPending}>
              Copy plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Save As Diet Template */}
      <Modal
        isOpen={isSaveTplOpen}
        onClose={() => setIsSaveTplOpen(false)}
        title="Save as diet template"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!activePlan || !saveTplName.trim()) return;
            saveTplMutation.mutate({
              id: activePlan.id,
              payload: { name: saveTplName.trim(), goal: client.goal || '' },
            });
          }}
          className="space-y-4"
        >
          <Input
            label="Template name"
            value={saveTplName}
            onChange={(e) => setSaveTplName(e.target.value)}
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

      {/* Share / Print Modal */}
      <Modal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title="Share or print diet plan"
        description="Send a clean read-only meal plan to your client via WhatsApp or print/save as PDF"
        size="sm"
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-line bg-canvas p-2.5 font-mono text-xs break-all text-ink-secondary">
            {shareUrl}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
                toast.success('Share link copied');
              }}
            >
              Copy share link
            </Button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-success px-4 text-sm font-medium text-white hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" />
              Share via WhatsApp
            </a>
            <Button
              variant="outline"
              onClick={() => {
                exportDietPlanPdf({
                  plan: activePlan,
                  clientName: client?.name,
                  trainer,
                });
                toast.success('Diet plan PDF downloaded');
              }}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Open printable / PDF view
            </a>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => activePlan && deleteMutation.mutate(activePlan.id)}
        title="Delete diet plan"
        description={`Delete "${activePlan?.name}"?`}
        confirmLabel="Delete plan"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default ClientDietTab;
