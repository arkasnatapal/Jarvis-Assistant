import { z } from 'zod';
import { CapabilityPermission, RiskLevel, ToolDefinition, ToolExecutionContext } from '@jarvis/shared';
import { localAgentGateway } from '../../agent/local-agent.gateway.js';
import { logger } from '../../logging/logger.js';

// 1. System Status Tool
export const SystemStatusInputSchema = z.object({});
export const systemStatusTool: ToolDefinition<typeof SystemStatusInputSchema> = {
  name: 'system_status',
  description: 'Retrieve real-time system status and hardware telemetry (CPU, RAM, Disk, GPU, Battery, Network, OS, Uptime) from host Windows machine.',
  inputSchema: SystemStatusInputSchema,
  riskLevel: RiskLevel.LOW,
  requiredCapability: CapabilityPermission.SYSTEM_STATUS,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeSystemStatus(_input: {}, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('system.status', {}, context);
  if (res.success && res.result) {
    const d = res.result as any;
    const cpu = d.cpu_usage_percent ?? 0;
    const mem = d.memory ? `${d.memory.percent}% (${d.memory.used_gb} GB / ${d.memory.total_gb} GB)` : 'N/A';
    const disk = d.disk ? `${d.disk.percent}% (${d.disk.used_gb} GB / ${d.disk.total_gb} GB)` : 'N/A';
    const osStr = d.os || 'Windows';
    const uptimeStr = d.uptime_seconds ? `${Math.floor(d.uptime_seconds / 3600)}h ${Math.floor((d.uptime_seconds % 3600) / 60)}m ${d.uptime_seconds % 60}s` : 'N/A';
    const gpu = d.gpu || 'N/A';
    const bat = d.battery ? `${d.battery.percent}% (${d.battery.power_plugged ? 'Plugged in' : 'On battery'})` : 'N/A';

    const msg = `System Telemetry:\n• CPU Usage: ${cpu}%\n• Memory (RAM): ${mem}\n• Disk Storage: ${disk}\n• OS Version: ${osStr}\n• System Uptime: ${uptimeStr}\n• Battery: ${bat}\n• GPU: ${gpu}`;
    return {
      ...res,
      message: msg
    };
  }
  return res;
}

// 2. System Info Tool
export const SystemInfoInputSchema = z.object({});
export const systemInfoTool: ToolDefinition<typeof SystemInfoInputSchema> = {
  name: 'system_info',
  description: 'Get static hardware, OS version, architecture, and system specifications.',
  inputSchema: SystemInfoInputSchema,
  riskLevel: RiskLevel.LOW,
  requiredCapability: CapabilityPermission.SYSTEM_INFO,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeSystemInfo(_input: {}, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('system.info', {}, context);
  if (res.success && res.result) {
    const d = res.result as any;
    const msg = `System Information:\n• Hostname: ${d.hostname || 'N/A'}\n• OS: ${d.os} ${d.release} (${d.architecture})\n• CPU Logical Cores: ${d.cpu_count_logical || 'N/A'}\n• Python Version: ${d.python_version || 'N/A'}`;
    return { ...res, message: msg };
  }
  return res;
}

// 3. System Uptime Tool
export const SystemUptimeInputSchema = z.object({});
export const systemUptimeTool: ToolDefinition<typeof SystemUptimeInputSchema> = {
  name: 'system_uptime',
  description: 'Get current host system uptime and boot timestamp.',
  inputSchema: SystemUptimeInputSchema,
  riskLevel: RiskLevel.LOW,
  requiredCapability: CapabilityPermission.SYSTEM_UPTIME,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeSystemUptime(_input: {}, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('system.uptime', {}, context);
  if (res.success && res.result) {
    const d = res.result as any;
    const msg = `System Uptime: ${d.uptime_formatted || d.uptime_seconds + ' seconds'}`;
    return { ...res, message: msg };
  }
  return res;
}

// 4. Application List Tool
export const ApplicationListInputSchema = z.object({});
export const applicationListTool: ToolDefinition<typeof ApplicationListInputSchema> = {
  name: 'application_list',
  description: 'List currently running applications and GUI processes.',
  inputSchema: ApplicationListInputSchema,
  riskLevel: RiskLevel.LOW,
  requiredCapability: CapabilityPermission.APPLICATION_LIST,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeApplicationList(_input: {}, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('application.list', {}, context);
  if (res.success && Array.isArray(res.result)) {
    const list = res.result as any[];
    if (list.length === 0) {
      return { ...res, message: 'No registered allowlisted applications are currently running.' };
    }
    const appStr = list.map((a) => `${a.displayName || a.name} (PID: ${a.pid})`).join(', ');
    return { ...res, message: `Running Applications (${list.length}): ${appStr}` };
  }
  return res;
}

// 5. Application Launch Tool
export const ApplicationLaunchInputSchema = z.object({
  applicationId: z.enum(['vscode', 'chrome', 'notepad', 'calculator', 'explorer', 'terminal'])
    .describe('Allowlisted application identifier to launch (vscode, chrome, notepad, calculator, explorer, terminal).')
});

export const applicationLaunchTool: ToolDefinition<typeof ApplicationLaunchInputSchema> = {
  name: 'application_launch',
  description: 'Safely launch an application on the Windows desktop using an allowlisted application identifier (vscode, chrome, notepad, calculator, explorer, terminal). Arbitrary binary paths are prohibited.',
  inputSchema: ApplicationLaunchInputSchema,
  riskLevel: RiskLevel.MEDIUM,
  requiredCapability: CapabilityPermission.APPLICATION_LAUNCH,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeApplicationLaunch(input: z.infer<typeof ApplicationLaunchInputSchema>, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('application.launch', input, context);
  if (res.success && res.result) {
    const d = res.result as any;
    return { ...res, message: d.message || `Successfully launched ${input.applicationId}.` };
  }
  return res;
}

// 6. Application Close Tool (CONFIRMATION REQUIRED)
export const ApplicationCloseInputSchema = z.object({
  applicationId: z.enum(['vscode', 'chrome', 'notepad', 'calculator', 'explorer', 'terminal'])
    .describe('Allowlisted application identifier to close.')
});

export const applicationCloseTool: ToolDefinition<typeof ApplicationCloseInputSchema> = {
  name: 'application_close',
  description: 'Close active instances of a target application on Windows. Requires explicit user confirmation.',
  inputSchema: ApplicationCloseInputSchema,
  riskLevel: RiskLevel.HIGH,
  requiredCapability: CapabilityPermission.APPLICATION_CLOSE,
  requiresConfirmation: true,
  timeoutMs: 15000
};

export async function executeApplicationClose(input: z.infer<typeof ApplicationCloseInputSchema>, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('application.close', input, context);
  if (res.success && res.result) {
    const d = res.result as any;
    return { ...res, message: d.message || `Closed application ${input.applicationId}.` };
  }
  return res;
}

// 7. Window List Tool
export const WindowListInputSchema = z.object({});
export const windowListTool: ToolDefinition<typeof WindowListInputSchema> = {
  name: 'window_list',
  description: 'List visible desktop window handles (HWND) and window titles.',
  inputSchema: WindowListInputSchema,
  riskLevel: RiskLevel.LOW,
  requiredCapability: CapabilityPermission.WINDOW_LIST,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeWindowList(_input: {}, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('window.list', {}, context);
  if (res.success && Array.isArray(res.result)) {
    const list = res.result as any[];
    if (list.length === 0) {
      return { ...res, message: 'No visible windows found on desktop.' };
    }
    const winStr = list.slice(0, 10).map((w) => `"${w.title}" (HWND: ${w.hwnd})`).join(', ');
    return { ...res, message: `Visible Windows (${list.length}): ${winStr}${list.length > 10 ? '...' : ''}` };
  }
  return res;
}

// 8. Window Focus Tool
export const WindowFocusInputSchema = z.object({
  query: z.string().describe('Window title or window handle (HWND) to bring to the front.')
});

export const windowFocusTool: ToolDefinition<typeof WindowFocusInputSchema> = {
  name: 'window_focus',
  description: 'Bring a specific desktop window to the front/foreground by title or HWND.',
  inputSchema: WindowFocusInputSchema,
  riskLevel: RiskLevel.MEDIUM,
  requiredCapability: CapabilityPermission.WINDOW_FOCUS,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeWindowFocus(input: z.infer<typeof WindowFocusInputSchema>, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('window.focus', input, context);
  if (res.success && res.result) {
    const d = res.result as any;
    return { ...res, message: d.message || `Focused window matching "${input.query}".` };
  }
  return res;
}

// 9. Window Minimize Tool
export const WindowMinimizeInputSchema = z.object({
  query: z.string().describe('Window title or window handle (HWND) to minimize.')
});

export const windowMinimizeTool: ToolDefinition<typeof WindowMinimizeInputSchema> = {
  name: 'window_minimize',
  description: 'Minimize a target desktop window by title or HWND.',
  inputSchema: WindowMinimizeInputSchema,
  riskLevel: RiskLevel.MEDIUM,
  requiredCapability: CapabilityPermission.WINDOW_MINIMIZE,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeWindowMinimize(input: z.infer<typeof WindowMinimizeInputSchema>, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('window.minimize', input, context);
  if (res.success && res.result) {
    const d = res.result as any;
    return { ...res, message: d.message || `Minimized window matching "${input.query}".` };
  }
  return res;
}

// 10. Window Maximize Tool
export const WindowMaximizeInputSchema = z.object({
  query: z.string().describe('Window title or window handle (HWND) to maximize.')
});

export const windowMaximizeTool: ToolDefinition<typeof WindowMaximizeInputSchema> = {
  name: 'window_maximize',
  description: 'Maximize a target desktop window by title or HWND.',
  inputSchema: WindowMaximizeInputSchema,
  riskLevel: RiskLevel.MEDIUM,
  requiredCapability: CapabilityPermission.WINDOW_MAXIMIZE,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeWindowMaximize(input: z.infer<typeof WindowMaximizeInputSchema>, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('window.maximize', input, context);
  if (res.success && res.result) {
    const d = res.result as any;
    return { ...res, message: d.message || `Maximized window matching "${input.query}".` };
  }
  return res;
}

// 11. Filesystem List Tool
export const FilesystemListInputSchema = z.object({
  path: z.string().describe('Directory path to list inside authorized sandbox root.')
});

export const filesystemListTool: ToolDefinition<typeof FilesystemListInputSchema> = {
  name: 'filesystem_list',
  description: 'List contents of a directory strictly within authorized JARVIS sandbox root directories.',
  inputSchema: FilesystemListInputSchema,
  riskLevel: RiskLevel.MEDIUM,
  requiredCapability: CapabilityPermission.FILESYSTEM_LIST,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeFilesystemList(input: z.infer<typeof FilesystemListInputSchema>, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('filesystem.list', input, context);
  if (res.success && res.result) {
    const d = res.result as any;
    const entriesStr = d.entries ? d.entries.map((e: any) => `${e.name}${e.isDirectory ? '/' : ''}`).join(', ') : '';
    return { ...res, message: `Directory contents of "${d.path}" (${d.entryCount} items): ${entriesStr}` };
  }
  return res;
}

// 12. Filesystem Read Tool
export const FilesystemReadInputSchema = z.object({
  path: z.string().describe('File path to read strictly inside authorized sandbox root.')
});

export const filesystemReadTool: ToolDefinition<typeof FilesystemReadInputSchema> = {
  name: 'filesystem_read',
  description: 'Read content of a text file strictly within authorized JARVIS sandbox root directories.',
  inputSchema: FilesystemReadInputSchema,
  riskLevel: RiskLevel.MEDIUM,
  requiredCapability: CapabilityPermission.FILESYSTEM_READ,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeFilesystemRead(input: z.infer<typeof FilesystemReadInputSchema>, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('filesystem.read', input, context);
  if (res.success && res.result) {
    const d = res.result as any;
    return { ...res, message: `File Content of "${d.path}" (${d.sizeBytes} bytes):\n${d.content}` };
  }
  return res;
}

// 13. Filesystem Exists Tool
export const FilesystemExistsInputSchema = z.object({
  path: z.string().describe('Path to check existence strictly inside authorized sandbox root.')
});

export const filesystemExistsTool: ToolDefinition<typeof FilesystemExistsInputSchema> = {
  name: 'filesystem_exists',
  description: 'Check if a file or folder exists within authorized JARVIS sandbox root directories.',
  inputSchema: FilesystemExistsInputSchema,
  riskLevel: RiskLevel.LOW,
  requiredCapability: CapabilityPermission.FILESYSTEM_EXISTS,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeFilesystemExists(input: z.infer<typeof FilesystemExistsInputSchema>, context: ToolExecutionContext) {
  const res = await localAgentGateway.executeCapability('filesystem.exists', input, context);
  if (res.success && res.result) {
    const d = res.result as any;
    if (!d.allowed) {
      return { ...res, message: d.message || `Access Denied: Path "${input.path}" is outside authorized sandbox boundary.` };
    }
    return { ...res, message: d.exists ? `Path "${d.path}" exists (${d.isDirectory ? 'directory' : 'file'}).` : `Path "${d.path}" does not exist.` };
  }
  return res;
}
