import { z } from 'zod';

export const EventPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const JarvisEventTypeSchema = z.enum([
  'system.connected',
  'user.request.received',
  'orchestrator.started',
  'orchestrator.completed',
  'llm.request.started',
  'llm.response.chunk',
  'llm.request.completed',
  'llm.request.failed',
  'tool.requested',
  'tool.permission_checked',
  'tool.confirmation_required',
  'tool.confirmation_responded',
  'tool.started',
  'tool.completed',
  'tool.failed',
  'system.error',
  'system.status',
  'voice.session.started',
  'voice.session.ended',
  'voice.listening.started',
  'voice.listening.stopped',
  'voice.audio.received',
  'voice.transcription.started',
  'voice.transcription.partial',
  'voice.transcription.completed',
  'voice.language.detected',
  'voice.processing.started',
  'voice.speaking.started',
  'voice.speaking.stopped',
  'voice.interrupted',
  'voice.error',
  // Agent Events
  'agent.connected',
  'agent.disconnected',
  'agent.authenticated',
  'agent.capabilities.updated',
  'agent.heartbeat',
  'agent.command.requested',
  'agent.command.started',
  'agent.command.completed',
  'agent.command.failed',
  'agent.kill_switch.activated'
]);

export const JarvisEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: JarvisEventTypeSchema,
  source: z.enum(['user_ui', 'server', 'orchestrator', 'llm', 'tool_system', 'permission_engine', 'voice_system', 'local_agent']),
  timestamp: z.number().int(),
  priority: EventPrioritySchema,
  correlationId: z.string().uuid(),
  payload: z.record(z.unknown())
});

export type EventPriority = z.infer<typeof EventPrioritySchema>;
export type JarvisEventType = z.infer<typeof JarvisEventTypeSchema>;
export type JarvisEvent = z.infer<typeof JarvisEventSchema>;
