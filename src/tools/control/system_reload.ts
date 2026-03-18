/**
 * 系统管理工具 - system_reload
 * 热重载 Bot 服务器配置
 */

import { tool, ToolDefinition } from '@opencode-ai/plugin';
import { initConfig } from '../../config/loader';
import { getAgentModelCache } from '../../cache/agent-model';
import { getOpenCodeConfig } from '../../config/loader';

export const systemReloadTool: ToolDefinition = tool({
  description: '热重载 Bot 服务器配置（重新加载配置文件和刷新缓存）',
  args: {},
  async execute(args) {
    const results: { action: string; success: boolean; message: string }[] = [];

    // 重新加载配置文件
    try {
      initConfig();
      results.push({
        action: 'config_reload',
        success: true,
        message: 'Configuration reloaded',
      });
    } catch (error: any) {
      results.push({
        action: 'config_reload',
        success: false,
        message: error.message,
      });
    }

    // 刷新 Agent/Model 缓存
    try {
      const cache = getAgentModelCache();
      const config = getOpenCodeConfig();
      await cache.reload(config.supportedAgents, config.supportedModels);
      results.push({
        action: 'cache_refresh',
        success: true,
        message: `Cache refreshed: ${cache.getAgents().length} agents, ${cache.getModels().length} models`,
      });
    } catch (error: any) {
      results.push({
        action: 'cache_refresh',
        success: false,
        message: error.message,
      });
    }

    const allSuccess = results.every(r => r.success);

    return JSON.stringify({
      success: allSuccess,
      message: allSuccess ? 'Reload completed' : 'Reload completed with errors',
      results,
      timestamp: new Date().toISOString(),
    }, null, 2);
  },
});