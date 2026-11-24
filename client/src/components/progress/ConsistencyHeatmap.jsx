import { cn } from '../../lib/utils';
import Card, { CardHeader } from '../ui/Card';

export function ConsistencyHeatmap({ attendance, heatmap = [] }) {
  const rateText =
    attendance?.attendanceRatePct !== null && attendance?.attendanceRatePct !== undefined
      ? `${attendance.attendanceRatePct}%`
      : '—';

  return (
    <Card>
      <CardHeader
        title="Attendance and consistency"
        description="12-week session completion history"
      />

      <div className="grid grid-cols-4 gap-2 rounded-xl border border-line bg-canvas p-3 text-center">
        <div>
          <p className="text-[11px] text-ink-muted">Attendance</p>
          <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-ink">
            {rateText}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-ink-muted">Completed</p>
          <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-success">
            {attendance?.completed ?? 0}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-ink-muted">Missed</p>
          <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-danger">
            {attendance?.missed ?? 0}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-ink-muted">Total PRs</p>
          <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-warning">
            {attendance?.totalPRs ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="grid grid-cols-12 gap-1.5">
          {heatmap.map((cell) => (
            <div
              key={cell.date}
              title={`${cell.date}: ${
                cell.status === 'completed'
                  ? `${cell.count} completed`
                  : cell.status === 'missed'
                    ? 'Missed session'
                    : 'No session'
              }`}
              className={cn(
                'aspect-square w-full rounded-[4px] border border-transparent',
                cell.status === 'completed'
                  ? 'bg-emerald-500/80 dark:bg-emerald-500/70'
                  : cell.status === 'missed'
                    ? 'bg-red-500/45'
                    : 'bg-surface-raised border-line/50'
              )}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted">
          <span>12 weeks ago</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-surface-raised border border-line" />
              Rest
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-500/80" />
              Completed
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-red-500/45" />
              Missed
            </span>
          </div>
          <span>Today</span>
        </div>
      </div>
    </Card>
  );
}

export default ConsistencyHeatmap;
