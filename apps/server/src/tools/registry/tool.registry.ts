import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { ConfirmationRequest, PermissionDecisionState, ToolDefinition, ToolExecutionContext } from '@jarvis/shared';
import { permissionEngine } from '../../permissions/permission.engine.js';
import { eventBus } from '../../events/event-bus.js';
import { logger } from '../../logging/logger.js';

export type ToolHandler<TInput = any, TOutput = any> = (input: TInput, ctx: ToolExecutionContext) => Promise<TOutput>;

export interface ToolRecord {
  definition: ToolDefinition;
  handler: ToolHandler;
}

interface PendingConfirmation {
  resolve: (approved: boolean) => void;
  timer: NodeJS.Timeout;
}

class ToolRegistry {
  private tools = new Map<string, ToolRecord>();
  private pendingConfirmations = new Map<string, PendingConfirmation>();

  public registerTool<TInput extends z.ZodTypeAny, TOutput>(
    definition: ToolDefinition<TInput, TOutput>,
    handler: ToolHandler<z.infer<TInput>, TOutput>
  ): void {
    if (this.tools.has(definition.name)) {
      logger.warn({ toolName: definition.name }, 'Overwriting existing tool registration');
    }
    this.tools.set(definition.name, { definition, handler });
    logger.info({ toolName: definition.name }, 'Tool registered successfully');
  }

  public getTool(name: string): ToolRecord | undefined {
    return this.tools.get(name);
  }

  public listTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  public resolveConfirmation(confirmationId: string, approved: boolean): boolean {
    const pending = this.pendingConfirmations.get(confirmationId);
    if (!pending) {
      return false;
    }
    clearTimeout(pending.timer);
    this.pendingConfirmations.delete(confirmationId);
    pending.resolve(approved);
    return true;
  }

  public async executeTool(
    name: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const toolRecord = this.tools.get(name);
    if (!toolRecord) {
      const errorMsg = `Tool '${name}' not found in registry`;
      logger.error({ toolName: name }, errorMsg);
      eventBus.emitEvent('tool.failed', 'tool_system', { toolName: name, error: errorMsg }, context.correlationId, 'HIGH');
      return { success: false, error: errorMsg };
    }

    const { definition, handler } = toolRecord;

    // Emit tool requested event
    eventBus.emitEvent('tool.requested', 'tool_system', { toolName: name, args }, context.correlationId, 'LOW');

    // 1. Schema Validation Stage
    const schemaValidation = definition.inputSchema.safeParse(args);
    if (!schemaValidation.success) {
      const errorMsg = `Invalid arguments for tool '${name}': ${schemaValidation.error.message}`;
      logger.warn({ toolName: name, error: schemaValidation.error.format() }, errorMsg);
      eventBus.emitEvent('tool.failed', 'tool_system', { toolName: name, error: errorMsg }, context.correlationId, 'HIGH');
      return { success: false, error: errorMsg };
    }

    const validatedArgs = schemaValidation.data;

    // 2. Permission Evaluation Stage
    const permission = permissionEngine.evaluatePermission(definition, validatedArgs);
    eventBus.emitEvent(
      'tool.permission_checked',
      'permission_engine',
      { toolName: name, decision: permission.state, reason: permission.reason },
      context.correlationId,
      'LOW'
    );

    if (permission.state === PermissionDecisionState.DENY) {
      const errorMsg = `Permission denied for tool '${name}': ${permission.reason}`;
      logger.warn({ toolName: name }, errorMsg);
      eventBus.emitEvent('tool.failed', 'tool_system', { toolName: name, error: errorMsg }, context.correlationId, 'HIGH');
      return { success: false, error: errorMsg };
    }

    // 3. Human-In-The-Loop Confirmation Stage
    if (permission.state === PermissionDecisionState.REQUIRE_CONFIRMATION) {
      const confirmationId = uuidv4();
      const targetStr = validatedArgs.applicationId || validatedArgs.path || validatedArgs.query || JSON.stringify(validatedArgs);
      
      const reqPayload: ConfirmationRequest = {
        confirmationId,
        toolName: name,
        capability: definition.requiredCapability,
        riskLevel: definition.riskLevel,
        actionDescription: `JARVIS wants to execute '${name}' on target '${targetStr}'`,
        target: String(targetStr),
        reason: permission.reason,
        correlationId: context.correlationId
      };

      logger.info({ confirmationId, toolName: name }, 'Tool requires explicit HITL approval. Emitting confirmation request.');
      eventBus.emitEvent('tool.confirmation_required', 'permission_engine', { ...reqPayload }, context.correlationId, 'HIGH');

      const userApproved = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          this.pendingConfirmations.delete(confirmationId);
          logger.warn({ confirmationId, toolName: name }, 'Confirmation request timed out');
          resolve(false);
        }, 30000); // 30 second approval timeout

        this.pendingConfirmations.set(confirmationId, { resolve, timer });
      });

      eventBus.emitEvent('tool.confirmation_responded', 'permission_engine', { confirmationId, approved: userApproved }, context.correlationId, 'LOW');

      if (!userApproved) {
        const errorMsg = `User rejected execution of tool '${name}' or approval request timed out.`;
        logger.warn({ toolName: name, confirmationId }, errorMsg);
        eventBus.emitEvent('tool.failed', 'tool_system', { toolName: name, error: errorMsg }, context.correlationId, 'HIGH');
        return { success: false, error: errorMsg };
      }
    }

    // 4. Execution Stage
    eventBus.emitEvent('tool.started', 'tool_system', { toolName: name }, context.correlationId, 'LOW');
    logger.info({ toolName: name, args: validatedArgs }, 'Executing tool');

    try {
      const result = await Promise.race([
        handler(validatedArgs, context),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Tool execution timed out after ${definition.timeoutMs}ms`)), definition.timeoutMs)
        )
      ]);

      eventBus.emitEvent('tool.completed', 'tool_system', { toolName: name, result }, context.correlationId, 'LOW');
      return { success: true, result };
    } catch (err: any) {
      const errorMsg = err?.message || `Unknown error executing tool '${name}'`;
      logger.error({ toolName: name, err }, 'Tool execution error');
      eventBus.emitEvent('tool.failed', 'tool_system', { toolName: name, error: errorMsg }, context.correlationId, 'HIGH');
      return { success: false, error: errorMsg };
    }
  }
}

export const toolRegistry = new ToolRegistry();
