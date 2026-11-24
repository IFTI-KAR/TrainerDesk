import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Droplets, Printer, Utensils } from 'lucide-react';
import { fetchSharedDietPlan } from '../lib/diet.api';
import { exportDietPlanPdf } from '../lib/pdfExport';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

export default function SharedDietPlanPage() {
  const { shareToken } = useParams();

  const { data: plan, isLoading, isError } = useQuery({
    queryKey: ['shared-diet-plan', shareToken],
    queryFn: () => fetchSharedDietPlan(shareToken),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <EmptyState
          icon={Utensils}
          title="Diet plan link unavailable"
          description="This share link may have expired or been removed by your trainer."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-8 text-ink print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div className="space-y-1">
            <p className="text-xs font-medium text-accent">
              {plan.gymName || 'TrainerDesk'} · Coach {plan.trainerName}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {plan.clientName}&apos;s Nutrition Plan
            </h1>
            <p className="text-sm text-ink-secondary">{plan.name}</p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportDietPlanPdf({ plan })}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Daily Targets & Totals */}
        <Card className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
          <div>
            <p className="text-xs text-ink-muted">Calories</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-ink">
              {plan.dailyTotals?.calories || 0}
              <span className="text-xs font-normal text-ink-muted">
                {' '}
                / {plan.targets?.calories || 0}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Protein</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-ink">
              {plan.dailyTotals?.protein || 0}g
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Carbs</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-ink">
              {plan.dailyTotals?.carbs || 0}g
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Fat</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-ink">
              {plan.dailyTotals?.fat || 0}g
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Water target</p>
            <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-lg font-semibold tabular-nums text-ink">
              <Droplets className="h-4 w-4 text-sky-500" />
              {plan.targets?.waterLiters || 3} L
            </p>
          </div>
        </Card>

        {/* Meals */}
        <div className="space-y-4">
          {(plan.meals || []).map((meal, idx) => (
            <Card key={idx} className="space-y-3 p-4">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div>
                  <h2 className="text-base font-semibold text-ink">{meal.name}</h2>
                  {meal.time && (
                    <p className="font-mono text-xs text-ink-muted">{meal.time}</p>
                  )}
                </div>
                <span className="font-mono text-xs font-medium text-ink-secondary tabular-nums">
                  {meal.mealTotals?.calories || 0} kcal · {meal.mealTotals?.protein || 0}P ·{' '}
                  {meal.mealTotals?.carbs || 0}C · {meal.mealTotals?.fat || 0}F
                </span>
              </div>

              <ul className="divide-y divide-line">
                {(meal.items || []).map((item, iIdx) => (
                  <li key={iIdx} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-ink">{item.foodName}</span>
                    <span className="font-mono text-xs text-ink-secondary tabular-nums">
                      {item.quantity} {item.measure} ({item.computedMacros?.calories || 0} kcal)
                    </span>
                  </li>
                ))}
              </ul>

              {meal.notes && <p className="text-xs text-ink-secondary">{meal.notes}</p>}
            </Card>
          ))}
        </div>

        {(plan.supplements?.length > 0 || plan.notes) && (
          <Card className="space-y-3 p-4">
            {plan.supplements?.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-ink">Supplements</h3>
                <ul className="space-y-1 text-sm text-ink-secondary">
                  {plan.supplements.map((s, idx) => (
                    <li key={idx}>
                      <span className="font-medium text-ink">{s.name}</span>
                      {s.dosage ? ` — ${s.dosage}` : ''}
                      {s.timing ? ` (${s.timing})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan.notes && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-ink">Coach notes</h3>
                <p className="whitespace-pre-line text-sm text-ink-secondary">{plan.notes}</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
