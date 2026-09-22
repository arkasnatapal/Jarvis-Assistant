import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
import { JarvisEvent, JarvisEventType, EventPriority } from '@jarvis/shared';
import { logger } from '../logging/logger.js';

export type EventListener = (event: JarvisEvent) => void;

class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  public emitEvent(
    eventType: JarvisEventType,
    source: JarvisEvent['source'],
    payload: Record<string, unknown>,
    correlationId: string,
    priority: EventPriority = 'LOW'
  ): JarvisEvent {
    const event: JarvisEvent = {
      eventId: uuidv4(),
      eventType,
      source,
      timestamp: Date.now(),
      priority,
      correlationId,
      payload
    };

    logger.debug({ eventType, correlationId, source }, 'Event emitted');
    this.emitter.emit('event', event);
    this.emitter.emit(eventType, event);

    return event;
  }

  public onAny(listener: EventListener): () => void {
    this.emitter.on('event', listener);
    return () => this.emitter.off('event', listener);
  }

  public on(eventType: JarvisEventType, listener: EventListener): () => void {
    this.emitter.on(eventType, listener);
    return () => this.emitter.off(eventType, listener);
  }
}

export const eventBus = new EventBus();
