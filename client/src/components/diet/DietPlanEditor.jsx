import { useEffect, useMemo, useState } from 'react';
import { Droplets, Plus, Save, Trash2, Utensils, X } from 'lucide-react';
import { DEFAULT_MEAL_PRESETS, round1, sumMacrosClient } from '../../lib/diet.api';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import FoodPickerModal from './FoodPickerModal';

function MacroBar({ label, actual, target, unit = 'g', toneClass = 'bg-accent' }) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  const over = target > 0 && actual > target * 1.1;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink-secondary">{label}</span>
        <span className="font-mono tabular-nums text-ink">
          <span className={over ? 'font-semibold text-warning' : 'font-semibold'}>
            {actual}
          </span>
          <span className="text-ink-muted">
            {' '}
            / {target} {unit}
          </span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className={cn('h-full rounded-full transition-[width] duration-200', over ? 'bg-warning' : toneClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function DietPlanEditor({
  initialPlan,
  onSave,
  isSaving = false,
  showDayType = true,
  headerActions = null,
}) {
  const [name, setName] = useState(initialPlan?.name || '');
  const [dayType, setDayType] = useState(initialPlan?.dayType || 'all');
  const [targets, setTargets] = useState(
    initialPlan?.targets || {
      calories: 2000,
      protein: 140,
      carbs: 220,
      fat: 65,
      fiber: 30,
      waterLiters: 3,
    }
  );
  const [meals, setMeals] = useState(initialPlan?.meals || []);
  const [supplements, setSupplements] = useState(initialPlan?.supplements || []);
  const [notes, setNotes] = useState(initialPlan?.notes || '');
  const [isDirty, setIsDirty] = useState(false);

  const [pickingForMealIdx, setPickingForMealIdx] = useState(null);

  useEffect(() => {
    setName(initialPlan?.name || '');
    setDayType(initialPlan?.dayType || 'all');
    setTargets(
      initialPlan?.targets || {
        calories: 2000,
        protein: 140,
        carbs: 220,
        fat: 65,
        fiber: 30,
        waterLiters: 3,
      }
    );
    setMeals(initialPlan?.meals || []);
    setSupplements(initialPlan?.supplements || []);
    setNotes(initialPlan?.notes || '');
    setIsDirty(false);
  }, [initialPlan]);

  const dailyTotals = useMemo(
    () =>
      sumMacrosClient(
        meals.flatMap((m) => (m.items || []).map((it) => it.computedMacros))
      ),
    [meals]
  );

  const markDirty = () => setIsDirty(true);

  const addMeal = (preset = { name: 'Meal', time: '12:00' }) => {
    setMeals((prev) => [
      ...prev,
      {
        name: preset.name,
        time: preset.time,
        notes: '',
        items: [],
      },
    ]);
    markDirty();
  };

  const removeMeal = (mealIdx) => {
    setMeals((prev) => prev.filter((_, idx) => idx !== mealIdx));
    markDirty();
  };

  const updateMealField = (mealIdx, field, val) => {
    setMeals((prev) => prev.map((m, idx) => (idx === mealIdx ? { ...m, [field]: val } : m)));
    markDirty();
  };

  const handleAddFoodItem = (item) => {
    if (pickingForMealIdx === null) return;
    setMeals((prev) =>
      prev.map((m, idx) =>
        idx === pickingForMealIdx ? { ...m, items: [...(m.items || []), item] } : m
      )
    );
    markDirty();
  };

  const updateItemQuantity = (mealIdx, itemIdx, nextQtyRaw) => {
    const nextQty = Number(nextQtyRaw);
    setMeals((prev) =>
      prev.map((m, idx) => {
        if (idx !== mealIdx) return m;
        return {
          ...m,
          items: m.items.map((it, i) => {
            if (i !== itemIdx) return it;
            const prevQty = Number(it.quantity) || 1;
            const ratio = nextQty > 0 ? nextQty / prevQty : 0;
            const cm = it.computedMacros || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
            return {
              ...it,
              quantity: nextQtyRaw === '' ? '' : nextQty,
              computedMacros: {
                calories: Math.round(cm.calories * ratio),
                protein: round1(cm.protein * ratio),
                carbs: round1(cm.carbs * ratio),
                fat: round1(cm.fat * ratio),
                fiber: round1(cm.fiber * ratio),
              },
            };
          }),
        };
      })
    );
    markDirty();
  };

  const removeItem = (mealIdx, itemIdx) => {
    setMeals((prev) =>
      prev.map((m, idx) =>
        idx === mealIdx ? { ...m, items: m.items.filter((_, i) => i !== itemIdx) } : m
      )
    );
    markDirty();
  };

  const handleSave = () => {
    onSave({
      name: name.trim() || 'Diet Plan',
      ...(showDayType ? { dayType } : {}),
      targets: {
        calories: Number(targets.calories || 0),
        protein: Number(targets.protein || 0),
        carbs: Number(targets.carbs || 0),
        fat: Number(targets.fat || 0),
        fiber: Number(targets.fiber || 0),
        waterLiters: Number(targets.waterLiters || 0),
      },
      meals: meals.map((m) => ({
        name: m.name.trim() || 'Meal',
        time: m.time || '',
        notes: m.notes || '',
        items: (m.items || [])
          .filter((it) => Number(it.quantity) > 0)
          .map((it) => ({
            foodId: it.foodId,
            foodName: it.foodName,
            quantity: Number(it.quantity),
            measure: it.measure,
          })),
      })),
      supplements: supplements.filter((s) => s.name?.trim()),
      notes,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header & Targets */}
      <Card className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className={cn('grid flex-1 gap-3', showDayType ? 'sm:grid-cols-2' : '')}>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ink-muted">Diet plan name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  markDirty();
                }}
                className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm font-medium text-ink"
              />
            </div>

            {showDayType && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-ink-muted">Schedule day type</label>
                <select
                  value={dayType}
                  onChange={(e) => {
                    setDayType(e.target.value);
                    markDirty();
                  }}
                  className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
                >
                  <option value="all">All days</option>
                  <option value="training">Training days</option>
                  <option value="rest">Rest days</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {headerActions}
            <Button
              onClick={handleSave}
              isLoading={isSaving}
              disabled={!isDirty && Boolean(initialPlan?.id)}
            >
              <Save className="h-4 w-4" strokeWidth={1.75} />
              {isDirty ? 'Save plan' : 'Saved'}
            </Button>
          </div>
        </div>

        {/* Editable Daily Macro Targets */}
        <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 sm:grid-cols-6">
          {[
            { key: 'calories', label: 'Calories' },
            { key: 'protein', label: 'Protein (g)' },
            { key: 'carbs', label: 'Carbs (g)' },
            { key: 'fat', label: 'Fat (g)' },
            { key: 'fiber', label: 'Fiber (g)' },
            { key: 'waterLiters', label: 'Water (L)' },
          ].map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="block text-[11px] font-medium text-ink-muted">{f.label}</label>
              <input
                type="number"
                step={f.key === 'waterLiters' ? '0.5' : '1'}
                min="0"
                value={targets[f.key] ?? 0}
                onChange={(e) => {
                  setTargets((prev) => ({ ...prev, [f.key]: e.target.value }));
                  markDirty();
                }}
                className="h-9 w-full rounded-lg border border-line bg-canvas px-2.5 font-mono text-xs text-ink tabular-nums"
              />
            </div>
          ))}
        </div>

        {/* Live Macro Progress Bars */}
        <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <MacroBar
            label="Calories"
            actual={dailyTotals.calories}
            target={Number(targets.calories || 0)}
            unit="kcal"
            toneClass="bg-accent"
          />
          <MacroBar
            label="Protein"
            actual={dailyTotals.protein}
            target={Number(targets.protein || 0)}
            toneClass="bg-emerald-500"
          />
          <MacroBar
            label="Carbs"
            actual={dailyTotals.carbs}
            target={Number(targets.carbs || 0)}
            toneClass="bg-amber-500"
          />
          <MacroBar
            label="Fat"
            actual={dailyTotals.fat}
            target={Number(targets.fat || 0)}
            toneClass="bg-sky-500"
          />
        </div>
      </Card>

      {/* Meal Presets Bar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-ink-secondary">Add meal:</span>
        {DEFAULT_MEAL_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => addMeal(preset)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-xs font-medium text-ink-secondary hover:border-accent hover:text-ink transition-colors"
          >
            <Plus className="h-3 w-3" />
            {preset.name}
          </button>
        ))}
      </div>

      {/* Meals List */}
      {meals.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No meals added yet"
          description="Click a meal preset above (Breakfast, Lunch, Pre-workout, Dinner) and add measured foods."
        />
      ) : (
        <div className="space-y-4">
          {meals.map((meal, mIdx) => {
            const mealTotals = sumMacrosClient(
              (meal.items || []).map((i) => i.computedMacros)
            );

            return (
              <Card key={mIdx} className="space-y-3 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={meal.name}
                      onChange={(e) => updateMealField(mIdx, 'name', e.target.value)}
                      placeholder="Meal name"
                      className="h-9 flex-1 rounded-lg border border-line bg-canvas px-3 text-sm font-semibold text-ink sm:max-w-[200px]"
                    />
                    <input
                      type="time"
                      value={meal.time || ''}
                      onChange={(e) => updateMealField(mIdx, 'time', e.target.value)}
                      className="h-9 rounded-lg border border-line bg-canvas px-2 font-mono text-xs text-ink"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-surface-raised px-2.5 py-1 font-mono text-xs text-ink tabular-nums">
                      {mealTotals.calories} kcal · {mealTotals.protein}P · {mealTotals.carbs}C ·{' '}
                      {mealTotals.fat}F
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPickingForMealIdx(mIdx)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add food
                    </Button>
                    <button
                      type="button"
                      onClick={() => removeMeal(mIdx)}
                      aria-label={`Remove ${meal.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {(meal.items || []).length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line py-4 text-center text-xs text-ink-muted">
                    No food items in this meal yet
                  </p>
                ) : (
                  <div className="divide-y divide-line rounded-xl border border-line bg-canvas">
                    {meal.items.map((item, iIdx) => {
                      const cm = item.computedMacros || {};
                      return (
                        <div
                          key={iIdx}
                          className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">
                              {item.foodName}
                            </p>
                            <p className="font-mono text-[11px] text-ink-muted tabular-nums">
                              {cm.calories ?? 0} kcal · {cm.protein ?? 0}g P · {cm.carbs ?? 0}g C ·{' '}
                              {cm.fat ?? 0}g F
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.25"
                              min="0.1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItemQuantity(mIdx, iIdx, e.target.value)
                              }
                              aria-label={`${item.foodName} quantity`}
                              className="h-9 w-20 rounded-lg border border-line bg-surface px-2 text-center font-mono text-xs text-ink tabular-nums"
                            />
                            <span className="min-w-[56px] text-xs font-medium text-ink-secondary">
                              {item.measure}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(mIdx, iIdx)}
                              aria-label={`Remove ${item.foodName}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:text-danger"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <input
                  type="text"
                  value={meal.notes || ''}
                  onChange={(e) => updateMealField(mIdx, 'notes', e.target.value)}
                  placeholder="Meal prep or timing notes (optional)"
                  className="h-9 w-full rounded-lg border border-line bg-canvas px-3 text-xs text-ink placeholder:text-ink-muted"
                />
              </Card>
            );
          })}
        </div>
      )}

      {/* Supplements & Notes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Supplements</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSupplements((prev) => [
                  ...prev,
                  { name: '', dosage: '', timing: '', notes: '' },
                ]);
                markDirty();
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add supplement
            </Button>
          </div>

          {supplements.length === 0 ? (
            <p className="text-xs text-ink-muted">No supplements prescribed</p>
          ) : (
            <div className="space-y-2">
              {supplements.map((sup, idx) => (
                <div key={idx} className="grid grid-cols-12 items-center gap-2">
                  <input
                    type="text"
                    value={sup.name}
                    onChange={(e) => {
                      setSupplements((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, name: e.target.value } : s))
                      );
                      markDirty();
                    }}
                    placeholder="Creatine"
                    className="col-span-5 h-9 rounded-lg border border-line bg-canvas px-2.5 text-xs text-ink"
                  />
                  <input
                    type="text"
                    value={sup.dosage}
                    onChange={(e) => {
                      setSupplements((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, dosage: e.target.value } : s))
                      );
                      markDirty();
                    }}
                    placeholder="5g"
                    className="col-span-3 h-9 rounded-lg border border-line bg-canvas px-2.5 text-xs text-ink"
                  />
                  <input
                    type="text"
                    value={sup.timing}
                    onChange={(e) => {
                      setSupplements((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, timing: e.target.value } : s))
                      );
                      markDirty();
                    }}
                    placeholder="Post-workout"
                    className="col-span-3 h-9 rounded-lg border border-line bg-canvas px-2.5 text-xs text-ink"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSupplements((prev) => prev.filter((_, i) => i !== idx));
                      markDirty();
                    }}
                    className="col-span-1 inline-flex h-8 w-8 items-center justify-center text-ink-muted hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Coaching notes & hydration</h3>
            <span className="inline-flex items-center gap-1 font-mono text-xs text-ink-secondary">
              <Droplets className="h-3.5 w-3.5 text-sky-500" />
              {targets.waterLiters || 0} L/day
            </span>
          </div>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              markDirty();
            }}
            placeholder="Cooking oil budget, cheat meal guidance, hydration timing..."
            className="w-full rounded-lg border border-line bg-canvas p-3 text-sm text-ink placeholder:text-ink-muted"
          />
        </Card>
      </div>

      <FoodPickerModal
        isOpen={pickingForMealIdx !== null}
        onClose={() => setPickingForMealIdx(null)}
        onAddItem={handleAddFoodItem}
      />
    </div>
  );
}

export default DietPlanEditor;
