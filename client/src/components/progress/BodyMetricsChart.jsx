import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MEASUREMENT_METRICS } from '../../lib/progress.api';
import { cn } from '../../lib/utils';
import Card, { CardHeader } from '../ui/Card';

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-mono text-ink-muted">{label}</p>
      <p className="mt-0.5 font-mono font-semibold text-ink tabular-nums">
        {val}
        {unit ? ` ${unit}` : ''}
      </p>
    </div>
  );
}

export function BodyMetricsChart({ measurements = [], client }) {
  const [selectedMetricKey, setSelectedMetricKey] = useState('weightKg');

  const activeMetric =
    MEASUREMENT_METRICS.find((m) => m.key === selectedMetricKey) || MEASUREMENT_METRICS[0];

  const chartData = useMemo(
    () =>
      measurements
        .filter((m) => m[selectedMetricKey] !== null && m[selectedMetricKey] !== undefined)
        .map((m) => ({
          date: m.date,
          value: m[selectedMetricKey],
        })),
    [measurements, selectedMetricKey]
  );

  const targetValue = activeMetric.targetField ? client?.[activeMetric.targetField] : null;
  const latest = chartData[chartData.length - 1]?.value;
  const first = chartData[0]?.value;
  const delta =
    latest !== undefined && first !== undefined ? Math.round((latest - first) * 10) / 10 : null;

  return (
    <Card>
      <CardHeader
        title="Body metrics progression"
        description={
          latest !== undefined
            ? `Latest: ${latest}${activeMetric.unit ? ` ${activeMetric.unit}` : ''}${
                delta !== null && chartData.length > 1
                  ? ` (${delta > 0 ? '+' : ''}${delta}${activeMetric.unit ? ` ${activeMetric.unit}` : ''} overall)`
                  : ''
              }`
            : 'Log dated measurements to visualize trends'
        }
        action={
          <select
            value={selectedMetricKey}
            onChange={(e) => setSelectedMetricKey(e.target.value)}
            aria-label="Select body metric"
            className="h-9 rounded-lg border border-line bg-canvas px-2.5 text-xs font-medium text-ink"
          >
            {MEASUREMENT_METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} {m.unit ? `(${m.unit})` : ''}
              </option>
            ))}
          </select>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {MEASUREMENT_METRICS.slice(0, 6).map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setSelectedMetricKey(m.key)}
            className={cn(
              'h-7 rounded-md border px-2.5 text-xs font-medium transition-colors',
              selectedMetricKey === m.key
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line bg-canvas text-ink-secondary hover:text-ink'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-line bg-canvas text-sm text-ink-muted">
          No {activeMetric.label.toLowerCase()} entries recorded yet
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="var(--border-line)" strokeDasharray="3 3" vertical={false} />
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
              <Tooltip content={<CustomTooltip unit={activeMetric.unit} />} />
              {targetValue !== null && targetValue !== undefined && (
                <ReferenceLine
                  y={targetValue}
                  stroke="var(--success)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Target ${targetValue}`,
                    position: 'insideTopRight',
                    fill: 'var(--success)',
                    fontSize: 11,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3.5, fill: 'var(--accent)', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export default BodyMetricsChart;
