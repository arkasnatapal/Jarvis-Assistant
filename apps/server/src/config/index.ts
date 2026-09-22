import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file if available
dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  LLM_PROVIDER: z.enum(['mock', 'openai', 'anthropic', 'ollama', 'gemini']).default('mock'),
  LLM_API_KEY: z.string().optional().default(''),
  LLM_MODEL: z.string().default('gpt-4o-mini'),
  LLM_BASE_URL: z.string().optional().default(''),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  WEB_SEARCH_API_KEY: z.string().optional().default('')
});

export type Config = z.infer<typeof configSchema>;

function parseConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment configuration');
  }

  const rawConfig = result.data;

  // Resolve default base URLs if not explicitly overridden by user
  let baseUrl = rawConfig.LLM_BASE_URL;
  if (!baseUrl) {
    switch (rawConfig.LLM_PROVIDER) {
      case 'gemini':
        baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
        break;
      case 'ollama':
        baseUrl = 'http://localhost:11434/v1';
        break;
      case 'openai':
      default:
        baseUrl = 'https://api.openai.com/v1';
        break;
    }
  }

  // Set default model per provider if using default gpt-4o-mini
  let model = rawConfig.LLM_MODEL;
  if (model === 'gpt-4o-mini' && rawConfig.LLM_PROVIDER === 'gemini') {
    model = 'gemini-2.0-flash';
  } else if (model === 'gpt-4o-mini' && rawConfig.LLM_PROVIDER === 'ollama') {
    model = 'llama3.2';
  }

  return {
    ...rawConfig,
    LLM_BASE_URL: baseUrl,
    LLM_MODEL: model
  };
}

export const config = parseConfig();
