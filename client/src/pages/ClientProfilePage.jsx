import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Dumbbell,
  Pencil,
  StickyNote,
  Trash2,
  User,
  Utensils,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  deleteClient,
  fetchClientById,
  formatGoal,
  updateClient,
} from '../lib/clients.api';
import { getApiErrorMessage } from '../lib/utils';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Tabs from '../components/ui/Tabs';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ClientFormModal from '../components/clients/ClientFormModal';
import ClientOverviewTab from '../components/clients/ClientOverviewTab';
import ClientScheduleTab from '../components/clients/ClientScheduleTab';
import ClientWorkoutTab from '../components/clients/ClientWorkoutTab';
import ClientDietTab from '../components/clients/ClientDietTab';
import ClientProgressTab from '../components/clients/ClientProgressTab';
import ClientNotesTab from '../components/clients/ClientNotesTab';

const PROFILE_TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'workout', label: 'Workout Plan', icon: Dumbbell },
  { id: 'diet', label: 'Diet', icon: Utensils },
  { id: 'progress', label: 'Progress', icon: Activity },
  { id: 'notes', label: 'Notes', icon: StickyNote },
];

export default function ClientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab') || 'overview';
  const activeTab = PROFILE_TABS.some((t) => t.id === rawTab) ? rawTab : 'overview';

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: client, isLoading, isError } = useQuery({
    queryKey: ['client', id],
    queryFn: () => fetchClientById(id),
  });

  const handleTabChange = (nextTab) => {
    setSearchParams({ tab: nextTab }, { replace: true });
  };

  const handleUpdateClient = async (formData) => {
    const updated = await updateClient({ id, formData });
    queryClient.setQueryData(['client', id], updated);
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    toast.success('Client updated');
  };

  const toggleStatusMutation = useMutation({
    mutationFn: () =>
      updateClient({
        id,
        formData: { status: client.status === 'active' ? 'inactive' : 'active' },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['client', id], updated);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Client marked ${updated.status}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to update status')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted');
      navigate('/clients', { replace: true });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete client')),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !client) {
    return (
      <div className="space-y-4">
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to clients
        </Link>
        <EmptyState
          icon={User}
          title="Client not found"
          description="This client may have been deleted or belongs to another trainer account."
          action={
            <Link to="/clients">
              <Button size="sm">Return to clients</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/clients"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink transition-colors"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Clients
      </Link>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={client.photoUrl} name={client.name} size="xl" />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  {client.name}
                </h1>
                <Badge tone={client.status === 'active' ? 'success' : 'neutral'}>
                  {client.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
                <Badge tone="accent">{formatGoal(client.goal)}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-secondary">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="hover:text-ink">
                    {client.phone}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="hover:text-ink">
                    {client.email}
                  </a>
                )}
                {client.startingWeightKg !== null && (
                  <span className="tabular-nums">
                    Start: {client.startingWeightKg} kg
                    {client.targetWeightKg !== null ? ` -> Goal: ${client.targetWeightKg} kg` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleStatusMutation.mutate()}
              isLoading={toggleStatusMutation.isPending}
            >
              {client.status === 'active' ? 'Mark inactive' : 'Mark active'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              Delete
            </Button>
          </div>
        </div>
      </Card>

      <Tabs tabs={PROFILE_TABS} activeTab={activeTab} onChange={handleTabChange} />

      {activeTab === 'overview' && <ClientOverviewTab client={client} />}
      {activeTab === 'schedule' && <ClientScheduleTab client={client} />}
      {activeTab === 'workout' && <ClientWorkoutTab client={client} />}

      {activeTab === 'diet' && <ClientDietTab client={client} />}

      {activeTab === 'progress' && <ClientProgressTab client={client} />}

      {activeTab === 'notes' && <ClientNotesTab client={client} />}

      <ClientFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initialClient={client}
        onSubmitForm={handleUpdateClient}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete client"
        description={`Delete "${client.name}" and all associated profile data? This cannot be undone.`}
        confirmLabel="Delete client"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
