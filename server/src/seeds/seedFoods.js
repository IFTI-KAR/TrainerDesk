const Food = require('../models/Food');
const FOODS_SEED_DATA = require('./data/foodsData');

async function seedFoods() {
  const operations = FOODS_SEED_DATA.map((item) => ({
    updateOne: {
      filter: { slug: item.slug },
      update: {
        $set: {
          trainerId: null,
          isGlobal: true,
          slug: item.slug,
          name: item.name,
          category: item.category,
          servings: item.servings,
          defaultServingIndex: item.defaultServingIndex || 0,
        },
      },
      upsert: true,
    },
  }));

  const result = await Food.bulkWrite(operations, { ordered: false });
  const totalGlobalInDb = await Food.countDocuments({ isGlobal: true });

  return {
    totalProcessed: FOODS_SEED_DATA.length,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
    matched: result.matchedCount || 0,
    totalGlobalInDb,
  };
}

module.exports = {
  seedFoods,
};
