import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Dumbbell,
  Play,
  XCircle,
} from 'lucide-react';
import { SESSION_STATUS_META, formatTime12h } from '../../lib/schedule.api';
import { cn } from '../../lib/utils';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';

export function SessionCard({
  session,
  onStart,
  onReschedule,
  onMarkMissed,
  onCancel,
  isStarting = false,
}) {
  const client = session.client || {};
  const meta = SESSION_STATUS_META[session.status] || SESSION_STATUS_META.scheduled;
  const exerciseCount = session.workoutSnapshot?.exercises?.length || 0;
  const workoutLabel = session.workoutSnapshot?.dayName || 'Custom workout';
  const hasMedicalAlert = Boolean(client.medicalNotes || client.injuries?.length > 0);

  return (
    <Card className={cn('border-l-4 p-4 transition-colors', meta.borderClass)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <Avatar src={client.photoUrl} name={client.name || 'Client'} size="lg" />
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/clients/${session.clientId}`}
                className="truncate text-base font-semibold text-ink hover:text-accent transition-colors"
              >
                {client.name || 'Client'}
              </Link>
              <Badge tone={meta.tone}>{meta.label}</Badge>
              {session.isOneOff && <Badge tone="neutral">One-off</Badge>}
              {hasMedicalAlert && (
                <Badge tone="warning">
                  <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                  Injury note
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-secondary">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink tabular-nums">
                <Clock className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
                {formatTime12h(session.time)} · {session.durationMin}m
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm">
                <Dumbbell className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
                <span className="font-medium text-ink">{workoutLabel}</span>
                {exerciseCount > 0 && (
                  <span className="font-mono text-xs text-ink-muted tabular-nums">
                    ({exerciseCount})
                  </span>
                )}
              </span>
            </div>

            {session.status === 'missed' && session.missedReason && (
              <p className="text-xs text-danger">Reason: {session.missedReason}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {session.status === 'scheduled' && (
            <>
              <Button size="sm" onClick={() => onStart(session)} isLoading={isStarting}>
                <Play className="h-3.5 w-3.5" strokeWidth={2} />
                Start session
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReschedule(session)}
                title="Reschedule this occurrence"
              >
                <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span className="hidden md:inline">Reschedule</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkMissed(session)}
                title="Mark missed"
              >
                <XCircle className="h-3.5 w-3.5 text-warning" strokeWidth={1.75} />
                <span className="hidden md:inline">Missed</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(session)}
                title="Cancel occurrence"
              >
                Cancel
              </Button>
            </>
          )}

          {session.status === 'in_progress' && (
            <>
              <Link to={`/sessions/${session.id}`}>
                <Button size="sm">
                  <Play className="h-3.5 w-3.5" strokeWidth={2} />
                  Continue
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => onMarkMissed(session)}>
                Missed
              </Button>
            </>
          )}

          {(session.status === 'completed' || session.status === 'missed') && (
            <Link to={`/sessions/${session.id}`}>
              <Button variant="secondary" size="sm">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                View log
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export default SessionCard;
