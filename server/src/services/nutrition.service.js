function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function emptyMacros() {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };
}

function calculateItemMacros(food, quantity, measure) {
  const qty = Number(quantity);
  if (!food || !Array.isArray(food.servings) || food.servings.length === 0 || !qty || qty <= 0) {
    return emptyMacros();
  }

  let serving = food.servings.find((s) => s.measure === measure);
  let factor = 1;

  if (serving) {
    factor = qty / (serving.baseQuantity || 1);
  } else if (measure === 'g' || measure === 'ml') {
    const refServing =
      food.servings.find((s) => s.gramsEquivalent > 0) ||
      food.servings[food.defaultServingIndex || 0] ||
      food.servings[0];
    serving = refServing;
    const eq = refServing.gramsEquivalent || 100;
    factor = qty / eq;
  } else {
    serving = food.servings[food.defaultServingIndex || 0] || food.servings[0];
    factor = qty / (serving.baseQuantity || 1);
  }

  return {
    calories: Math.round((serving.calories || 0) * factor),
    protein: round1((serving.protein || 0) * factor),
    carbs: round1((serving.carbs || 0) * factor),
    fat: round1((serving.fat || 0) * factor),
    fiber: round1((serving.fiber || 0) * factor),
  };
}

function sumMacros(macroList = []) {
  const totals = emptyMacros();
  for (const m of macroList) {
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

function computeMealsAndDailyTotals(meals = [], foodMap = new Map()) {
  const computedMeals = meals.map((meal, mealIdx) => {
    const computedItems = (meal.items || []).map((item) => {
      const food = foodMap.get(String(item.foodId));
      const computedMacros = calculateItemMacros(food, item.quantity, item.measure);
      return {
        foodId: item.foodId,
        foodName: food?.name || item.foodName || 'Food',
        quantity: Number(item.quantity),
        measure: item.measure,
        computedMacros,
      };
    });

    const mealTotals = sumMacros(computedItems.map((i) => i.computedMacros));

    return {
      name: meal.name,
      time: meal.time || '',
      order: mealIdx,
      notes: meal.notes || '',
      items: computedItems,
      mealTotals,
    };
  });

  const dailyTotals = sumMacros(computedMeals.map((m) => m.mealTotals));

  return {
    meals: computedMeals,
    dailyTotals,
  };
}

module.exports = {
  round1,
  emptyMacros,
  calculateItemMacros,
  sumMacros,
  computeMealsAndDailyTotals,
};
