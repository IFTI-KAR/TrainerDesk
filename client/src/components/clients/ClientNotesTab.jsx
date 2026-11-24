import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, StickyNote, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { addClientNote, deleteClientNote, updateClient } from '../../lib/clients.api';
import { getApiErrorMessage } from '../../lib/utils';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';

export function ClientNotesTab({ client }) {
  const queryClient = useQueryClient();
  const [pinnedNotes, setPinnedNotes] = useState(client.notes || '');
  const [newEntry, setNewEntry] = useState('');

  useEffect(() => {
    setPinnedNotes(client.notes || '');
  }, [client.id, client.notes]);

  const savePinnedMutation = useMutation({
    mutationFn: (notesText) => updateClient({ id: client.id, formData: { notes: notesText } }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['client', client.id], updated);
      toast.success('Pinned notes saved');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save notes')),
  });

  const addEntryMutation = useMutation({
    mutationFn: (text) => addClientNote({ id: client.id, text }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['client', client.id], updated);
      setNewEntry('');
      toast.success('Coaching note added');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to add note')),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (noteId) => deleteClientNote({ id: client.id, noteId }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['client', client.id], updated);
      toast.success('Note removed');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to remove note')),
  });

  const handleAddEntry = (e) => {
    e.preventDefault();
    const trimmed = newEntry.trim();
    if (!trimmed) return;
    addEntryMutation.mutate(trimmed);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader
            title="Pinned notes"
            description="Persistent reminders shown on this client profile"
          />
          <div className="space-y-3">
            <textarea
              rows={6}
              value={pinnedNotes}
              onChange={(e) => setPinnedNotes(e.target.value)}
              placeholder="Write general coaching cues, preferences, or schedule reminders"
              className="w-full rounded-lg border border-line bg-canvas p-3 text-sm text-ink placeholder:text-ink-muted"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => savePinnedMutation.mutate(pinnedNotes)}
                isLoading={savePinnedMutation.isPending}
                disabled={pinnedNotes === (client.notes || '')}
              >
                Save pinned notes
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:col-span-3">
        <Card>
          <CardHeader
            title="Coaching log"
            description="Timestamped observations, check-ins, and technique updates"
          />
          <form onSubmit={handleAddEntry} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              placeholder="Add a dated coaching note"
              className="h-11 flex-1 rounded-lg border border-line bg-canvas px-3 text-sm text-ink placeholder:text-ink-muted"
            />
            <Button type="submit" isLoading={addEntryMutation.isPending} disabled={!newEntry.trim()}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Add note
            </Button>
          </form>
        </Card>

        {client.noteEntries?.length > 0 ? (
          <div className="space-y-3">
            {client.noteEntries.map((entry) => (
              <Card key={entry.id} className="flex items-start justify-between gap-4 p-4">
                <div className="space-y-1">
                  <p className="text-sm leading-relaxed text-ink">{entry.text}</p>
                  <p className="font-mono text-xs text-ink-muted">
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    }).format(new Date(entry.createdAt))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteEntryMutation.mutate(entry.id)}
                  aria-label="Delete note"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised hover:text-danger transition-colors"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={StickyNote}
            title="No coaching log entries yet"
            description="Add a quick note above after a check-in or training session."
          />
        )}
      </div>
    </div>
  );
}

export default ClientNotesTab;
