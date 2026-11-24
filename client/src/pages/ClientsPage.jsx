import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, Plus, RotateCcw, Search, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  CLIENT_GOALS,
  WEEKDAYS,
  createClient,
  fetchClientStats,
  fetchClients,
  formatGoal,
  formatShortDate,
  getWeekdayShort,
} from '../lib/clients.api';
import { cn } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ClientFormModal from '../components/clients/ClientFormModal';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function ClientsPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [status, setStatus] = useState('all');
  const [goal, setGoal] = useState('');
  const [trainingDay, setTrainingDay] = useState('');
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: status !== 'all' ? status : undefined,
      goal: goal || undefined,
      trainingDay: trainingDay !== '' ? trainingDay : undefined,
      page,
      limit: 20,
    }),
    [debouncedSearch, status, goal, trainingDay, page]
  );

  const { data: statsData } = useQuery({
    queryKey: ['clients', 'stats'],
    queryFn: fetchClientStats,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['clients', 'list', queryParams],
    queryFn: () => fetchClients(queryParams),
    placeholderData: (prev) => prev,
  });

  const clients = data?.clients || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

  const hasActiveFilters = Boolean(searchInput || status !== 'all' || goal || trainingDay !== '');

  const resetFilters = () => {
    setSearchInput('');
    setStatus('all');
    setGoal('');
    setTrainingDay('');
    setPage(1);
  };

  const handleCreateClient = async (formData) => {
    await createClient(formData);
    toast.success('Client created');
    await queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Clients</h1>
            <span className="font-mono text-xs text-ink-muted tabular-nums">
              {statsData?.total ?? pagination.total} total
            </span>
          </div>
          <p className="text-sm text-ink-secondary">
            Manage client profiles, training goals, injuries, and memberships
          </p>
        </div>

        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add client
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-ink-secondary">Total clients</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-ink">
            {statsData?.total ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-ink-secondary">Active</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-success">
            {statsData?.active ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-ink-secondary">Inactive</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-ink-secondary">
            {statsData?.inactive ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-ink-secondary">Expiring in 14d</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-warning">
            {statsData?.expiringSoon ?? 0}
          </p>
        </Card>
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
              placeholder="Search by client name, phone, or email"
              aria-label="Search clients"
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
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by goal"
              className="h-11 rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
            >
              <option value="">All goals</option>
              {CLIENT_GOALS.map((g) => (
                <option key={g} value={g}>
                  {formatGoal(g)}
                </option>
              ))}
            </select>

            <select
              value={trainingDay}
              onChange={(e) => {
                setTrainingDay(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by training day"
              className="h-11 rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
            >
              <option value="">All training days</option>
              {WEEKDAYS.map((day) => (
                <option key={day.value} value={String(day.value)}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            {STATUS_FILTERS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setStatus(opt.value);
                  setPage(1);
                }}
                className={cn(
                  'h-8 rounded-lg border px-3 text-xs font-medium transition-colors',
                  status === opt.value
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-canvas text-ink-secondary hover:text-ink'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

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

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-6 w-full" />
            </Card>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasActiveFilters ? 'No clients match these filters' : 'No clients added yet'}
          description={
            hasActiveFilters
              ? 'Try clearing your search or status filters.'
              : 'Add your first client to build their workout plan, schedule, and diet.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIsFormOpen(true)}>
                Add first client
              </Button>
            )
          }
        />
      ) : (
        <>
          <div
            className={cn(
              'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 transition-opacity',
              isFetching ? 'opacity-70' : 'opacity-100'
            )}
          >
            {clients.map((client) => {
              const hasMedicalAlert = Boolean(client.medicalNotes || client.injuries?.length > 0);
              return (
                <Link
                  key={client.id}
                  to={`/clients/${client.id}`}
                  className="group flex flex-col justify-between rounded-xl border border-line bg-surface p-4 hover:border-ink-muted/40 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar src={client.photoUrl} name={client.name} size="lg" />
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-medium text-ink group-hover:text-accent transition-colors">
                            {client.name}
                          </h3>
                          <p className="truncate text-xs text-ink-secondary">
                            {client.phone || client.email || 'No contact info'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className="mt-1 h-4 w-4 shrink-0 text-ink-muted group-hover:text-ink transition-colors"
                        strokeWidth={1.75}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={client.status === 'active' ? 'success' : 'neutral'}>
                        {client.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge tone="accent">{formatGoal(client.goal)}</Badge>
                      {hasMedicalAlert && (
                        <Badge tone="warning">
                          <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                          Medical note
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-secondary">
                    <div className="flex flex-wrap gap-1">
                      {client.preferredTrainingDays?.length > 0 ? (
                        client.preferredTrainingDays.map((d) => (
                          <span
                            key={d}
                            className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-ink"
                          >
                            {getWeekdayShort(d)}
                          </span>
                        ))
                      ) : (
                        <span className="text-ink-muted">No days set</span>
                      )}
                    </div>
                    {client.membershipEnd && (
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-muted">
                        Ends {formatShortDate(client.membershipEnd)}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
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

      <ClientFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmitForm={handleCreateClient}
      />
    </div>
  );
}
