import { FastifyInstance } from 'fastify';
import { getHealthStatus } from './health.service.js';

export async function healthRouter(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    const health = getHealthStatus();
    const statusCode = health.status === 'ok' ? 200 : 200; // Still return 200 for health probe, but indicate component status
    return reply.status(statusCode).send(health);
  });
}
