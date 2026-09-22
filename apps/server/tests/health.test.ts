import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/server.js';

describe('Health API Endpoint', () => {
  it('GET /health returns 200 OK with system status', async () => {
    const app = await buildServer();
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('jarvis-server');
    expect(body.components).toBeDefined();
    expect(body.components.core).toBe('ONLINE');
    expect(body.components.server).toBe('ONLINE');
  });
});
