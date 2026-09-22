import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '@jarvis/shared';
import { llmRegistry } from '../llm/registry.js';
import { toolRegistry } from '../tools/index.js';
import { sessionManager } from '../sessions/session.manager.js';
import { eventBus } from '../events/event-bus.js';
import { logger } from '../logging/logger.js';

import { LanguageDetector } from '@jarvis/shared';

export interface OrchestratorRequest {
  sessionId: string;
  userPrompt: string;
  correlationId?: string;
}

export interface OrchestratorResponse {
  correlationId: string;
  sessionId: string;
  responseText: string;
  language?: string;
  toolExecuted?: {
    toolName: string;
    success: boolean;
    result?: unknown;
    error?: string;
  };
}

export interface StreamCallbacks {
  onChunk?: (chunk: string) => void;
  onEvent?: (event: unknown) => void;
}

export class JarvisOrchestrator {
  public async handleRequest(
    req: OrchestratorRequest,
    callbacks?: StreamCallbacks
  ): Promise<OrchestratorResponse> {
    const correlationId = req.correlationId || uuidv4();
    const sessionId = req.sessionId;

    logger.info({ sessionId, correlationId, prompt: req.userPrompt }, 'Orchestrator handling request');

    // Detect prompt language
    const langMeta = LanguageDetector.detectLanguage(req.userPrompt);
    eventBus.emitEvent('voice.language.detected', 'orchestrator', { language: langMeta.language, confidence: langMeta.confidence }, correlationId, 'LOW');

    // 1. Log User Message & Emit Events
    sessionManager.addMessage(sessionId, 'user', req.userPrompt, correlationId);
    eventBus.emitEvent('user.request.received', 'user_ui', { prompt: req.userPrompt }, correlationId, 'LOW');
    eventBus.emitEvent('orchestrator.started', 'orchestrator', { sessionId }, correlationId, 'LOW');

    const provider = llmRegistry.getActiveProvider();
    const history = sessionManager.getHistory(sessionId);
    const availableTools = toolRegistry.listTools();

    eventBus.emitEvent('llm.request.started', 'llm', { provider: provider.name, model: provider.id }, correlationId, 'LOW');

    let toolExecutedResult: OrchestratorResponse['toolExecuted'] | undefined;
    let finalResponseText = '';

    try {
      // 2. Initial LLM Pass
      const initialResponse = await provider.generateResponse(history, availableTools);

      if (initialResponse.toolCalls && initialResponse.toolCalls.length > 0) {
        const toolCall = initialResponse.toolCalls[0];
        logger.info({ toolName: toolCall.name, args: toolCall.args }, 'LLM requested tool execution');

        // Execute Tool via Tool Registry & Permission Engine
        const execResult = await toolRegistry.executeTool(toolCall.name, toolCall.args, {
          sessionId,
          correlationId
        });

        toolExecutedResult = {
          toolName: toolCall.name,
          success: execResult.success,
          result: execResult.result,
          error: execResult.error
        };

        // Append tool execution context to conversation history for final synthesis
        const toolOutputText = execResult.success
          ? `[Tool '${toolCall.name}' Output]: ${JSON.stringify(execResult.result)}`
          : `[Tool '${toolCall.name}' Failed]: ${execResult.error}`;

        sessionManager.addMessage(sessionId, 'system', toolOutputText, correlationId);

        // 3. Second LLM Pass (Synthesize final response using tool output)
        const updatedHistory = sessionManager.getHistory(sessionId);
        eventBus.emitEvent('llm.request.started', 'llm', { phase: 'synthesis' }, correlationId, 'LOW');

        await provider.streamResponse(updatedHistory, undefined, (chunk) => {
          if (chunk.contentChunk) {
            finalResponseText += chunk.contentChunk;
            eventBus.emitEvent('llm.response.chunk', 'llm', { chunk: chunk.contentChunk }, correlationId, 'LOW');
            callbacks?.onChunk?.(chunk.contentChunk);
          }
        });
      } else {
        // Direct Conversational Stream
        await provider.streamResponse(history, availableTools, (chunk) => {
          if (chunk.contentChunk) {
            finalResponseText += chunk.contentChunk;
            eventBus.emitEvent('llm.response.chunk', 'llm', { chunk: chunk.contentChunk }, correlationId, 'LOW');
            callbacks?.onChunk?.(chunk.contentChunk);
          }
        });
      }

      if (!finalResponseText && toolExecutedResult) {
        const resObj = toolExecutedResult.result as any;
        finalResponseText = resObj?.message || (toolExecutedResult.success
          ? `Executed tool '${toolExecutedResult.toolName}' successfully.`
          : `Attempted to run tool '${toolExecutedResult.toolName}', but encountered an error: ${toolExecutedResult.error}`);
      }


      // Save Assistant Response to Session History
      sessionManager.addMessage(sessionId, 'assistant', finalResponseText, correlationId);

      eventBus.emitEvent('llm.request.completed', 'llm', { length: finalResponseText.length }, correlationId, 'LOW');
      eventBus.emitEvent('orchestrator.completed', 'orchestrator', { sessionId, success: true }, correlationId, 'LOW');

      return {
        correlationId,
        sessionId,
        responseText: finalResponseText,
        language: langMeta.language,
        toolExecuted: toolExecutedResult
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'Orchestrator request failed';
      logger.error({ err, correlationId }, 'Orchestrator error');
      eventBus.emitEvent('llm.request.failed', 'llm', { error: errorMsg }, correlationId, 'HIGH');
      eventBus.emitEvent('system.error', 'orchestrator', { error: errorMsg }, correlationId, 'HIGH');
      throw err;
    }
  }
}

export const orchestrator = new JarvisOrchestrator();
