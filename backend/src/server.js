import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env, validateEnv } from './config/env.js';
import { logWaafiStartupStatus } from './services/payments/WaafiPayService.js';

let server;

async function verifyUploadRoute(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/vendor/listings/upload-images`, { method: 'POST' });
    if (res.status === 404) {
      console.warn(
        '[startup] WARNING: POST /api/v1/vendor/listings/upload-images is NOT registered (404).',
        'Vendor image upload will fail until you restart this server with the latest code.',
      );
    } else {
      console.log(`[startup] Vendor listing image upload route OK (HTTP ${res.status} without auth)`);
    }
  } catch (error) {
    console.warn('[startup] Could not verify upload route:', error.message);
  }
}

async function startServer() {
  try {
    validateEnv();
    await connectDatabase();
    server = app.listen(env.port, () => {
      console.log(`API listening on port ${env.port} in ${env.nodeEnv} mode`);
      logWaafiStartupStatus();
      verifyUploadRoute(env.port);
    });
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully.`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

