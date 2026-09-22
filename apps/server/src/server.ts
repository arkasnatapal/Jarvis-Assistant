import fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config/index.js';
import { logger } from './logging/logger.js';
import { initializeTools } from './tools/index.js';
import { restRouter } from './api/rest.router.js';
import { wsServer } from './websocket/ws.server.js';
import { llmRegistry } from './llm/registry.js';

export async function buildServer() {
  const app = fastify({
    logger: false
  });

  // Register CORS
  await app.register(cors, {
    origin: [config.WEB_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
  });

  // Register REST routes
  await app.register(restRouter);

  // Initialize tools registry
  initializeTools();

  return app;
}

async function start() {
  try {
    const app = await buildServer();
    
    // Attach Socket.io server to Fastify underlying HTTP server
    await app.listen({ port: config.PORT, host: config.HOST });
    
    wsServer.initialize(app.server);

    logger.info(`JARVIS Core Server running at http://${config.HOST}:${config.PORT}`);
    llmRegistry.logStartupStatus();
  } catch (err) {
    logger.fatal({ err }, 'Failed to start JARVIS Server');
    process.exit(1);
  }
}

// Execute start if this file is run directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.env.NODE_ENV !== 'test') {
  start();
}
