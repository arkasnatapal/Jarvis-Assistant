import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, JarvisSession } from '@jarvis/shared';

class SessionManager {
  private sessions = new Map<string, JarvisSession>();
  private messageHistory = new Map<string, ChatMessage[]>();

  public getOrCreateSession(sessionId?: string): JarvisSession {
    if (sessionId && this.sessions.has(sessionId)) {
      const existing = this.sessions.get(sessionId)!;
      existing.updatedAt = Date.now();
      return existing;
    }

    const id = sessionId || uuidv4();
    const newSession: JarvisSession = {
      id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.sessions.set(id, newSession);
    this.messageHistory.set(id, []);
    return newSession;
  }

  public getHistory(sessionId: string): ChatMessage[] {
    return this.messageHistory.get(sessionId) || [];
  }

  public addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    correlationId?: string
  ): ChatMessage {
    this.getOrCreateSession(sessionId);
    const history = this.messageHistory.get(sessionId)!;

    const message: ChatMessage = {
      messageId: uuidv4(),
      sessionId,
      role,
      content,
      timestamp: Date.now(),
      correlationId
    };

    history.push(message);
    return message;
  }

  public clearSession(sessionId: string): boolean {
    this.sessions.delete(sessionId);
    return this.messageHistory.delete(sessionId);
  }
}

export const sessionManager = new SessionManager();
