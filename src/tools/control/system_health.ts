/**
 * 系统管理工具 - system_health
 * 检查 Bot 服务器健康状态
 */

import { tool, ToolDefinition } from '@opencode-ai/plugin';
import { getNapCatClient } from '../../napcat/client';
import { getAgentModelCache } from '../../cache/agent-model';

export const systemHealthTool: ToolDefinition = tool({
  description: '检查 Bot 服务器的健康状态',
  args: {},
  async execute(args) {
    const napcat = getNapCatClient();
    const cache = getAgentModelCache();

    const checks: { name: string; status: string; details?: string }[] = [];

    // 检查 NapCat 连接
    checks.push({
      name: 'NapCat WebSocket',
      status: napcat.isActive() ? 'healthy' : 'disconnected',
      details: napcat.isActive() ? 'Connected to NapCat' : 'Not connected to NapCat',
    });

    // 检查 Agent/Model 缓存
    checks.push({
      name: 'Agent/Model Cache',
      status: cache.isInitialized() ? 'healthy' : 'not_initialized',
      details: cache.isInitialized() 
        ? `${cache.getAgents().length} agents, ${cache.getModels().length} models`
        : 'Cache not initialized',
    });

    // 整体状态
    const allHealthy = checks.every(c => c.status === 'healthy');

    return JSON.stringify({
      success: true,
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    }, null, 2);
  },
});