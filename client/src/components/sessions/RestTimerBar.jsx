import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';
import { cn } from '../../lib/utils';

function formatClock(totalSec) {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function RestTimerBar({ timer }) {
  if (!timer?.isVisible) return null;

  const pct =
    timer.totalSeconds > 0
      ? Math.min(100, Math.max(0, (timer.secondsLeft / timer.totalSeconds) * 100))
      : 0;
  const finished = timer.secondsLeft === 0;

  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-xl rounded-xl border border-line bg-surface shadow-lg lg:bottom-4">
      <div className="h-1 w-full overflow-hidden rounded-t-xl bg-surface-raised">
        <div
          className={cn('h-full transition-[width] duration-300', finished ? 'bg-success' : 'bg-accent')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              finished ? 'bg-emerald-500/15 text-success' : 'bg-accent-soft text-accent'
            )}
          >
            <Timer className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-ink-muted">
              {finished ? 'Rest complete' : 'Rest timer'}
            </p>
            <p className="font-mono text-lg font-semibold leading-none tabular-nums text-ink">
              {formatClock(timer.secondsLeft)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => timer.adjust(-15)}
            className="h-9 rounded-lg border border-line bg-canvas px-2.5 font-mono text-xs font-medium text-ink-secondary hover:text-ink"
          >
            -15s
          </button>
          <button
            type="button"
            onClick={() => timer.adjust(15)}
            className="h-9 rounded-lg border border-line bg-canvas px-2.5 font-mono text-xs font-medium text-ink-secondary hover:text-ink"
          >
            +15s
          </button>
          <button
            type="button"
            onClick={timer.isRunning ? timer.pause : timer.resume}
            aria-label={timer.isRunning ? 'Pause timer' : 'Resume timer'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-hover"
          >
            {timer.isRunning ? (
              <Pause className="h-4 w-4" strokeWidth={2} />
            ) : (
              <Play className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
          <button
            type="button"
            onClick={timer.reset}
            aria-label="Reset timer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-secondary hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={timer.dismiss}
            aria-label="Dismiss timer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:text-ink"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default RestTimerBar;
