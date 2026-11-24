const mongoose = require('mongoose');
const env = require('./env');

let connectPromise = null;

async function connectDB(uri) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const targetUri = uri || (env.isTest ? env.mongoTestUri : env.mongoUri);
  mongoose.set('strictQuery', true);

  if (!connectPromise) {
    connectPromise = mongoose
      .connect(targetUri, {
        serverSelectionTimeoutMS: 15000,
        maxPoolSize: 10,
      })
      .catch((err) => {
        connectPromise = null;
        throw err;
      });
  }

  await connectPromise;
  return mongoose.connection;
}

async function disconnectDB() {
  connectPromise = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = { connectDB, disconnectDB };
