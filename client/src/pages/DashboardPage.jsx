import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  addDaysStr,
  cancelSession,
  fetchSessions,
  fetchWeekSummary,
  formatLongDate,
  getTodayDateStr,
  parseDateStrUtc,
  updateSessionStatus,
} from '../lib/schedule.api';
import { fetchDashboardStats } from '../lib/reports.api';
import { cn, getApiErrorMessage } from '../lib/utils';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import SessionCard from '../components/sessions/SessionCard';
import OneOffSessionModal from '../components/sessions/OneOffSessionModal';
import RescheduleSessionModal from '../components/sessions/RescheduleSessionModal';

const WEEKDAY_SHORT_BY_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const todayStr = getTodayDateStr();
  const selectedDate = searchParams.get('date') || todayStr;
  const isToday = selectedDate === todayStr;

  const [isOneOffOpen, setIsOneOffOpen] = useState(false);
  const [reschedulingSession, setReschedulingSession] = useState(null);
  const [cancellingSession, setCancellingSession] = useState(null);
  const [missedSession, setMissedSession] = useState(null);
  const [missedReason, setMissedReason] = useState('');
  const [startingSessionId, setStartingSessionId] = useState('');

  const setDate = (nextDate) => {
    if (nextDate === todayStr) {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ date: nextDate }, { replace: true });
    }
  };

  const { data: dayData, isLoading } = useQuery({
    queryKey: ['sessions', 'day', selectedDate],
    queryFn: () => fetchSessions({ date: selectedDate }),
  });

  const { data: weekData } = useQuery({
    queryKey: ['sessions', 'week-summary', selectedDate],
    queryFn: () => fetchWeekSummary(selectedDate),
  });

  const { data: studioStats } = useQuery({
    queryKey: ['reports', 'dashboard-stats', selectedDate],
    queryFn: () => fetchDashboardStats(selectedDate),
  });

  const sessions = dayData?.sessions || [];
  const summary = dayData?.summary || { total: 0, completed: 0, remaining: 0 };
  const weekDays = weekData?.days || [];

  const invalidateSessions = () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  const startMutation = useMutation({
    mutationFn: ({ id }) => updateSessionStatus({ id, status: 'in_progress' }),
    onMutate: ({ id }) => setStartingSessionId(id),
    onSuccess: (session) => {
      invalidateSessions();
      navigate(`/sessions/${session.id}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to start session')),
    onSettled: () => setStartingSessionId(''),
  });

  const missedMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      updateSessionStatus({ id, status: 'missed', missedReason: reason }),
    onSuccess: () => {
      invalidateSessions();
      setMissedSession(null);
      setMissedReason('');
      toast.success('Session marked missed');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to update session')),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id }) => cancelSession({ id, reason: 'Cancelled from Today roster' }),
    onSuccess: () => {
      invalidateSessions();
      setCancellingSession(null);
      toast.success('Session cancelled');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to cancel session')),
  });

  return (
    <div className="space-y-6">
      {/* Header + Day Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {isToday ? 'Today' : 'Daily roster'}
            </h1>
            {!isToday && (
              <Button variant="ghost" size="sm" onClick={() => setDate(todayStr)}>
                Jump to today
              </Button>
            )}
          </div>
          <p className="text-sm text-ink-secondary">{formatLongDate(selectedDate)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setDate(addDaysStr(selectedDate, -1))}
              aria-label="Previous day"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label="Pick date"
              className="h-9 bg-transparent px-2 font-mono text-xs text-ink"
            />
            <button
              type="button"
              onClick={() => setDate(addDaysStr(selectedDate, 1))}
              aria-label="Next day"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          <Button size="sm" onClick={() => setIsOneOffOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            One-off session
          </Button>
        </div>
      </div>

      {/* Mon-Sun Week Strip */}
      {weekDays.length > 0 && (
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekDays.map((day) => {
            const isSelected = day.date === selectedDate;
            const isCurrentDay = day.date === todayStr;
            const dayNum = parseDateStrUtc(day.date).getUTCDate();
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setDate(day.date)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border py-2.5 transition-colors',
                  isSelected
                    ? 'border-accent bg-accent-soft text-ink'
                    : 'border-line bg-surface text-ink-secondary hover:border-ink-muted/40 hover:text-ink'
                )}
              >
                <span className="text-[11px] font-medium">
                  {WEEKDAY_SHORT_BY_DOW[day.dayOfWeek]}
                </span>
                <span
                  className={cn(
                    'mt-0.5 text-sm font-semibold tabular-nums',
                    isCurrentDay && !isSelected ? 'text-accent' : ''
                  )}
                >
                  {dayNum}
                </span>
                <span
                  className={cn(
                    'mt-1 rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
                    day.total > 0
                      ? isSelected
                        ? 'bg-accent text-white'
                        : 'bg-surface-raised text-ink'
                      : 'text-ink-muted'
                  )}
                >
                  {day.total}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary Chips */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">Total clients</span>
            <Users className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{summary.total}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.75} />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-success">
            {summary.completed}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">Remaining</span>
            <Clock className="h-4 w-4 text-accent" strokeWidth={1.75} />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{summary.remaining}</p>
        </Card>
      </div>

      {/* Sessions Roster */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={
            isToday
              ? 'No clients scheduled for today'
              : `No clients scheduled for ${selectedDate}`
          }
          description="Set recurring weekly slots on any client profile or add a one-off session for this day."
          action={
            <Button size="sm" onClick={() => setIsOneOffOpen(true)}>
              <Plus className="h-4 w-4" />
              Schedule one-off session
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isStarting={startingSessionId === session.id}
              onStart={(s) => startMutation.mutate({ id: s.id })}
              onReschedule={(s) => setReschedulingSession(s)}
              onMarkMissed={(s) => {
                setMissedSession(s);
                setMissedReason('');
              }}
              onCancel={(s) => setCancellingSession(s)}
            />
          ))}
        </div>
      )}

      {/* Studio Insights Strip */}
      {studioStats && (
        <div className="space-y-3 pt-2">
          {studioStats.missedTwoPlusClients?.length > 0 && (
            <Card className="flex flex-col gap-3 border-warning/40 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-medium text-ink">
                    {studioStats.missedTwoPlusClients.length}{' '}
                    {studioStats.missedTwoPlusClients.length === 1 ? 'client has' : 'clients have'}{' '}
                    missed 2+ sessions in the last 30 days
                  </p>
                  <p className="text-xs text-ink-secondary">
                    {studioStats.missedTwoPlusClients
                      .slice(0, 3)
                      .map((c) => `${c.name} (${c.missedCount})`)
                      .join(', ')}
                  </p>
                </div>
              </div>
              <Link
                to="/reports"
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
              >
                Review in reports
              </Link>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3.5">
              <p className="text-xs text-ink-secondary">Active clients</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                {studioStats.activeClientsCount}
              </p>
            </Card>
            <Card className="p-3.5">
              <p className="text-xs text-ink-secondary">Week adherence</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                {studioStats.sessionsThisWeek?.completed ?? 0}/
                {studioStats.sessionsThisWeek?.total ?? 0}{' '}
                <span className="text-xs font-normal text-ink-muted">
                  ({studioStats.sessionsThisWeek?.adherencePct ?? 0}%)
                </span>
              </p>
            </Card>
            <Link to="/reports" className="block">
              <Card className="h-full p-3.5 hover:border-ink-muted/40 transition-colors">
                <div className="flex items-center justify-between text-ink-secondary">
                  <span className="text-xs">Open reminders</span>
                  <Bell className="h-3.5 w-3.5" strokeWidth={1.75} />
                </div>
                <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                  {studioStats.openRemindersCount ?? 0}
                </p>
              </Card>
            </Link>
          </div>
        </div>
      )}

      <OneOffSessionModal
        isOpen={isOneOffOpen}
        onClose={() => setIsOneOffOpen(false)}
        defaultDate={selectedDate}
      />

      <RescheduleSessionModal
        session={reschedulingSession}
        isOpen={Boolean(reschedulingSession)}
        onClose={() => setReschedulingSession(null)}
      />

      <Modal
        isOpen={Boolean(missedSession)}
        onClose={() => setMissedSession(null)}
        title={`Mark ${missedSession?.client?.name || 'session'} as missed`}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!missedSession) return;
            missedMutation.mutate({ id: missedSession.id, reason: missedReason });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="missed-reason" className="block text-sm font-medium text-ink">
              Reason (optional)
            </label>
            <input
              id="missed-reason"
              type="text"
              value={missedReason}
              onChange={(e) => setMissedReason(e.target.value)}
              placeholder="Client called in sick"
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMissedSession(null)}>
              Back
            </Button>
            <Button type="submit" variant="danger" isLoading={missedMutation.isPending}>
              Mark missed
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(cancellingSession)}
        onClose={() => setCancellingSession(null)}
        onConfirm={() => cancellingSession && cancelMutation.mutate({ id: cancellingSession.id })}
        title="Cancel this session"
        description={`Cancel ${cancellingSession?.client?.name || 'this client'}'s session on ${cancellingSession?.date}? The recurring weekly schedule stays intact.`}
        confirmLabel="Cancel session"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
