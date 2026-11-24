import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  FOOD_CATEGORIES,
  createFood,
  deleteFood,
  fetchDietPlans,
  fetchFoods,
  formatFoodCategory,
  updateFood,
} from '../lib/diet.api';
import { cn, getApiErrorMessage } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import AssignFoodModal from '../components/diet/AssignFoodModal';
import FoodFormModal from '../components/diet/FoodFormModal';

const DIET_TABS = [
  { id: 'foods', label: 'Food database', icon: Utensils },
  { id: 'plans', label: 'Client diet plans', icon: Users },
];

export default function DietPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('foods');

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 250);
  const [category, setCategory] = useState('');
  const [customOnly, setCustomOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [deletingFood, setDeletingFood] = useState(null);
  const [assigningFood, setAssigningFood] = useState(null);

  const foodQueryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      category: category || undefined,
      customOnly: customOnly ? 'true' : undefined,
      page,
      limit: 24,
    }),
    [debouncedSearch, category, customOnly, page]
  );

  const { data: foodsData, isLoading: foodsLoading } = useQuery({
    queryKey: ['foods', 'list', foodQueryParams],
    queryFn: () => fetchFoods(foodQueryParams),
    enabled: activeTab === 'foods',
    placeholderData: (prev) => prev,
  });

  const { data: clientPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['diet-plans', 'all'],
    queryFn: () => fetchDietPlans({ isActive: 'true' }),
    enabled: activeTab === 'plans',
  });

  const saveFoodMutation = useMutation({
    mutationFn: ({ payload, editId }) =>
      editId ? updateFood({ id: editId, payload }) : createFood(payload),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      setIsFormOpen(false);
      setEditingFood(null);
      toast.success(vars.editId ? 'Food updated' : 'Custom food created');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save food')),
  });

  const deleteFoodMutation = useMutation({
    mutationFn: deleteFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      setDeletingFood(null);
      toast.success('Food deleted');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete food')),
  });

  const foods = foodsData?.foods || [];
  const pagination = foodsData?.pagination || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Diet and foods</h1>
            {activeTab === 'foods' && (
              <span className="font-mono text-xs text-ink-muted tabular-nums">
                {pagination.total} foods
              </span>
            )}
          </div>
          <p className="text-sm text-ink-secondary">
            Browse 200+ foods with household measures (roti, katori, cup, g) and manage client diets
          </p>
        </div>

        {activeTab === 'foods' && (
          <Button
            onClick={() => {
              setEditingFood(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add custom food
          </Button>
        )}
      </div>

      <Tabs tabs={DIET_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'foods' ? (
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
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
                  placeholder="Search roti, dal, chicken, paneer, oats, banana..."
                  className="h-11 w-full rounded-lg border border-line bg-canvas pl-9 pr-9 text-sm text-ink placeholder:text-ink-muted"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
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
                className="h-11 rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
              >
                <option value="">All categories</option>
                {FOOD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {formatFoodCategory(c)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setCustomOnly((v) => !v);
                  setPage(1);
                }}
                className={cn(
                  'h-11 rounded-lg border px-4 text-sm font-medium transition-colors',
                  customOnly
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-canvas text-ink-secondary hover:text-ink'
                )}
              >
                Custom only
              </button>
            </div>
          </Card>

          {foodsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : foods.length === 0 ? (
            <EmptyState
              icon={Utensils}
              title="No foods match this filter"
              description="Try a different search term or add your own custom food item."
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {foods.map((food) => {
                  const primaryServing =
                    food.servings?.[food.defaultServingIndex || 0] || food.servings?.[0];
                  return (
                    <Card key={food.id} className="flex flex-col justify-between gap-3 p-4">
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-ink">{food.name}</h3>
                          {food.isCustom && <Badge tone="accent">Custom</Badge>}
                        </div>
                        <p className="text-xs text-ink-secondary">
                          {formatFoodCategory(food.category)} · {primaryServing?.label}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
                        <div className="font-mono text-xs tabular-nums text-ink">
                          <span className="font-semibold">{primaryServing?.calories} kcal</span>
                          <span className="ml-2 text-ink-secondary">
                            {primaryServing?.protein}P · {primaryServing?.carbs}C ·{' '}
                            {primaryServing?.fat}F
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setAssigningFood(food)}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-canvas px-2 text-xs font-medium text-ink hover:border-accent hover:text-accent transition-colors"
                          >
                            <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Assign
                          </button>
                          {food.isCustom && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFood(food);
                                  setIsFormOpen(true);
                                }}
                                aria-label={`Edit ${food.name}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-raised hover:text-ink"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingFood(food)}
                                aria-label={`Delete ${food.name}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised hover:text-danger"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-line pt-4">
                  <p className="font-mono text-xs text-ink-secondary tabular-nums">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasPrevPage}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
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
            </>
          )}
        </div>
      ) : plansLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : clientPlans.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No active client diet plans"
          description="Open any client profile and switch to the Diet tab to build a measured meal plan."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clientPlans.map((plan) => (
            <Link
              key={plan.id}
              to={`/clients/${plan.clientId}?tab=diet`}
              className="group flex flex-col justify-between rounded-xl border border-line bg-surface p-4 hover:border-ink-muted/40 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-base font-semibold text-ink group-hover:text-accent">
                    {plan.clientName || 'Client'}
                  </h3>
                  <ChevronRight className="h-4 w-4 text-ink-muted" />
                </div>
                <p className="text-sm text-ink-secondary">{plan.name}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 font-mono text-xs tabular-nums">
                <span className="font-semibold text-ink">
                  {plan.dailyTotals?.calories || 0} kcal
                </span>
                <span className="text-ink-secondary">
                  {plan.dailyTotals?.protein || 0}P · {plan.dailyTotals?.carbs || 0}C ·{' '}
                  {plan.dailyTotals?.fat || 0}F
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <FoodFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingFood(null);
        }}
        initialFood={editingFood}
        isSaving={saveFoodMutation.isPending}
        onSubmitForm={(payload, editId) =>
          saveFoodMutation.mutate({ payload, editId })
        }
      />

      <ConfirmDialog
        isOpen={Boolean(deletingFood)}
        onClose={() => setDeletingFood(null)}
        onConfirm={() => deletingFood && deleteFoodMutation.mutate(deletingFood.id)}
        title="Delete custom food"
        description={`Delete "${deletingFood?.name}" from your custom foods?`}
        confirmLabel="Delete food"
        isLoading={deleteFoodMutation.isPending}
      />

      <AssignFoodModal
        food={assigningFood}
        isOpen={Boolean(assigningFood)}
        onClose={() => setAssigningFood(null)}
      />
    </div>
  );
}
