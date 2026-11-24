import api from './api';

export const FOOD_CATEGORIES = [
  'grains_breads',
  'protein',
  'dairy',
  'vegetables',
  'fruits',
  'legumes_dal',
  'fats_nuts',
  'beverages',
  'snacks',
  'south_asian_dishes',
  'supplements',
  'other',
];

export const FOOD_MEASURES = [
  'g',
  'ml',
  'cup',
  'tbsp',
  'tsp',
  'piece',
  'slice',
  'bowl',
  'katori',
  'scoop',
  'oz',
];

export const DEFAULT_MEAL_PRESETS = [
  { name: 'Breakfast', time: '08:00' },
  { name: 'Mid-morning', time: '11:00' },
  { name: 'Lunch', time: '13:30' },
  { name: 'Pre-workout', time: '16:30' },
  { name: 'Post-workout', time: '18:30' },
  { name: 'Dinner', time: '20:30' },
  { name: 'Snack', time: '22:00' },
];

const CATEGORY_LABELS = {
  grains_breads: 'Grains & Breads',
  protein: 'Protein',
  dairy: 'Dairy',
  vegetables: 'Vegetables',
  fruits: 'Fruits',
  legumes_dal: 'Legumes & Dal',
  fats_nuts: 'Fats & Nuts',
  beverages: 'Beverages',
  snacks: 'Snacks',
  south_asian_dishes: 'South Asian Dishes',
  supplements: 'Supplements',
  other: 'Other',
};

export function formatFoodCategory(cat) {
  return CATEGORY_LABELS[cat] || cat;
}

export function round1(n) {
  return Math.round(Number(n || 0) * 10) / 10;
}

export function calculateClientItemMacros(food, quantity, measure) {
  const qty = Number(quantity);
  if (!food || !Array.isArray(food.servings) || food.servings.length === 0 || !qty || qty <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }
  const serving =
    food.servings.find((s) => s.measure === measure) ||
    food.servings[food.defaultServingIndex || 0] ||
    food.servings[0];
  const factor = qty / (serving.baseQuantity || 1);
  return {
    calories: Math.round((serving.calories || 0) * factor),
    protein: round1((serving.protein || 0) * factor),
    carbs: round1((serving.carbs || 0) * factor),
    fat: round1((serving.fat || 0) * factor),
    fiber: round1((serving.fiber || 0) * factor),
  };
}

export function sumMacrosClient(list = []) {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const m of list) {
    if (!m) continue;
    totals.calories += Number(m.calories || 0);
    totals.protein += Number(m.protein || 0);
    totals.carbs += Number(m.carbs || 0);
    totals.fat += Number(m.fat || 0);
    totals.fiber += Number(m.fiber || 0);
  }
  return {
    calories: Math.round(totals.calories),
    protein: round1(totals.protein),
    carbs: round1(totals.carbs),
    fat: round1(totals.fat),
    fiber: round1(totals.fiber),
  };
}

export async function fetchFoods(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const res = await api.get('/foods', { params: cleaned });
  return res.data.data;
}

export async function createFood(payload) {
  const res = await api.post('/foods', payload);
  return res.data.data.food;
}

export async function updateFood({ id, payload }) {
  const res = await api.patch(`/foods/${id}`, payload);
  return res.data.data.food;
}

export async function deleteFood(id) {
  const res = await api.delete(`/foods/${id}`);
  return res.data;
}

export async function fetchDietPlans(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const res = await api.get('/diet-plans', { params: cleaned });
  return res.data.data.plans;
}

export async function createDietPlan(payload) {
  const res = await api.post('/diet-plans', payload);
  return res.data.data.plan;
}

export async function updateDietPlan({ id, payload }) {
  const res = await api.patch(`/diet-plans/${id}`, payload);
  return res.data.data.plan;
}

export async function deleteDietPlan(id) {
  const res = await api.delete(`/diet-plans/${id}`);
  return res.data;
}

export async function duplicateDietPlan({ id, payload }) {
  const res = await api.post(`/diet-plans/${id}/duplicate`, payload);
  return res.data.data.plan;
}

export async function saveDietPlanAsTemplate({ id, payload }) {
  const res = await api.post(`/diet-plans/${id}/save-as-template`, payload);
  return res.data.data.template;
}

export async function fetchSharedDietPlan(shareToken) {
  const res = await api.get(`/diet-plans/shared/${shareToken}`);
  return res.data.data.plan;
}

export async function fetchDietTemplates(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const res = await api.get('/diet-templates', { params: cleaned });
  return res.data.data.templates;
}

export async function createDietTemplate(payload) {
  const res = await api.post('/diet-templates', payload);
  return res.data.data.template;
}

export async function updateDietTemplate({ id, payload }) {
  const res = await api.patch(`/diet-templates/${id}`, payload);
  return res.data.data.template;
}

export async function deleteDietTemplate(id) {
  const res = await api.delete(`/diet-templates/${id}`);
  return res.data;
}

export async function assignDietTemplate({ id, payload }) {
  const res = await api.post(`/diet-templates/${id}/assign`, payload);
  return res.data.data.plan;
}
