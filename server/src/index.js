const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const app = require('./app');

let server;

async function start() {
  try {
    await connectDB();
    console.log(`Connected to MongoDB (${env.nodeEnv})`);

    server = app.listen(env.port, () => {
      console.log(`TrainerDesk API listening on http://127.0.0.1:${env.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
