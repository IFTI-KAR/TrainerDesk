import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { fetchClients } from '../../lib/clients.api';
import { fetchWorkoutPlans } from '../../lib/workouts.api';
import { createOneOffSession, getTodayDateStr } from '../../lib/schedule.api';
import { getApiErrorMessage } from '../../lib/utils';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

export function OneOffSessionModal({
  isOpen,
  onClose,
  fixedClientId = '',
  defaultDate = '',
}) {
  const { trainer } = useAuth();
  const queryClient = useQueryClient();

  const [clientId, setClientId] = useState(fixedClientId || '');
  const [date, setDate] = useState(defaultDate || getTodayDateStr());
  const [time, setTime] = useState('08:00');
  const [durationMin, setDurationMin] = useState(
    trainer?.preferences?.defaultSessionDuration || 60
  );
  const [workoutDayId, setWorkoutDayId] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setClientId(fixedClientId || '');
    setDate(defaultDate || getTodayDateStr());
    setTime('08:00');
    setDurationMin(trainer?.preferences?.defaultSessionDuration || 60);
    setWorkoutDayId('');
    setSessionNotes('');
  }, [isOpen, fixedClientId, defaultDate, trainer]);

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'active-for-schedule'],
    queryFn: () => fetchClients({ status: 'active', limit: 100 }),
    enabled: isOpen && !fixedClientId,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['workout-plans', { clientId }],
    queryFn: () => fetchWorkoutPlans({ clientId }),
    enabled: isOpen && Boolean(clientId),
  });

  const activePlan = plans.find((p) => p.isActive) || plans[0] || null;
  const workoutDays = activePlan?.workoutDays || [];

  const createMutation = useMutation({
    mutationFn: createOneOffSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('One-off session scheduled');
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to schedule session')),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clientId) {
      toast.error('Select a client');
      return;
    }
    createMutation.mutate({
      clientId,
      date,
      time,
      durationMin: Number(durationMin),
      workoutPlanId: activePlan?.id || null,
      workoutDayId: workoutDayId || null,
      sessionNotes,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule one-off session"
      description="Add a single training session without altering recurring weekly rules"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!fixedClientId && (
          <div className="space-y-1.5">
            <label htmlFor="oneoff-client" className="block text-sm font-medium text-ink">
              Client
            </label>
            <select
              id="oneoff-client"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setWorkoutDayId('');
              }}
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
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
          <Input
            label="Duration (m)"
            type="number"
            min={15}
            max={240}
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="oneoff-day" className="block text-sm font-medium text-ink">
            Workout day (optional)
          </label>
          <select
            id="oneoff-day"
            value={workoutDayId}
            onChange={(e) => setWorkoutDayId(e.target.value)}
            disabled={!clientId || workoutDays.length === 0}
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink disabled:opacity-60"
          >
            <option value="">
              {workoutDays.length > 0 ? 'Custom / open session' : 'No active workout days'}
            </option>
            {workoutDays.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.exercises?.length || 0} exercises)
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="oneoff-notes" className="block text-sm font-medium text-ink">
            Session notes (optional)
          </label>
          <input
            id="oneoff-notes"
            type="text"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Extra mobility or conditioning focus"
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            Schedule session
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default OneOffSessionModal;
