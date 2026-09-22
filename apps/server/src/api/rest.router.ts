import { FastifyInstance } from 'fastify';
import { getHealthStatus } from '../health/health.service.js';
import { sessionManager } from '../sessions/session.manager.js';
import { toolRegistry } from '../tools/index.js';

export async function restRouter(fastify: FastifyInstance) {
  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    const health = getHealthStatus();
    return reply.send(health);
  });

  // Get active registered tools
  fastify.get('/api/v1/tools', async (request, reply) => {
    const tools = toolRegistry.listTools();
    return reply.send({
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        riskLevel: t.riskLevel,
        requiredCapability: t.requiredCapability
      }))
    });
  });

  // Session history retrieval
  fastify.get<{ Params: { sessionId: string } }>('/api/v1/sessions/:sessionId/messages', async (request, reply) => {
    const { sessionId } = request.params;
    const history = sessionManager.getHistory(sessionId);
    return reply.send({ sessionId, messages: history });
  });
}
