import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '../../lib/utils';
import Card, { CardHeader } from '../ui/Card';

const VIEW_MODES = [
  { key: 'est1RM', label: 'Est. 1RM (kg)' },
  { key: 'maxWeight', label: 'Max weight (kg)' },
  { key: 'totalVolume', label: 'Volume (kg)' },
];

function StrengthTooltip({ active, payload, label, unitLabel }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-mono text-ink-muted">{label}</p>
      <p className="mt-0.5 font-mono font-semibold text-ink tabular-nums">
        {payload[0].value} {unitLabel}
      </p>
    </div>
  );
}

export function StrengthProgressionChart({ strengthProgression = [] }) {
  const [selectedExId, setSelectedExId] = useState(strengthProgression[0]?.exerciseId || '');
  const [mode, setMode] = useState('est1RM');

  useEffect(() => {
    if (
      strengthProgression.length > 0 &&
      !strengthProgression.some((e) => e.exerciseId === selectedExId)
    ) {
      setSelectedExId(strengthProgression[0].exerciseId);
    }
  }, [strengthProgression, selectedExId]);

  const activeEx =
    strengthProgression.find((e) => e.exerciseId === selectedExId) || strengthProgression[0];

  const activeModeMeta = VIEW_MODES.find((m) => m.key === mode) || VIEW_MODES[0];

  return (
    <Card>
      <CardHeader
        title="Strength progression"
        description="Estimated 1RM (Epley), max load, and session volume"
        action={
          strengthProgression.length > 0 && (
            <select
              value={activeEx?.exerciseId || ''}
              onChange={(e) => setSelectedExId(e.target.value)}
              aria-label="Select exercise for strength chart"
              className="h-9 max-w-[180px] rounded-lg border border-line bg-canvas px-2.5 text-xs font-medium text-ink"
            >
              {strengthProgression.map((ex) => (
                <option key={ex.exerciseId} value={ex.exerciseId}>
                  {ex.exerciseName}
                </option>
              ))}
            </select>
          )
        }
      />

      {!activeEx ? (
        <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-line bg-canvas px-4 text-center text-sm text-ink-muted">
          Complete live sessions with logged weights and reps to chart strength progression
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {VIEW_MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={cn(
                    'h-7 rounded-md border px-2.5 text-xs font-medium transition-colors',
                    mode === m.key
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-canvas text-ink-secondary hover:text-ink'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="font-mono text-xs text-ink-secondary tabular-nums">
              Best 1RM: <span className="font-semibold text-ink">{activeEx.bestEst1RM} kg</span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {mode === 'totalVolume' ? (
                <BarChart
                  data={activeEx.points}
                  margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--border-line)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<StrengthTooltip unitLabel="kg" />} />
                  <Bar dataKey="totalVolume" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart
                  data={activeEx.points}
                  margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--border-line)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<StrengthTooltip unitLabel={activeModeMeta.label} />} />
                  <Line
                    type="monotone"
                    dataKey={mode}
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: 'var(--accent)', strokeWidth: 0 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  );
}

export default StrengthProgressionChart;
