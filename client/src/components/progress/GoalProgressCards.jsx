import { Target } from 'lucide-react';
import Card from '../ui/Card';

function GoalCard({ title, unit, goal }) {
  if (!goal) return null;
  const deltaSign = goal.deltaFromStart > 0 ? '+' : '';
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-ink">{title}</span>
        </div>
        <span className="font-mono text-xs font-semibold text-accent tabular-nums">
          {goal.progressPct}%
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${goal.progressPct}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-xs text-ink-secondary tabular-nums">
        <span>
          Start: {goal.start}
          {unit}
        </span>
        <span className="font-semibold text-ink">
          Now: {goal.current}
          {unit} ({deltaSign}
          {goal.deltaFromStart}
          {unit})
        </span>
        <span>
          Goal: {goal.target}
          {unit}
        </span>
      </div>
    </Card>
  );
}

export function GoalProgressCards({ goals }) {
  if (!goals?.weight && !goals?.bodyFat && !goals?.waist) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <GoalCard title="Weight goal" unit=" kg" goal={goals.weight} />
      <GoalCard title="Body fat goal" unit="%" goal={goals.bodyFat} />
      <GoalCard title="Waist goal" unit=" cm" goal={goals.waist} />
    </div>
  );
}

export default GoalProgressCards;
