import { toolRegistry } from './registry/tool.registry.js';
import { getCurrentTimeTool, executeGetCurrentTime } from './built-in/time.tool.js';
import { calculateTool, executeCalculate } from './built-in/calculator.tool.js';
import { getSystemStatusTool, executeGetSystemStatus } from './built-in/system-status.tool.js';
import { webSearchTool, executeWebSearch } from './built-in/web-search.tool.js';
import { jarvisTestTool, executeJarvisTest } from './built-in/jarvis-test.tool.js';
import { playYouTubeTool, executePlayYouTube } from './built-in/play-youtube.tool.js';
import { desktopAutomationTool, executeDesktopAutomation } from './built-in/desktop-automation.tool.js';
import {
  systemStatusTool, executeSystemStatus,
  systemInfoTool, executeSystemInfo,
  systemUptimeTool, executeSystemUptime,
  applicationListTool, executeApplicationList,
  applicationLaunchTool, executeApplicationLaunch,
  applicationCloseTool, executeApplicationClose,
  windowListTool, executeWindowList,
  windowFocusTool, executeWindowFocus,
  windowMinimizeTool, executeWindowMinimize,
  windowMaximizeTool, executeWindowMaximize,
  filesystemListTool, executeFilesystemList,
  filesystemReadTool, executeFilesystemRead,
  filesystemExistsTool, executeFilesystemExists
} from './built-in/desktop.tools.js';

export function initializeTools(): void {
  toolRegistry.registerTool(getCurrentTimeTool, executeGetCurrentTime);
  toolRegistry.registerTool(calculateTool, executeCalculate);
  toolRegistry.registerTool(getSystemStatusTool, executeGetSystemStatus);
  toolRegistry.registerTool(webSearchTool, executeWebSearch);
  toolRegistry.registerTool(jarvisTestTool, executeJarvisTest);
  toolRegistry.registerTool(playYouTubeTool, executePlayYouTube);
  toolRegistry.registerTool(desktopAutomationTool, executeDesktopAutomation);

  // Register Phase 3 Desktop Tools
  toolRegistry.registerTool(systemStatusTool, executeSystemStatus);
  toolRegistry.registerTool(systemInfoTool, executeSystemInfo);
  toolRegistry.registerTool(systemUptimeTool, executeSystemUptime);
  toolRegistry.registerTool(applicationListTool, executeApplicationList);
  toolRegistry.registerTool(applicationLaunchTool, executeApplicationLaunch);
  toolRegistry.registerTool(applicationCloseTool, executeApplicationClose);
  toolRegistry.registerTool(windowListTool, executeWindowList);
  toolRegistry.registerTool(windowFocusTool, executeWindowFocus);
  toolRegistry.registerTool(windowMinimizeTool, executeWindowMinimize);
  toolRegistry.registerTool(windowMaximizeTool, executeWindowMaximize);
  toolRegistry.registerTool(filesystemListTool, executeFilesystemList);
  toolRegistry.registerTool(filesystemReadTool, executeFilesystemRead);
  toolRegistry.registerTool(filesystemExistsTool, executeFilesystemExists);
}

export * from './registry/tool.registry.js';
export * from './built-in/time.tool.js';
export * from './built-in/calculator.tool.js';
export * from './built-in/system-status.tool.js';
export * from './built-in/web-search.tool.js';
export * from './built-in/jarvis-test.tool.js';
export * from './built-in/play-youtube.tool.js';
export * from './built-in/desktop-automation.tool.js';
export * from './built-in/desktop.tools.js';
