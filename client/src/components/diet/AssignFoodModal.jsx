import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  DEFAULT_MEAL_PRESETS,
  calculateClientItemMacros,
  createDietPlan,
  fetchDietPlans,
  updateDietPlan,
} from '../../lib/diet.api';
import { fetchClients } from '../../lib/clients.api';
import { getApiErrorMessage } from '../../lib/utils';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function AssignFoodModal({ food, isOpen, onClose }) {
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedMealIndex, setSelectedMealIndex] = useState('0');
  const [newMealName, setNewMealName] = useState('Breakfast');
  const [newMealTime, setNewMealTime] = useState('08:00');
  const [quantity, setQuantity] = useState('1');
  const [measure, setMeasure] = useState('g');

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients', 'for-food-assign'],
    queryFn: () => fetchClients({ limit: 100 }),
    enabled: isOpen,
  });
  const clients = useMemo(() => clientsData?.clients || [], [clientsData]);

  const { data: clientPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['diet-plans', 'assign', selectedClientId],
    queryFn: () => fetchDietPlans({ clientId: selectedClientId }),
    enabled: isOpen && Boolean(selectedClientId),
  });

  useEffect(() => {
    if (!isOpen || !food) return;
    const primary = food.servings?.[food.defaultServingIndex || 0] || food.servings?.[0];
    setQuantity(String(primary?.baseQuantity ?? 1));
    setMeasure(primary?.measure || 'g');
  }, [isOpen, food]);

  useEffect(() => {
    if (!isOpen || clients.length === 0) return;
    if (!selectedClientId || !clients.some((c) => c.id === selectedClientId)) {
      setSelectedClientId(clients[0].id);
    }
  }, [isOpen, clients, selectedClientId]);

  useEffect(() => {
    if (!isOpen || !selectedClientId) return;
    if (clientPlans.length === 0) {
      setSelectedPlanId('__new__');
      setSelectedMealIndex('__new_meal__');
      return;
    }
    const preferred = clientPlans.find((p) => p.isActive) || clientPlans[0];
    setSelectedPlanId(preferred.id);
    setSelectedMealIndex((preferred.meals || []).length > 0 ? '0' : '__new_meal__');
  }, [isOpen, selectedClientId, clientPlans]);

  const activePlan = useMemo(
    () => clientPlans.find((p) => p.id === selectedPlanId) || null,
    [clientPlans, selectedPlanId]
  );

  const previewMacros = useMemo(
    () => calculateClientItemMacros(food, quantity, measure),
    [food, quantity, measure]
  );

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!food || !selectedClientId) return null;
      const qtyNum = Number(quantity);
      if (!qtyNum || qtyNum <= 0) {
        throw new Error('Enter a valid quantity greater than 0');
      }

      const newItem = {
        foodId: food.id,
        foodName: food.name,
        quantity: qtyNum,
        measure,
      };

      if (selectedPlanId === '__new__' || !activePlan) {
        return createDietPlan({
          clientId: selectedClientId,
          name: 'Daily Meal Plan',
          dayType: 'all',
          isActive: true,
          meals: [
            {
              name: newMealName.trim() || 'Breakfast',
              time: newMealTime.trim(),
              notes: '',
              items: [newItem],
            },
          ],
        });
      }

      const sanitizedMeals = (activePlan.meals || []).map((meal) => ({
        name: meal.name,
        time: meal.time || '',
        notes: meal.notes || '',
        items: (meal.items || []).map((it) => ({
          foodId: it.foodId,
          foodName: it.foodName,
          quantity: Number(it.quantity),
          measure: it.measure,
        })),
      }));

      if (selectedMealIndex === '__new_meal__' || sanitizedMeals.length === 0) {
        sanitizedMeals.push({
          name: newMealName.trim() || 'Meal',
          time: newMealTime.trim(),
          notes: '',
          items: [newItem],
        });
      } else {
        const idx = Number(selectedMealIndex);
        if (Number.isNaN(idx) || !sanitizedMeals[idx]) {
          sanitizedMeals[0].items.push(newItem);
        } else {
          sanitizedMeals[idx].items.push(newItem);
        }
      }

      return updateDietPlan({
        id: activePlan.id,
        payload: { meals: sanitizedMeals },
      });
    },
    onSuccess: () => {
      const clientObj = clients.find((c) => c.id === selectedClientId);
      queryClient.invalidateQueries({ queryKey: ['diet-plans'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Assigned ${food?.name || 'food'} to ${clientObj?.name || 'client'}`);
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to assign food')),
  });

  const handlePlanChange = (nextPlanId) => {
    setSelectedPlanId(nextPlanId);
    if (nextPlanId === '__new__') {
      setSelectedMealIndex('__new_meal__');
      return;
    }
    const planObj = clientPlans.find((p) => p.id === nextPlanId);
    setSelectedMealIndex((planObj?.meals || []).length > 0 ? '0' : '__new_meal__');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={food ? `Assign ${food.name}` : 'Assign food to client'}
      description="Add this food with a measured portion directly into a client's meal plan"
      size="sm"
    >
      {clientsLoading ? (
        <p className="py-6 text-center text-sm text-ink-secondary">Loading clients...</p>
      ) : clients.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Create a client first before assigning foods to a meal plan.
          </p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            assignMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="assign-food-client" className="block text-sm font-medium text-ink">
              Client
            </label>
            <select
              id="assign-food-client"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="assign-food-plan" className="block text-sm font-medium text-ink">
              Diet plan
            </label>
            <select
              id="assign-food-plan"
              value={selectedPlanId}
              disabled={plansLoading}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            >
              {clientPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.isActive ? ' (Active)' : ''}
                </option>
              ))}
              <option value="__new__">+ Create new Daily Meal Plan</option>
            </select>
          </div>

          {selectedPlanId !== '__new__' && activePlan && (
            <div className="space-y-1.5">
              <label htmlFor="assign-food-meal" className="block text-sm font-medium text-ink">
                Meal
              </label>
              <select
                id="assign-food-meal"
                value={selectedMealIndex}
                onChange={(e) => setSelectedMealIndex(e.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
              >
                {(activePlan.meals || []).map((m, idx) => (
                  <option key={idx} value={String(idx)}>
                    {m.name}
                    {m.time ? ` (${m.time})` : ''}
                  </option>
                ))}
                <option value="__new_meal__">+ Add a new meal</option>
              </select>
            </div>
          )}

          {(selectedPlanId === '__new__' || selectedMealIndex === '__new_meal__') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="assign-new-meal-name" className="block text-sm font-medium text-ink">
                  Meal name
                </label>
                <select
                  id="assign-new-meal-name"
                  value={newMealName}
                  onChange={(e) => {
                    const preset = DEFAULT_MEAL_PRESETS.find((p) => p.name === e.target.value);
                    setNewMealName(e.target.value);
                    if (preset) setNewMealTime(preset.time);
                  }}
                  className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
                >
                  {DEFAULT_MEAL_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="assign-new-meal-time" className="block text-sm font-medium text-ink">
                  Time
                </label>
                <input
                  id="assign-new-meal-time"
                  type="time"
                  value={newMealTime}
                  onChange={(e) => setNewMealTime(e.target.value)}
                  className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="assign-food-qty" className="block text-sm font-medium text-ink">
                Quantity
              </label>
              <input
                id="assign-food-qty"
                type="number"
                step="0.25"
                min="0.05"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="assign-food-measure" className="block text-sm font-medium text-ink">
                Measure
              </label>
              <select
                id="assign-food-measure"
                value={measure}
                onChange={(e) => setMeasure(e.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
              >
                {(food?.servings || []).map((s, idx) => (
                  <option key={`${s.measure}-${idx}`} value={s.measure}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-canvas p-3 font-mono text-xs tabular-nums text-ink-secondary">
            <span className="font-semibold text-ink">{previewMacros.calories} kcal</span>
            {' · '}
            {previewMacros.protein}g P · {previewMacros.carbs}g C · {previewMacros.fat}g F
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={assignMutation.isPending}>
              Assign food
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
