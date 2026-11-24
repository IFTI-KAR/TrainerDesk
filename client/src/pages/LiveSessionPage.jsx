import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  CloudOff,
  Dumbbell,
  RefreshCw,
  Trophy,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  SESSION_STATUS_META,
  completeSession,
  fetchLiveSession,
  formatLongDate,
  formatTime12h,
  logSessionProgress,
  updateSessionStatus,
} from '../lib/schedule.api';
import {
  enqueueSessionLog,
  flushSessionQueue,
  getQueuedSessionLog,
  removeQueuedSessionLog,
} from '../lib/offlineQueue';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useRestTimer } from '../hooks/useRestTimer';
import { cn, getApiErrorMessage } from '../lib/utils';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import LiveExerciseCard from '../components/sessions/LiveExerciseCard';
import RestTimerBar from '../components/sessions/RestTimerBar';

function parseTargetRepsInt(str) {
  const m = /\d+/.exec(String(str || '10'));
  return m ? Number(m[0]) : 10;
}

function buildInitialLoggedExercises(session, defaultUnit = 'kg') {
  const snapshotList = session.workoutSnapshot?.exercises || [];
  const existingMap = new Map(
    (session.loggedExercises || []).map((le) => [String(le.exerciseId), le])
  );

  const built = snapshotList.map((snap) => {
    const existing = existingMap.get(String(snap.exerciseId));
    if (existing && existing.sets?.length > 0) {
      return {
        exerciseId: String(snap.exerciseId),
        exerciseName: snap.name,
        notes: existing.notes || '',
        sets: existing.sets.map((s, idx) => ({
          setNumber: s.setNumber || idx + 1,
          reps: s.reps ?? null,
          durationSec: s.durationSec ?? null,
          weight: s.weight ?? null,
          weightUnit: s.weightUnit || defaultUnit,
          completed: Boolean(s.completed),
          isPR: Boolean(s.isPR),
          prTypes: s.prTypes || [],
        })),
      };
    }

    const isTimed = snap.trackingType === 'duration';
    const isBodyweight = snap.trackingType === 'reps_only';

    return {
      exerciseId: String(snap.exerciseId),
      exerciseName: snap.name,
      notes: '',
      sets: (snap.targetSets || []).map((ts, idx) => ({
        setNumber: ts.setNumber || idx + 1,
        reps: isTimed ? null : parseTargetRepsInt(ts.targetReps),
        durationSec: isTimed ? (ts.targetDurationSec ?? 45) : null,
        weight: isTimed || isBodyweight ? null : (ts.targetWeight ?? 0),
        weightUnit: ts.weightUnit || defaultUnit,
        completed: false,
        isPR: false,
        prTypes: [],
      })),
    };
  });

  // Include any extra logged exercises not in snapshot
  for (const existing of session.loggedExercises || []) {
    if (!snapshotList.some((s) => String(s.exerciseId) === String(existing.exerciseId))) {
      built.push(existing);
    }
  }

  return built;
}

function computeOptimisticMetrics(exercises, historicalBestByExercise = {}) {
  let totalVolume = 0;
  let prCount = 0;
  let completedSets = 0;
  let totalSets = 0;

  const annotated = exercises.map((ex) => {
    const hist = historicalBestByExercise[String(ex.exerciseId)];
    let maxW = hist?.maxWeightKg || 0;
    let max1RM = hist?.maxEst1RMKg || 0;

    const sets = (ex.sets || []).map((s) => {
      totalSets += 1;
      if (!s.completed) {
        return { ...s, isPR: false };
      }
      completedSets += 1;
      const w = Number(s.weight || 0);
      const r = Number(s.reps || 0);
      if (w > 0 && r > 0) {
        totalVolume += w * r;
      }

      let isPR = Boolean(s.isPR);
      if (hist?.hasHistory && w > 0 && r > 0) {
        const wKg = s.weightUnit === 'lb' ? w * 0.45359237 : w;
        const est1RM = r === 1 ? wKg : wKg * (1 + r / 30);
        if (wKg > maxW || est1RM > max1RM) {
          isPR = true;
          maxW = Math.max(maxW, wKg);
          max1RM = Math.max(max1RM, est1RM);
        }
      }
      if (isPR) prCount += 1;
      return { ...s, isPR };
    });

    return { ...ex, sets };
  });

  return {
    annotated,
    totalVolume: Math.round(totalVolume),
    prCount,
    completedSets,
    totalSets,
  };
}

export default function LiveSessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { trainer } = useAuth();
  const isOnline = useOnlineStatus();
  const restTimer = useRestTimer();

  const defaultUnit = trainer?.preferences?.weightUnit || 'kg';

  const [loggedExercises, setLoggedExercises] = useState([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [syncState, setSyncState] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'offline' | 'error'
  const [initializedForId, setInitializedForId] = useState('');
  const [isMissedOpen, setIsMissedOpen] = useState(false);
  const [missedReason, setMissedReason] = useState('');
  const [completionSummary, setCompletionSummary] = useState(null);

  const saveTimerRef = useRef(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['session', id, 'live'],
    queryFn: () => fetchLiveSession(id),
  });

  const session = data?.session;
  const previousByExercise = data?.previousByExercise || {};
  const historicalBestByExercise = useMemo(
    () => data?.historicalBestByExercise || {},
    [data?.historicalBestByExercise]
  );

  useEffect(() => {
    if (!session || initializedForId === session.id) return;

    const queued = getQueuedSessionLog(session.id);
    if (queued?.payload) {
      setLoggedExercises(queued.payload.loggedExercises || []);
      setSessionNotes(queued.payload.sessionNotes ?? session.sessionNotes ?? '');
      setSyncState('offline');
    } else {
      setLoggedExercises(buildInitialLoggedExercises(session, defaultUnit));
      setSessionNotes(session.sessionNotes || '');
      setSyncState('saved');
    }
    setInitializedForId(session.id);
  }, [session, initializedForId, defaultUnit]);

  const buildPayload = useCallback(
    (exercises, notes) => ({
      loggedExercises: exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        notes: ex.notes || '',
        sets: (ex.sets || []).map((s, idx) => ({
          setNumber: s.setNumber || idx + 1,
          reps: s.reps,
          durationSec: s.durationSec,
          weight: s.weight,
          weightUnit: s.weightUnit || defaultUnit,
          completed: Boolean(s.completed),
        })),
      })),
      sessionNotes: notes,
      clientSyncId: `${Date.now()}`,
    }),
    [defaultUnit]
  );

  const syncPayloadNow = useCallback(
    async (exercises, notes) => {
      if (!session) return;
      const payload = buildPayload(exercises, notes);

      if (!navigator.onLine) {
        enqueueSessionLog(session.id, payload);
        setSyncState('offline');
        return;
      }

      setSyncState('saving');
      try {
        const res = await logSessionProgress({ id: session.id, payload });
        removeQueuedSessionLog(session.id);
        setSyncState('saved');
        if (res.prHighlights?.length > 0) {
          toast.success(`New personal record on ${res.prHighlights[0].exerciseName}`, {
            id: `pr-${res.prHighlights[0].exerciseId}`,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
      } catch (err) {
        if (!err.response) {
          enqueueSessionLog(session.id, payload);
          setSyncState('offline');
        } else {
          setSyncState('error');
        }
      }
    },
    [session, buildPayload, queryClient]
  );

  const scheduleDebouncedSave = useCallback(
    (nextExercises, nextNotes) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        syncPayloadNow(nextExercises, nextNotes);
      }, 800);
    },
    [syncPayloadNow]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Flush offline queue automatically when back online
  useEffect(() => {
    if (!isOnline) return;
    const queued = session ? getQueuedSessionLog(session.id) : null;
    if (!queued) return;

    flushSessionQueue((sid, payload) => logSessionProgress({ id: sid, payload })).then((results) => {
      const allOk = results.every((r) => r.ok);
      if (allOk && results.length > 0) {
        setSyncState('saved');
        toast.success('Offline workout logs synced');
        queryClient.invalidateQueries({ queryKey: ['session', id, 'live'] });
      }
    });
  }, [isOnline, session, id, queryClient]);

  const metrics = useMemo(
    () => computeOptimisticMetrics(loggedExercises, historicalBestByExercise),
    [loggedExercises, historicalBestByExercise]
  );

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const payload = buildPayload(loggedExercises, sessionNotes);
      return completeSession({ id, payload });
    },
    onSuccess: (res) => {
      removeQueuedSessionLog(id);
      queryClient.invalidateQueries({ queryKey: ['session', id, 'live'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setCompletionSummary(res.summary);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to complete session')),
  });

  const missedMutation = useMutation({
    mutationFn: () => updateSessionStatus({ id, status: 'missed', missedReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id, 'live'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setIsMissedOpen(false);
      toast.success('Session marked missed');
      navigate(`/?date=${session.date}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to mark session missed')),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-ink-secondary">
          <ArrowLeft className="h-4 w-4" />
          Back to Today
        </Link>
        <EmptyState
          icon={Dumbbell}
          title="Session not found"
          description="This session may have been removed or belongs to another trainer."
        />
      </div>
    );
  }

  const client = session.client || {};
  const meta = SESSION_STATUS_META[session.status] || SESSION_STATUS_META.scheduled;
  const isReadOnly = session.status === 'completed' || session.status === 'missed';
  const snapshotExercises = session.workoutSnapshot?.exercises || [];
  const hasMedicalAlert = Boolean(client.medicalNotes || client.injuries?.length > 0);

  const handleUpdateSet = (exIdx, setIdx, field, val) => {
    const next = loggedExercises.map((ex, i) =>
      i === exIdx
        ? {
            ...ex,
            sets: ex.sets.map((s, si) => (si === setIdx ? { ...s, [field]: val } : s)),
          }
        : ex
    );
    setLoggedExercises(next);
    scheduleDebouncedSave(next, sessionNotes);
  };

  const handleToggleSetComplete = (exIdx, setIdx, restSec) => {
    const currentlyCompleted = Boolean(loggedExercises[exIdx]?.sets[setIdx]?.completed);
    const nextCompleted = !currentlyCompleted;
    const next = loggedExercises.map((ex, i) =>
      i === exIdx
        ? {
            ...ex,
            sets: ex.sets.map((s, si) =>
              si === setIdx ? { ...s, completed: nextCompleted } : s
            ),
          }
        : ex
    );
    setLoggedExercises(next);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    syncPayloadNow(next, sessionNotes);

    if (nextCompleted && restSec > 0) {
      restTimer.start(restSec);
    }
  };

  const handleAddSet = (exIdx) => {
    const ex = loggedExercises[exIdx];
    const last = ex.sets[ex.sets.length - 1] || {
      reps: 10,
      durationSec: null,
      weight: 20,
      weightUnit: defaultUnit,
    };
    const next = loggedExercises.map((item, i) =>
      i === exIdx
        ? {
            ...item,
            sets: [
              ...item.sets,
              {
                ...last,
                setNumber: item.sets.length + 1,
                completed: false,
                isPR: false,
                prTypes: [],
              },
            ],
          }
        : item
    );
    setLoggedExercises(next);
    scheduleDebouncedSave(next, sessionNotes);
  };

  const handleExerciseNotesChange = (exIdx, text) => {
    const next = loggedExercises.map((ex, i) => (i === exIdx ? { ...ex, notes: text } : ex));
    setLoggedExercises(next);
    scheduleDebouncedSave(next, sessionNotes);
  };

  const handleSessionNotesChange = (text) => {
    setSessionNotes(text);
    scheduleDebouncedSave(loggedExercises, text);
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/?date=${session.date}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to roster
        </Link>

        {/* Sync status chip */}
        <div className="flex items-center gap-2">
          {!isOnline || syncState === 'offline' ? (
            <button
              type="button"
              onClick={() => syncPayloadNow(loggedExercises, sessionNotes)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-warning"
            >
              <CloudOff className="h-3.5 w-3.5" />
              Offline · saved locally
            </button>
          ) : syncState === 'saving' ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-raised px-2.5 py-1 text-xs text-ink-secondary">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Saving
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-raised px-2.5 py-1 text-xs text-ink-secondary">
              <Cloud className="h-3.5 w-3.5 text-success" />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Header + Live Stats */}
      <Card className="space-y-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <Avatar src={client.photoUrl} name={client.name || 'Client'} size="xl" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/clients/${session.clientId}`}
                  className="text-xl font-semibold text-ink hover:text-accent"
                >
                  {client.name || 'Client'}
                </Link>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
              <p className="text-sm font-medium text-accent">
                {session.workoutSnapshot?.dayName || 'Custom workout'}
              </p>
              <p className="font-mono text-xs text-ink-secondary tabular-nums">
                {formatLongDate(session.date)} · {formatTime12h(session.time)}
              </p>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsMissedOpen(true)}>
                <XCircle className="h-4 w-4 text-warning" />
                Missed
              </Button>
              <Button
                onClick={() => completeMutation.mutate()}
                isLoading={completeMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete session
              </Button>
            </div>
          )}
        </div>

        {hasMedicalAlert && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-ink-secondary">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              {client.injuries?.length > 0 ? `Injuries: ${client.injuries.join(', ')}. ` : ''}
              {client.medicalNotes}
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 border-t border-line pt-3">
          <div>
            <p className="text-xs text-ink-muted">Completed sets</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-ink">
              {metrics.completedSets}/{metrics.totalSets}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Total volume</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-ink">
              {metrics.totalVolume.toLocaleString()} {defaultUnit}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Personal records</p>
            <p
              className={cn(
                'mt-0.5 inline-flex items-center gap-1 font-mono text-lg font-semibold tabular-nums',
                metrics.prCount > 0 ? 'text-warning' : 'text-ink'
              )}
            >
              {metrics.prCount > 0 && <Trophy className="h-4 w-4" />}
              {metrics.prCount}
            </p>
          </div>
        </div>
      </Card>

      {/* Exercise Cards */}
      {metrics.annotated.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No exercises in this session"
          description="Assign a workout day on the client's Schedule or Workout Plan tab, or record session notes below."
        />
      ) : (
        <div className="space-y-4">
          {metrics.annotated.map((loggedEx, idx) => {
            const snapEx =
              snapshotExercises.find((s) => String(s.exerciseId) === String(loggedEx.exerciseId)) ||
              snapshotExercises[idx];
            return (
              <LiveExerciseCard
                key={`${loggedEx.exerciseId}-${idx}`}
                snapshotExercise={snapEx}
                loggedExercise={loggedEx}
                previousData={previousByExercise[String(loggedEx.exerciseId)]}
                isReadOnly={isReadOnly}
                onUpdateSet={(sIdx, field, val) => handleUpdateSet(idx, sIdx, field, val)}
                onToggleSetComplete={(sIdx, restSec) =>
                  handleToggleSetComplete(idx, sIdx, restSec)
                }
                onAddSet={() => handleAddSet(idx)}
                onNotesChange={(text) => handleExerciseNotesChange(idx, text)}
                onStartRest={(sec) => restTimer.start(sec)}
              />
            );
          })}
        </div>
      )}

      {/* Session Notes */}
      <Card className="space-y-2 p-4">
        <label htmlFor="session-notes" className="block text-sm font-semibold text-ink">
          Session notes
        </label>
        <textarea
          id="session-notes"
          rows={3}
          disabled={isReadOnly}
          value={sessionNotes}
          onChange={(e) => handleSessionNotesChange(e.target.value)}
          placeholder="Energy level, warm-up adjustments, progressions for next week"
          className="w-full rounded-lg border border-line bg-canvas p-3 text-sm text-ink placeholder:text-ink-muted"
        />
      </Card>

      <RestTimerBar timer={restTimer} />

      {/* Mark Missed Modal */}
      <Modal
        isOpen={isMissedOpen}
        onClose={() => setIsMissedOpen(false)}
        title="Mark session as missed"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            missedMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="live-missed-reason" className="block text-sm font-medium text-ink">
              Reason (optional)
            </label>
            <input
              id="live-missed-reason"
              type="text"
              value={missedReason}
              onChange={(e) => setMissedReason(e.target.value)}
              placeholder="Client could not make it"
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsMissedOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={missedMutation.isPending}>
              Mark missed
            </Button>
          </div>
        </form>
      </Modal>

      {/* Completion Summary Modal */}
      <Modal
        isOpen={Boolean(completionSummary)}
        onClose={() => setCompletionSummary(null)}
        title="Session completed"
        description={`${client.name || 'Client'} · ${session.workoutSnapshot?.dayName || 'Workout'}`}
        size="sm"
      >
        {completionSummary && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-canvas p-3 text-center">
              <div>
                <p className="text-xs text-ink-muted">Sets</p>
                <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-ink">
                  {completionSummary.completedSets}/{completionSummary.totalSets}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Volume</p>
                <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-ink">
                  {completionSummary.totalVolume.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">PRs</p>
                <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-warning">
                  {completionSummary.prCount}
                </p>
              </div>
            </div>

            {completionSummary.prHighlights?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink">Personal records hit</p>
                {completionSummary.prHighlights.map((pr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-ink">{pr.exerciseName}</span>
                    <span className="font-mono font-semibold text-warning tabular-nums">
                      {pr.reps} × {pr.weight} {pr.weightUnit}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCompletionSummary(null)}>
                Stay here
              </Button>
              <Button onClick={() => navigate(`/?date=${session.date}`)}>Back to Today</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
