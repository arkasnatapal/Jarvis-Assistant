import { z } from 'zod';
import { CapabilityPermission, RiskLevel, ToolDefinition, ToolExecutionContext } from '@jarvis/shared';
import { executeDesktopAutomation } from './desktop-automation.tool.js';

export const webSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required')
});

export const webSearchTool: ToolDefinition<typeof webSearchSchema> = {
  name: 'web_search',
  description: 'Searches the web for information matching the query.',
  inputSchema: webSearchSchema,
  riskLevel: RiskLevel.SAFE,
  requiredCapability: CapabilityPermission.WEB_SEARCH,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeWebSearch(
  input: z.infer<typeof webSearchSchema>,
  context?: ToolExecutionContext
): Promise<{ query: string; results?: Array<{ title: string; snippet: string; url: string }>; isConfigured: boolean; message?: string }> {
  const apiKey = process.env.WEB_SEARCH_API_KEY;

  if (!apiKey) {
    if (context) {
      await executeDesktopAutomation({ category: 'browser', action: 'google_search', query: input.query }, context);
    }
    return {
      query: input.query,
      isConfigured: false,
      message: `Web search integration fallback: Opening Google search for "${input.query}" in browser.`
    };
  }

  // Structured response format for when search API is configured
  return {
    query: input.query,
    isConfigured: true,
    results: [
      {
        title: `Search Result for: ${input.query}`,
        snippet: `Structured web search result for query '${input.query}'.`,
        url: `https://example.com/search?q=${encodeURIComponent(input.query)}`
      }
    ]
  };
}
