import { SystemStatusSnapshot } from '@jarvis/shared';
import { config } from '../config/index.js';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  components: SystemStatusSnapshot;
}

const startTime = Date.now();

export function getHealthStatus(wsConnectedClientsCount = 0): HealthCheckResult {
  const isLLMConfigured = config.LLM_PROVIDER === 'mock' || Boolean(config.LLM_API_KEY);
  
  const components: SystemStatusSnapshot = {
    core: 'ONLINE',
    server: 'ONLINE',
    llm: isLLMConfigured ? 'ONLINE' : 'DEGRADED',
    websocket: 'CONNECTED',
    tools: 'READY'
  };

  const isDegraded = Object.values(components).some((val) => val === 'DEGRADED');

  return {
    status: isDegraded ? 'degraded' : 'ok',
    service: 'jarvis-server',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    components
  };
}
