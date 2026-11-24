import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { WEEKDAYS, getWeekdayShort } from '../../lib/clients.api';
import { fetchWorkoutPlans } from '../../lib/workouts.api';
import {
  addDaysStr,
  cancelSession,
  createScheduleRule,
  deleteScheduleRule,
  fetchScheduleRules,
  fetchSessions,
  formatShortWeekdayDate,
  formatTime12h,
  getTodayDateStr,
  updateScheduleRule,
  updateSessionStatus,
} from '../../lib/schedule.api';
import { cn, getApiErrorMessage } from '../../lib/utils';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card, { CardHeader } from '../ui/Card';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Skeleton from '../ui/Skeleton';
import OneOffSessionModal from '../sessions/OneOffSessionModal';
import RescheduleSessionModal from '../sessions/RescheduleSessionModal';

export function ClientScheduleTab({ client }) {
  const { trainer } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const todayStr = getTodayDateStr();
  const endRangeStr = addDaysStr(todayStr, 13);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [daysOfWeek, setDaysOfWeek] = useState([1, 3, 5]);
  const [time, setTime] = useState('08:00');
  const [durationMin, setDurationMin] = useState(
    trainer?.preferences?.defaultSessionDuration || 60
  );
  const [workoutDayId, setWorkoutDayId] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const [deletingRule, setDeletingRule] = useState(null);
  const [isOneOffOpen, setIsOneOffOpen] = useState(false);
  const [reschedulingSession, setReschedulingSession] = useState(null);
  const [cancellingSession, setCancellingSession] = useState(null);

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['schedule-rules', { clientId: client.id }],
    queryFn: () => fetchScheduleRules({ clientId: client.id }),
  });

  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['sessions', { clientId: client.id, startDate: todayStr, endDate: endRangeStr }],
    queryFn: () => fetchSessions({ clientId: client.id, startDate: todayStr, endDate: endRangeStr }),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['workout-plans', { clientId: client.id }],
    queryFn: () => fetchWorkoutPlans({ clientId: client.id }),
  });

  const activePlan = plans.find((p) => p.isActive) || plans[0] || null;
  const workoutDays = activePlan?.workoutDays || [];
  const upcomingSessions = upcomingData?.sessions || [];

  const openCreateRule = () => {
    setEditingRule(null);
    setDaysOfWeek(
      client.preferredTrainingDays?.length > 0 ? client.preferredTrainingDays : [1, 3, 5]
    );
    setTime('08:00');
    setDurationMin(trainer?.preferences?.defaultSessionDuration || 60);
    setWorkoutDayId(workoutDays[0]?.id || '');
    setStartDate(todayStr);
    setEndDate('');
    setNotes('');
    setIsRuleModalOpen(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setDaysOfWeek(rule.daysOfWeek || [1]);
    setTime(rule.time || '08:00');
    setDurationMin(rule.durationMin || 60);
    setWorkoutDayId(rule.workoutDayId || '');
    setStartDate(rule.startDate || todayStr);
    setEndDate(rule.endDate || '');
    setNotes(rule.notes || '');
    setIsRuleModalOpen(true);
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['schedule-rules'] });
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  const saveRuleMutation = useMutation({
    mutationFn: (payload) =>
      editingRule
        ? updateScheduleRule({ id: editingRule.id, payload })
        : createScheduleRule(payload),
    onSuccess: () => {
      invalidateAll();
      setIsRuleModalOpen(false);
      toast.success(editingRule ? 'Schedule rule updated' : 'Recurring schedule added');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save schedule rule')),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: deleteScheduleRule,
    onSuccess: () => {
      invalidateAll();
      setDeletingRule(null);
      toast.success('Recurring schedule removed');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to remove schedule rule')),
  });

  const startSessionMutation = useMutation({
    mutationFn: ({ id }) => updateSessionStatus({ id, status: 'in_progress' }),
    onSuccess: (session) => {
      invalidateAll();
      navigate(`/sessions/${session.id}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to start session')),
  });

  const cancelSessionMutation = useMutation({
    mutationFn: ({ id }) => cancelSession({ id, reason: 'Cancelled by trainer' }),
    onSuccess: () => {
      invalidateAll();
      setCancellingSession(null);
      toast.success('Session occurrence cancelled');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to cancel session')),
  });

  const toggleDay = (val) => {
    setDaysOfWeek((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
    );
  };

  const handleRuleSubmit = (e) => {
    e.preventDefault();
    if (daysOfWeek.length === 0) {
      toast.error('Select at least one day of the week');
      return;
    }
    saveRuleMutation.mutate({
      ...(editingRule ? {} : { clientId: client.id }),
      daysOfWeek,
      time,
      durationMin: Number(durationMin),
      workoutPlanId: activePlan?.id || null,
      workoutDayId: workoutDayId || null,
      startDate,
      endDate: endDate || null,
      notes,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Recurring weekly schedule"
          description="Automatically populates Today's roster and links each day to a workout split"
          action={
            <Button size="sm" onClick={openCreateRule}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Add recurring slot
            </Button>
          }
        />

        {rulesLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : rules.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No recurring schedule set"
            description="Assign fixed weekdays and times so this client automatically appears on Today's dashboard."
            action={
              <Button size="sm" variant="outline" onClick={openCreateRule}>
                Add recurring slot
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-col gap-3 rounded-xl border border-line bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {rule.daysOfWeek.map((d) => (
                      <Badge key={d} tone="accent">
                        {getWeekdayShort(d)}
                      </Badge>
                    ))}
                    <span className="ml-1 inline-flex items-center gap-1 font-mono text-xs text-ink tabular-nums">
                      <Clock className="h-3.5 w-3.5 text-ink-muted" />
                      {formatTime12h(rule.time)} · {rule.durationMin}m
                    </span>
                  </div>
                  <p className="text-sm text-ink-secondary">
                    Workout:{' '}
                    <span className="font-medium text-ink">
                      {rule.workoutDayName || 'Custom / open session'}
                    </span>
                    <span className="ml-3 font-mono text-xs text-ink-muted">
                      From {rule.startDate}
                      {rule.endDate ? ` to ${rule.endDate}` : ''}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditRule(rule)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeletingRule(rule)}
                    aria-label="Delete recurring slot"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Upcoming sessions (next 14 days)"
          description="Generated from recurring rules plus one-off bookings"
          action={
            <Button variant="outline" size="sm" onClick={() => setIsOneOffOpen(true)}>
              <Plus className="h-4 w-4" />
              One-off session
            </Button>
          }
        />

        {upcomingLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : upcomingSessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-secondary">
            No sessions scheduled in the next 14 days.
          </p>
        ) : (
          <div className="divide-y divide-line rounded-xl border border-line bg-canvas">
            {upcomingSessions.map((sess) => (
              <div
                key={sess.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">
                      {formatShortWeekdayDate(sess.date)}
                    </span>
                    <span className="font-mono text-xs text-ink-secondary tabular-nums">
                      {formatTime12h(sess.time)} · {sess.durationMin}m
                    </span>
                    {sess.isOneOff && <Badge tone="neutral">One-off</Badge>}
                  </div>
                  <p className="text-xs text-ink-secondary">
                    {sess.workoutSnapshot?.dayName || 'Custom workout'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {sess.status === 'scheduled' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => startSessionMutation.mutate({ id: sess.id })}
                      >
                        Start
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReschedulingSession(sess)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancellingSession(sess)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/sessions/${sess.id}`)}
                    >
                      {sess.status === 'in_progress' ? 'Continue' : 'View'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRule ? 'Edit recurring schedule' : 'Add recurring schedule'}
        size="md"
      >
        <form onSubmit={handleRuleSubmit} className="space-y-4">
          <div className="space-y-2">
            <span className="block text-sm font-medium text-ink">Training days</span>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => {
                const active = daysOfWeek.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      'h-9 min-w-[46px] rounded-lg border px-3 text-xs font-medium transition-colors',
                      active
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line bg-surface text-ink-secondary hover:text-ink'
                    )}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Session time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
            <Input
              label="Duration (minutes)"
              type="number"
              min={15}
              max={240}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ink">
              Linked workout day (optional)
            </label>
            <select
              value={workoutDayId}
              onChange={(e) => setWorkoutDayId(e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            >
              <option value="">
                {workoutDays.length > 0 ? 'No specific workout day' : 'No active workout plan yet'}
              </option>
              {workoutDays.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.exercises?.length || 0} exercises)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End date (optional)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Main floor rack #2"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveRuleMutation.isPending}>
              {editingRule ? 'Save rule' : 'Create schedule'}
            </Button>
          </div>
        </form>
      </Modal>

      <OneOffSessionModal
        isOpen={isOneOffOpen}
        onClose={() => setIsOneOffOpen(false)}
        fixedClientId={client.id}
      />

      <RescheduleSessionModal
        session={reschedulingSession}
        isOpen={Boolean(reschedulingSession)}
        onClose={() => setReschedulingSession(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingRule)}
        onClose={() => setDeletingRule(null)}
        onConfirm={() => deletingRule && deleteRuleMutation.mutate(deletingRule.id)}
        title="Delete recurring schedule"
        description="Removes future unstarted sessions for this slot. Past completed or logged sessions are preserved."
        confirmLabel="Delete rule"
        isLoading={deleteRuleMutation.isPending}
      />

      <ConfirmDialog
        isOpen={Boolean(cancellingSession)}
        onClose={() => setCancellingSession(null)}
        onConfirm={() => cancellingSession && cancelSessionMutation.mutate({ id: cancellingSession.id })}
        title="Cancel this session"
        description="Cancels only this single occurrence without changing the client's weekly recurring pattern."
        confirmLabel="Cancel session"
        isLoading={cancelSessionMutation.isPending}
      />
    </div>
  );
}

export default ClientScheduleTab;
