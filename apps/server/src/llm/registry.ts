import { LLMProvider } from './provider.js';
import { MockLLMProvider } from './providers/mock.provider.js';
import { OpenAICompatibleProvider } from './providers/openai.provider.js';
import { config } from '../config/index.js';
import { logger } from '../logging/logger.js';

class LLMRegistry {
  private providers = new Map<string, LLMProvider>();

  constructor() {
    this.registerProvider(new MockLLMProvider());
    this.registerProvider(new OpenAICompatibleProvider('openai', 'OpenAI Provider'));
    this.registerProvider(new OpenAICompatibleProvider('gemini', 'Google Gemini Provider'));
    this.registerProvider(new OpenAICompatibleProvider('ollama', 'Local Ollama Provider'));
    this.registerProvider(new OpenAICompatibleProvider('anthropic', 'Anthropic Provider'));
  }

  public registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
    logger.debug({ providerId: provider.id, name: provider.name }, 'LLM Provider registered');
  }

  public getActiveProvider(): LLMProvider {
    const configuredId = config.LLM_PROVIDER;
    const provider = this.providers.get(configuredId);

    if (!provider) {
      logger.warn({ configuredId }, 'Configured LLM provider not found, falling back to mock provider');
      return this.providers.get('mock')!;
    }

    return provider;
  }

  public logStartupStatus(): void {
    const activeProvider = this.getActiveProvider();
    const isConfigured = config.LLM_PROVIDER === 'ollama' || config.LLM_PROVIDER === 'mock' || Boolean(config.LLM_API_KEY);

    const providerDisplayName =
      config.LLM_PROVIDER === 'gemini' ? 'Gemini' :
      config.LLM_PROVIDER === 'openai' ? 'OpenAI' :
      config.LLM_PROVIDER === 'ollama' ? 'Ollama' :
      config.LLM_PROVIDER === 'anthropic' ? 'Anthropic' : 'Mock';

    console.log(`[JARVIS] LLM Provider: ${providerDisplayName}`);
    console.log(`[JARVIS] Model: ${config.LLM_MODEL}`);
    console.log(`[JARVIS] API configured: ${isConfigured ? 'YES' : 'NO'}`);

    logger.info({
      provider: providerDisplayName,
      model: config.LLM_MODEL,
      apiConfigured: isConfigured
    }, 'JARVIS LLM Provider Startup Status');
  }
}

export const llmRegistry = new LLMRegistry();
