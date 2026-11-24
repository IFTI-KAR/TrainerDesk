import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import {
  FOOD_CATEGORIES,
  calculateClientItemMacros,
  fetchFoods,
  formatFoodCategory,
} from '../../lib/diet.api';
import { cn } from '../../lib/utils';
import { useDebounce } from '../../hooks/useDebounce';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';

export function FoodPickerModal({ isOpen, onClose, onAddItem }) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 250);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [measure, setMeasure] = useState('g');

  useEffect(() => {
    if (isOpen) {
      setSelectedFood(null);
      setPage(1);
    }
  }, [isOpen]);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      category: category || undefined,
      page,
      limit: 20,
    }),
    [debouncedSearch, category, page]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['foods', 'picker', queryParams],
    queryFn: () => fetchFoods(queryParams),
    enabled: isOpen,
    placeholderData: (prev) => prev,
  });

  const foods = data?.foods || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  const handleChooseFood = (food) => {
    setSelectedFood(food);
    const defServing = food.servings?.[food.defaultServingIndex || 0] || food.servings?.[0];
    setMeasure(defServing?.measure || 'g');
    setQuantity(defServing?.baseQuantity || 1);
  };

  const previewMacros = useMemo(
    () => calculateClientItemMacros(selectedFood, quantity, measure),
    [selectedFood, quantity, measure]
  );

  const handleConfirm = (e) => {
    e.preventDefault();
    if (!selectedFood || !quantity || Number(quantity) <= 0) return;
    onAddItem({
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      quantity: Number(quantity),
      measure,
      computedMacros: previewMacros,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add food to meal"
      description="Search 200+ foods, choose a measure (g, piece, katori, cup, tbsp), and set quantity"
      size="xl"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Search roti, chicken breast, dal, paneer, oats..."
              className="h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-8 text-sm text-ink placeholder:text-ink-muted"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
          >
            <option value="">All categories</option>
            {FOOD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {formatFoodCategory(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-[36vh] divide-y divide-line overflow-y-auto rounded-xl border border-line bg-canvas">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : foods.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-secondary">No foods found</p>
          ) : (
            foods.map((food) => {
              const defSrv = food.servings?.[food.defaultServingIndex || 0] || food.servings?.[0];
              const isSelected = selectedFood?.id === food.id;
              return (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => handleChooseFood(food)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors',
                    isSelected ? 'bg-accent-soft' : 'hover:bg-surface-raised/60'
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{food.name}</p>
                    <p className="text-xs text-ink-secondary">
                      {formatFoodCategory(food.category)} · {defSrv?.label}
                    </p>
                  </div>
                  <div className="shrink-0 text-right font-mono text-xs tabular-nums">
                    <p className="font-semibold text-ink">{defSrv?.calories} kcal</p>
                    <p className="text-[11px] text-ink-muted">
                      {defSrv?.protein}P · {defSrv?.carbs}C · {defSrv?.fat}F
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span className="font-mono tabular-nums">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {selectedFood && (
          <form
            onSubmit={handleConfirm}
            className="space-y-3 rounded-xl border border-accent/40 bg-surface-raised/60 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{selectedFood.name}</p>
              <p className="font-mono text-xs font-semibold text-accent tabular-nums">
                {previewMacros.calories} kcal · {previewMacros.protein}g P · {previewMacros.carbs}g
                C · {previewMacros.fat}g F
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-xs text-ink-muted">Quantity</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 font-mono text-sm text-ink tabular-nums"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-ink-muted">Measure</label>
                <select
                  value={measure}
                  onChange={(e) => {
                    const nextM = e.target.value;
                    setMeasure(nextM);
                    const srv = selectedFood.servings.find((s) => s.measure === nextM);
                    if (srv) setQuantity(srv.baseQuantity || 1);
                  }}
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
                >
                  {(selectedFood.servings || []).map((s, idx) => (
                    <option key={idx} value={s.measure}>
                      {s.measure} ({s.label})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 flex items-end sm:col-span-1">
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4" />
                  Add to meal
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

export default FoodPickerModal;
