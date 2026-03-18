/**
 * 智能体管理工具 - agent_set
 * 设置用户智能体
 */
import { tool } from '@opencode-ai/plugin';
import { getSessionManager } from '../../session/manager';
import { getAgentModelCache } from '../../cache/agent-model';
import { getOpenCodeConfig } from '../../config/loader';
export const agentSetTool = tool({
    description: '设置用户的默认智能体',
    args: {
        userId: tool.schema.number().describe('用户QQ号'),
        agent: tool.schema.string().describe('智能体名称'),
    },
    async execute(args) {
        const sessionManager = getSessionManager();
        const cache = getAgentModelCache();
        const config = getOpenCodeConfig();
        // 验证智能体是否存在
        const validAgents = cache.isInitialized()
            ? cache.getAgentNames()
            : config.supportedAgents;
        if (!validAgents.includes(args.agent)) {
            return JSON.stringify({
                success: false,
                error: `Invalid agent: ${args.agent}. Available: ${validAgents.join(', ')}`,
            }, null, 2);
        }
        // 更新用户配置
        sessionManager.updateUserConfig(args.userId, { agent: args.agent });
        return JSON.stringify({
            success: true,
            userId: args.userId,
            agent: args.agent,
            message: 'Agent updated successfully',
        }, null, 2);
    },
});
//# sourceMappingURL=agent_set.js.map