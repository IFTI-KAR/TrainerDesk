import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { FOOD_CATEGORIES, FOOD_MEASURES, formatFoodCategory } from '../../lib/diet.api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

const EMPTY_SERVING = {
  measure: 'g',
  baseQuantity: 100,
  label: '100 g',
  gramsEquivalent: 100,
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

export function FoodFormModal({
  isOpen,
  onClose,
  initialFood = null,
  onSubmitForm,
  isSaving = false,
}) {
  const isEditing = Boolean(initialFood);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('south_asian_dishes');
  const [servings, setServings] = useState([{ ...EMPTY_SERVING }]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialFood) {
      setName(initialFood.name || '');
      setCategory(initialFood.category || 'other');
      setServings(
        initialFood.servings?.length > 0 ? initialFood.servings : [{ ...EMPTY_SERVING }]
      );
    } else {
      setName('');
      setCategory('south_asian_dishes');
      setServings([{ ...EMPTY_SERVING }]);
    }
  }, [isOpen, initialFood]);

  const updateServing = (idx, field, val) => {
    setServings((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Food name is required');
      return;
    }
    onSubmitForm(
      {
        name: name.trim(),
        category,
        servings: servings.map((s) => ({
          measure: s.measure,
          baseQuantity: Number(s.baseQuantity || 1),
          label: s.label.trim() || `${s.baseQuantity} ${s.measure}`,
          gramsEquivalent: Number(s.gramsEquivalent || 100),
          calories: Number(s.calories || 0),
          protein: Number(s.protein || 0),
          carbs: Number(s.carbs || 0),
          fat: Number(s.fat || 0),
          fiber: Number(s.fiber || 0),
        })),
      },
      initialFood?.id
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit custom food' : 'Add custom food'}
      description="Define serving measures (g, katori, piece, cup, tbsp) and macro values"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Food name"
            placeholder="Homemade Moong Dal Chilla"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label htmlFor="food-cat" className="block text-sm font-medium text-ink">
              Category
            </label>
            <select
              id="food-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            >
              {FOOD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {formatFoodCategory(c)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-ink">Serving sizes</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setServings((prev) => [
                  ...prev,
                  {
                    measure: 'piece',
                    baseQuantity: 1,
                    label: '1 piece',
                    gramsEquivalent: 50,
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    fiber: 0,
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add serving
            </Button>
          </div>

          {servings.map((srv, idx) => (
            <div key={idx} className="space-y-3 rounded-xl border border-line bg-canvas p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="space-y-1">
                  <label className="block text-xs text-ink-muted">Measure</label>
                  <select
                    value={srv.measure}
                    onChange={(e) => updateServing(idx, 'measure', e.target.value)}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-xs text-ink"
                  >
                    {FOOD_MEASURES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Base qty"
                  type="number"
                  step="0.1"
                  min="0.01"
                  className="h-9 text-xs"
                  value={srv.baseQuantity}
                  onChange={(e) => updateServing(idx, 'baseQuantity', e.target.value)}
                />
                <Input
                  label="Label"
                  className="h-9 text-xs"
                  placeholder="1 katori (150g)"
                  value={srv.label}
                  onChange={(e) => updateServing(idx, 'label', e.target.value)}
                />
                <div className="flex items-end gap-1">
                  <Input
                    label="Grams eq."
                    type="number"
                    min="0"
                    className="h-9 text-xs"
                    wrapperClassName="flex-1"
                    value={srv.gramsEquivalent}
                    onChange={(e) => updateServing(idx, 'gramsEquivalent', e.target.value)}
                  />
                  {servings.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setServings((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove serving"
                      className="mb-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2">
                <Input
                  label="Kcal"
                  type="number"
                  min="0"
                  className="h-9 text-xs tabular-nums"
                  value={srv.calories}
                  onChange={(e) => updateServing(idx, 'calories', e.target.value)}
                />
                <Input
                  label="Protein (g)"
                  type="number"
                  step="0.1"
                  min="0"
                  className="h-9 text-xs tabular-nums"
                  value={srv.protein}
                  onChange={(e) => updateServing(idx, 'protein', e.target.value)}
                />
                <Input
                  label="Carbs (g)"
                  type="number"
                  step="0.1"
                  min="0"
                  className="h-9 text-xs tabular-nums"
                  value={srv.carbs}
                  onChange={(e) => updateServing(idx, 'carbs', e.target.value)}
                />
                <Input
                  label="Fat (g)"
                  type="number"
                  step="0.1"
                  min="0"
                  className="h-9 text-xs tabular-nums"
                  value={srv.fat}
                  onChange={(e) => updateServing(idx, 'fat', e.target.value)}
                />
                <Input
                  label="Fiber (g)"
                  type="number"
                  step="0.1"
                  min="0"
                  className="h-9 text-xs tabular-nums"
                  value={srv.fiber}
                  onChange={(e) => updateServing(idx, 'fiber', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isEditing ? 'Save food' : 'Create food'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default FoodFormModal;
