const { connectDB, disconnectDB } = require('../config/db');
const { seedExercises } = require('./seedExercises');
const { seedFoods } = require('./seedFoods');
const { seedWorkoutTemplates } = require('./seedWorkoutTemplates');

async function runSeeds() {
  try {
    await connectDB();
    console.log('Connected to MongoDB. Seeding exercises, foods, and built-in workout templates...');

    const exerciseStats = await seedExercises();
    console.log(
      `Exercises seeded: processed=${exerciseStats.totalProcessed}, upserted=${exerciseStats.upserted}, modified=${exerciseStats.modified}, totalGlobal=${exerciseStats.totalGlobalInDb}`
    );

    const foodStats = await seedFoods();
    console.log(
      `Foods seeded: processed=${foodStats.totalProcessed}, upserted=${foodStats.upserted}, modified=${foodStats.modified}, totalGlobal=${foodStats.totalGlobalInDb}`
    );

    const tplStats = await seedWorkoutTemplates();
    console.log(
      `Workout templates seeded: processed=${tplStats.totalProcessed}, upserted=${tplStats.upserted}, modified=${tplStats.modified}, totalGlobal=${tplStats.totalGlobalInDb}`
    );
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

runSeeds();
