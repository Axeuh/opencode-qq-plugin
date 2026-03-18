/**
 * 智能体管理工具 - agent_get
 * 获取用户当前智能体
 */
import { tool } from '@opencode-ai/plugin';
import { getSessionManager } from '../../session/manager';
import { getOpenCodeConfig } from '../../config/loader';
export const agentGetTool = tool({
    description: '获取用户当前设置的智能体',
    args: {
        userId: tool.schema.number().describe('用户QQ号'),
    },
    async execute(args) {
        const sessionManager = getSessionManager();
        const config = getOpenCodeConfig();
        const userSession = sessionManager.getUserSession(args.userId);
        const userConfig = sessionManager.getUserConfig(args.userId);
        const currentAgent = userSession?.agent || userConfig?.agent || config.defaultAgent;
        return JSON.stringify({
            success: true,
            userId: args.userId,
            agent: currentAgent,
        }, null, 2);
    },
});
//# sourceMappingURL=agent_get.js.map