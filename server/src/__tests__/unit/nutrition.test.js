const {
  calculateItemMacros,
  sumMacros,
  computeMealsAndDailyTotals,
} = require('../../services/nutrition.service');

describe('Nutrition calculation service', () => {
  const rotiFood = {
    _id: 'food_roti',
    name: 'Whole Wheat Roti',
    defaultServingIndex: 0,
    servings: [
      {
        measure: 'piece',
        baseQuantity: 1,
        label: '1 medium roti (35g)',
        gramsEquivalent: 35,
        calories: 104,
        protein: 3.4,
        carbs: 19.6,
        fat: 1.3,
        fiber: 2.5,
      },
      {
        measure: 'g',
        baseQuantity: 100,
        label: '100 g',
        gramsEquivalent: 100,
        calories: 297,
        protein: 9.6,
        carbs: 56,
        fat: 3.7,
        fiber: 7.2,
      },
    ],
  };

  const chickenFood = {
    _id: 'food_chicken',
    name: 'Chicken Breast (Cooked)',
    defaultServingIndex: 0,
    servings: [
      {
        measure: 'g',
        baseQuantity: 100,
        label: '100 g',
        gramsEquivalent: 100,
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        fiber: 0,
      },
    ],
  };

  test('calculateItemMacros computes measured portions accurately', () => {
    const twoRotis = calculateItemMacros(rotiFood, 2, 'piece');
    expect(twoRotis).toEqual({
      calories: 208,
      protein: 6.8,
      carbs: 39.2,
      fat: 2.6,
      fiber: 5,
    });

    const chicken150g = calculateItemMacros(chickenFood, 150, 'g');
    expect(chicken150g).toEqual({
      calories: 248,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
      fiber: 0,
    });
  });

  test('computeMealsAndDailyTotals aggregates mealTotals and dailyTotals', () => {
    const foodMap = new Map([
      ['food_roti', rotiFood],
      ['food_chicken', chickenFood],
    ]);

    const result = computeMealsAndDailyTotals(
      [
        {
          name: 'Lunch',
          time: '13:00',
          items: [
            { foodId: 'food_roti', quantity: 2, measure: 'piece' },
            { foodId: 'food_chicken', quantity: 150, measure: 'g' },
          ],
        },
      ],
      foodMap
    );

    expect(result.meals[0].mealTotals).toEqual({
      calories: 456,
      protein: 53.3,
      carbs: 39.2,
      fat: 8,
      fiber: 5,
    });
    expect(result.dailyTotals).toEqual(result.meals[0].mealTotals);
    expect(sumMacros([result.dailyTotals, result.dailyTotals]).calories).toBe(912);
  });
});
