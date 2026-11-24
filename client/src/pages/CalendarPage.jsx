import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  SESSION_STATUS_META,
  addDaysStr,
  fetchSessions,
  formatTime12h,
  getMonthGridDates,
  getTodayDateStr,
  parseDateStrUtc,
} from '../lib/schedule.api';
import { cn } from '../lib/utils';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import OneOffSessionModal from '../components/sessions/OneOffSessionModal';

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMondayOfDate(dateStr) {
  const dt = parseDateStrUtc(dateStr);
  const dow = dt.getUTCDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  return addDaysStr(dateStr, offset);
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const todayStr = getTodayDateStr();

  const [view, setView] = useState('week');
  const [anchorDate, setAnchorDate] = useState(todayStr);
  const [isOneOffOpen, setIsOneOffOpen] = useState(false);

  const anchorUtc = parseDateStrUtc(anchorDate);
  const year = anchorUtc.getUTCFullYear();
  const month = anchorUtc.getUTCMonth();

  const range = useMemo(() => {
    if (view === 'week') {
      const monday = getMondayOfDate(anchorDate);
      const days = Array.from({ length: 7 }, (_, i) => addDaysStr(monday, i));
      return { startDate: days[0], endDate: days[6], weekDays: days, monthCells: [] };
    }
    const cells = getMonthGridDates(year, month);
    return {
      startDate: cells[0].date,
      endDate: cells[cells.length - 1].date,
      weekDays: [],
      monthCells: cells,
    };
  }, [view, anchorDate, year, month]);

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', 'calendar', range.startDate, range.endDate],
    queryFn: () => fetchSessions({ startDate: range.startDate, endDate: range.endDate }),
  });

  const sessionsByDate = useMemo(() => {
    const map = new Map();
    for (const s of data?.sessions || []) {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date).push(s);
    }
    return map;
  }, [data]);

  const headerTitle =
    view === 'week'
      ? `${range.startDate} to ${range.endDate}`
      : new Intl.DateTimeFormat('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(anchorUtc);

  const stepPrev = () => {
    if (view === 'week') {
      setAnchorDate(addDaysStr(anchorDate, -7));
    } else {
      const prevMonth = new Date(Date.UTC(year, month - 1, 1));
      setAnchorDate(prevMonth.toISOString().slice(0, 10));
    }
  };

  const stepNext = () => {
    if (view === 'week') {
      setAnchorDate(addDaysStr(anchorDate, 7));
    } else {
      const nextMonth = new Date(Date.UTC(year, month + 1, 1));
      setAnchorDate(nextMonth.toISOString().slice(0, 10));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Schedule calendar</h1>
          <p className="font-mono text-xs text-ink-secondary">{headerTitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-line bg-surface p-0.5">
            {['week', 'month'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  'h-8 rounded-md px-3 text-xs font-medium capitalize transition-colors',
                  view === v ? 'bg-surface-raised text-ink' : 'text-ink-secondary hover:text-ink'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={stepPrev}
              aria-label="Previous"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-raised hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAnchorDate(todayStr)}
              className="h-8 px-2.5 text-xs font-medium text-ink-secondary hover:text-ink"
            >
              Today
            </button>
            <button
              type="button"
              onClick={stepNext}
              aria-label="Next"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-raised hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button size="sm" onClick={() => setIsOneOffOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            One-off
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : view === 'week' ? (
        <div className="grid gap-3 md:grid-cols-7">
          {range.weekDays.map((dateStr, idx) => {
            const list = sessionsByDate.get(dateStr) || [];
            const isToday = dateStr === todayStr;
            const dayNum = parseDateStrUtc(dateStr).getUTCDate();
            return (
              <Card
                key={dateStr}
                className={cn('flex flex-col gap-2.5 p-3', isToday ? 'border-accent' : '')}
              >
                <Link
                  to={`/?date=${dateStr}`}
                  className="flex items-center justify-between border-b border-line pb-2 hover:text-accent transition-colors"
                >
                  <span className="text-xs font-medium text-ink-secondary">
                    {WEEKDAY_HEADERS[idx]}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-sm font-semibold tabular-nums',
                      isToday ? 'text-accent' : 'text-ink'
                    )}
                  >
                    {dayNum}
                  </span>
                </Link>

                {list.length === 0 ? (
                  <p className="py-4 text-center text-xs text-ink-muted">Open</p>
                ) : (
                  <div className="space-y-1.5">
                    {list.map((sess) => (
                      <button
                        key={sess.id}
                        type="button"
                        onClick={() => navigate(`/sessions/${sess.id}`)}
                        className="w-full rounded-lg border border-line bg-canvas p-2 text-left hover:border-accent/50 transition-colors"
                      >
                        <p className="font-mono text-[11px] text-ink-secondary tabular-nums">
                          {formatTime12h(sess.time)}
                        </p>
                        <p className="truncate text-xs font-medium text-ink">
                          {sess.client?.name || 'Client'}
                        </p>
                        <p className="truncate text-[11px] text-ink-muted">
                          {sess.workoutSnapshot?.dayName || 'Workout'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-line bg-surface-raised/60">
            {WEEKDAY_HEADERS.map((h) => (
              <div
                key={h}
                className="px-2 py-2 text-center text-xs font-medium text-ink-secondary"
              >
                {h}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-line">
            {range.monthCells.map((cell) => {
              const list = sessionsByDate.get(cell.date) || [];
              const isToday = cell.date === todayStr;
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => navigate(`/?date=${cell.date}`)}
                  className={cn(
                    'flex min-h-[96px] flex-col items-stretch p-2 text-left hover:bg-surface-raised/50 transition-colors',
                    !cell.inCurrentMonth ? 'opacity-45' : ''
                  )}
                >
                  <span
                    className={cn(
                      'mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-medium tabular-nums',
                      isToday ? 'bg-accent text-white' : 'text-ink'
                    )}
                  >
                    {cell.dayNumber}
                  </span>
                  <div className="space-y-1">
                    {list.slice(0, 3).map((sess) => {
                      const meta =
                        SESSION_STATUS_META[sess.status] || SESSION_STATUS_META.scheduled;
                      return (
                        <div
                          key={sess.id}
                          className="truncate rounded bg-surface-raised px-1.5 py-0.5 text-[11px] text-ink"
                        >
                          <span
                            className={cn(
                              'mr-1 inline-block h-1.5 w-1.5 rounded-full',
                              meta.tone === 'success'
                                ? 'bg-success'
                                : meta.tone === 'accent'
                                  ? 'bg-accent'
                                  : meta.tone === 'danger'
                                    ? 'bg-danger'
                                    : 'bg-ink-muted'
                            )}
                          />
                          {sess.time} {sess.client?.name?.split(' ')[0]}
                        </div>
                      );
                    })}
                    {list.length > 3 && (
                      <span className="block px-1 font-mono text-[10px] text-ink-muted">
                        +{list.length - 3} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <OneOffSessionModal
        isOpen={isOneOffOpen}
        onClose={() => setIsOneOffOpen(false)}
        defaultDate={todayStr}
      />
    </div>
  );
}
