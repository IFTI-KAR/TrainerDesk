import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { rescheduleSession } from '../../lib/schedule.api';
import { getApiErrorMessage } from '../../lib/utils';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

export function RescheduleSessionModal({ session, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMin, setDurationMin] = useState(60);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen && session) {
      setDate(session.date || '');
      setTime(session.time || '08:00');
      setDurationMin(session.durationMin || 60);
      setReason('');
    }
  }, [isOpen, session]);

  const mutation = useMutation({
    mutationFn: rescheduleSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session rescheduled');
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to reschedule session')),
  });

  if (!session) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      id: session.id,
      payload: {
        date,
        time,
        durationMin: Number(durationMin),
        reason,
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reschedule ${session.client?.name || 'session'}`}
      description="Moves only this single session. The recurring weekly pattern stays unchanged."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="New date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="New time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>

        <Input
          label="Duration (minutes)"
          type="number"
          min={15}
          max={240}
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
        />

        <Input
          label="Reason (optional)"
          placeholder="Client requested evening slot"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Move session
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default RescheduleSessionModal;
