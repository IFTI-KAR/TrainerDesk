import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createReminder,
  deleteReminder,
  downloadCsvReport,
  fetchAttendanceReport,
  fetchDashboardStats,
  fetchReminders,
  updateReminder,
} from '../lib/reports.api';
import { fetchClients } from '../lib/clients.api';
import { addDaysStr, getTodayDateStr } from '../lib/schedule.api';
import { cn, getApiErrorMessage } from '../lib/utils';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';

const REMINDER_TYPE_LABELS = {
  follow_up: 'Follow up',
  session: 'Session',
  membership: 'Membership',
  measurement: 'Measurement',
  custom: 'Custom',
};

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const todayStr = getTodayDateStr();

  const [startDate, setStartDate] = useState(() => addDaysStr(todayStr, -29));
  const [endDate, setEndDate] = useState(() => todayStr);
  const [reminderFilter, setReminderFilter] = useState('open');
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [downloadingType, setDownloadingType] = useState('');

  const [remTitle, setRemTitle] = useState('');
  const [remClientId, setRemClientId] = useState('');
  const [remType, setRemType] = useState('follow_up');
  const [remDueAt, setRemDueAt] = useState('');
  const [remNotes, setRemNotes] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['reports', 'dashboard-stats', todayStr],
    queryFn: () => fetchDashboardStats(todayStr),
  });

  const { data: attendanceReport, isLoading: reportLoading } = useQuery({
    queryKey: ['reports', 'attendance', startDate, endDate],
    queryFn: () => fetchAttendanceReport({ startDate, endDate }),
    enabled: Boolean(startDate && endDate && startDate <= endDate),
  });

  const { data: reminders = [], isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders', reminderFilter],
    queryFn: () => fetchReminders({ status: reminderFilter }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'for-reminders'],
    queryFn: () => fetchClients({ limit: 100 }),
  });
  const clientsList = clientsData?.clients || [];

  const createReminderMutation = useMutation({
    mutationFn: createReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reports', 'dashboard-stats'] });
      toast.success('Reminder added');
      setIsReminderModalOpen(false);
      setRemTitle('');
      setRemClientId('');
      setRemType('follow_up');
      setRemDueAt('');
      setRemNotes('');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const toggleReminderMutation = useMutation({
    mutationFn: updateReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reports', 'dashboard-stats'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const deleteReminderMutation = useMutation({
    mutationFn: deleteReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reports', 'dashboard-stats'] });
      toast.success('Reminder deleted');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const handleExportCsv = async (type) => {
    setDownloadingType(type);
    try {
      await downloadCsvReport(
        type,
        type === 'sessions' ? { startDate, endDate } : {}
      );
      toast.success(
        type === 'clients' ? 'Clients CSV downloaded' : 'Sessions CSV downloaded'
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setDownloadingType('');
    }
  };

  const quickFollowUp = (client) => {
    setRemClientId(client.clientId);
    setRemTitle(`Check in with ${client.name} (${client.missedCount} missed sessions)`);
    setRemType('follow_up');
    setIsReminderModalOpen(true);
  };

  const summary = attendanceReport?.summary || {
    totalSessions: 0,
    completed: 0,
    missed: 0,
    cancelled: 0,
    scheduled: 0,
    attendanceRatePct: 0,
    totalVolumeKg: 0,
  };

  const clientRows = useMemo(
    () => (attendanceReport?.clients || []).filter((c) => c.totalSessions > 0 || c.status === 'active'),
    [attendanceReport]
  );

  return (
    <div className="space-y-6">
      {/* Header + CSV Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Reports and reminders</h1>
          <p className="text-sm text-ink-secondary">
            Studio attendance, missed-session follow-ups, and CSV exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            isLoading={downloadingType === 'clients'}
            onClick={() => handleExportCsv('clients')}
          >
            <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
            Export clients CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            isLoading={downloadingType === 'sessions'}
            onClick={() => handleExportCsv('sessions')}
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Export sessions CSV
          </Button>
          <Button size="sm" onClick={() => setIsReminderModalOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            New reminder
          </Button>
        </div>
      </div>

      {/* Studio KPI Strip */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between text-ink-secondary">
              <span className="text-xs font-medium">Active clients</span>
              <Users className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">
              {stats?.activeClientsCount ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {stats?.totalClientsCount ?? 0} total roster
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-ink-secondary">
              <span className="text-xs font-medium">This week sessions</span>
              <CalendarClock className="h-4 w-4 text-accent" strokeWidth={1.75} />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">
              {stats?.sessionsThisWeek?.completed ?? 0} / {stats?.sessionsThisWeek?.total ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {stats?.sessionsThisWeek?.adherencePct ?? 0}% adherence
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-ink-secondary">
              <span className="text-xs font-medium">2+ missed (30d)</span>
              <AlertTriangle
                className={cn(
                  'h-4 w-4',
                  (stats?.missedTwoPlusClients?.length || 0) > 0
                    ? 'text-warning'
                    : 'text-ink-muted'
                )}
                strokeWidth={1.75}
              />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">
              {stats?.missedTwoPlusClients?.length ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {stats?.expiringMembershipsCount ?? 0} expiring in 14d
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-ink-secondary">
              <span className="text-xs font-medium">Open reminders</span>
              <Bell className="h-4 w-4 text-ink-secondary" strokeWidth={1.75} />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">
              {stats?.openRemindersCount ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {stats?.overdueRemindersCount ?? 0} overdue
            </p>
          </Card>
        </div>
      )}

      {/* Missed 2+ Sessions & Expiring Memberships */}
      {((stats?.missedTwoPlusClients?.length || 0) > 0 ||
        (stats?.expiringClients?.length || 0) > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {stats?.missedTwoPlusClients?.length > 0 && (
            <Card className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">
                  Clients with 2+ missed sessions (last 30 days)
                </h2>
                <Badge variant="warning">{stats.missedTwoPlusClients.length}</Badge>
              </div>
              <div className="divide-y divide-line">
                {stats.missedTwoPlusClients.map((c) => (
                  <div
                    key={c.clientId}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <Link
                      to={`/clients/${c.clientId}?tab=schedule`}
                      className="flex min-w-0 items-center gap-2.5 hover:opacity-80"
                    >
                      <Avatar src={c.photoUrl} name={c.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                        <p className="text-xs text-ink-secondary">
                          {c.missedCount} missed · last on {c.lastMissedDate}
                        </p>
                      </div>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => quickFollowUp(c)}>
                      Add reminder
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {stats?.expiringClients?.length > 0 && (
            <Card className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">
                  Memberships expiring within 14 days
                </h2>
                <Badge variant="neutral">{stats.expiringClients.length}</Badge>
              </div>
              <div className="divide-y divide-line">
                {stats.expiringClients.map((c) => (
                  <Link
                    key={c.id}
                    to={`/clients/${c.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
                  >
                    <span className="truncate text-sm font-medium text-ink">{c.name}</span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-warning">
                      {c.daysRemaining === 0 ? 'Today' : `${c.daysRemaining}d left`}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Attendance Report */}
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Attendance summary</h2>
            <p className="text-xs text-ink-secondary">
              Filter date range to inspect per-client completion rates and training volume
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-ink-secondary">
              From
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="ml-1.5 h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-ink"
              />
            </label>
            <label className="text-xs text-ink-secondary">
              To
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="ml-1.5 h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-ink"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-canvas p-3 sm:grid-cols-5">
          <div>
            <p className="text-[11px] text-ink-muted">Total sessions</p>
            <p className="text-lg font-semibold tabular-nums text-ink">{summary.totalSessions}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-muted">Completed</p>
            <p className="text-lg font-semibold tabular-nums text-success">{summary.completed}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-muted">Missed</p>
            <p className="text-lg font-semibold tabular-nums text-danger">{summary.missed}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-muted">Attendance rate</p>
            <p className="text-lg font-semibold tabular-nums text-ink">
              {summary.attendanceRatePct}%
            </p>
          </div>
          <div>
            <p className="text-[11px] text-ink-muted">Total volume</p>
            <p className="text-lg font-semibold tabular-nums text-ink">
              {Math.round(summary.totalVolumeKg || 0).toLocaleString()} kg
            </p>
          </div>
        </div>

        {reportLoading ? (
          <Skeleton className="h-44 rounded-lg" />
        ) : clientRows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No sessions in this date range"
            description="Adjust the date filter or schedule sessions to see attendance metrics."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-medium text-ink-secondary">
                  <th className="py-2 pr-3">Client</th>
                  <th className="px-3 py-2 text-right">Completed</th>
                  <th className="px-3 py-2 text-right">Missed</th>
                  <th className="px-3 py-2 text-right">Scheduled</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="pl-3 py-2 text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {clientRows.map((row) => (
                  <tr key={row.clientId} className="hover:bg-surface-raised/60">
                    <td className="py-2.5 pr-3">
                      <Link
                        to={`/clients/${row.clientId}?tab=progress`}
                        className="flex items-center gap-2.5 font-medium text-ink hover:text-accent"
                      >
                        <Avatar src={row.photoUrl} name={row.name} size="sm" />
                        <span className="truncate">{row.name}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-success">
                      {row.completed}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-danger">
                      {row.missed}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-ink-secondary">
                      {row.scheduled + row.inProgress}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-ink">
                      {row.attendanceRatePct}%
                    </td>
                    <td className="pl-3 py-2.5 text-right font-mono text-xs tabular-nums text-ink-secondary">
                      {Math.round(row.totalVolumeKg || 0).toLocaleString()} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Reminders Section */}
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Trainer reminders</h2>
            <p className="text-xs text-ink-secondary">
              Track follow-ups, measurements due, and membership renewals
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5">
            {['open', 'done', 'all'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setReminderFilter(tab)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
                  reminderFilter === tab
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-ink-secondary hover:text-ink'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {remindersLoading ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : reminders.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={reminderFilter === 'done' ? 'No completed reminders' : 'No open reminders'}
            description="Create a follow-up reminder to stay on top of check-ins and renewals."
            action={
              <Button size="sm" variant="outline" onClick={() => setIsReminderModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Add reminder
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-line">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    aria-label={rem.isDone ? 'Mark as open' : 'Mark as done'}
                    onClick={() =>
                      toggleReminderMutation.mutate({ id: rem.id, isDone: !rem.isDone })
                    }
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                      rem.isDone
                        ? 'border-success bg-success text-white'
                        : 'border-line bg-surface hover:border-accent'
                    )}
                  >
                    {rem.isDone && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                  </button>
                  <div className="min-w-0 space-y-1">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        rem.isDone ? 'line-through text-ink-muted' : 'text-ink'
                      )}
                    >
                      {rem.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
                      <Badge variant="neutral">
                        {REMINDER_TYPE_LABELS[rem.type] || rem.type}
                      </Badge>
                      {rem.client && (
                        <Link
                          to={`/clients/${rem.client.id}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {rem.client.name}
                        </Link>
                      )}
                      {rem.dueAt && (
                        <span className="font-mono text-[11px]">
                          Due {new Date(rem.dueAt).toISOString().slice(0, 10)}
                        </span>
                      )}
                    </div>
                    {rem.notes && <p className="text-xs text-ink-secondary">{rem.notes}</p>}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Delete reminder"
                  onClick={() => deleteReminderMutation.mutate(rem.id)}
                  className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-raised hover:text-danger transition-colors"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* New Reminder Modal */}
      <Modal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        title="New reminder"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!remTitle.trim()) return;
            createReminderMutation.mutate({
              title: remTitle.trim(),
              clientId: remClientId || null,
              type: remType,
              dueAt: remDueAt || null,
              notes: remNotes.trim(),
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="rem-title" className="block text-sm font-medium text-ink">
              Title
            </label>
            <input
              id="rem-title"
              type="text"
              required
              value={remTitle}
              onChange={(e) => setRemTitle(e.target.value)}
              placeholder="Check in on knee soreness"
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="rem-type" className="block text-sm font-medium text-ink">
                Type
              </label>
              <select
                id="rem-type"
                value={remType}
                onChange={(e) => setRemType(e.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
              >
                {Object.entries(REMINDER_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rem-due" className="block text-sm font-medium text-ink">
                Due date
              </label>
              <input
                id="rem-due"
                type="date"
                value={remDueAt}
                onChange={(e) => setRemDueAt(e.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rem-client" className="block text-sm font-medium text-ink">
              Client (optional)
            </label>
            <select
              id="rem-client"
              value={remClientId}
              onChange={(e) => setRemClientId(e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            >
              <option value="">General studio reminder</option>
              {clientsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rem-notes" className="block text-sm font-medium text-ink">
              Notes (optional)
            </label>
            <textarea
              id="rem-notes"
              rows={2}
              value={remNotes}
              onChange={(e) => setRemNotes(e.target.value)}
              placeholder="Follow up before Friday session"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsReminderModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createReminderMutation.isPending}>
              Save reminder
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
