/**
 * 用户会话管理工具 - user_session_switch
 * 切换用户的当前会话
 */
import { tool } from '@opencode-ai/plugin';
import { getSessionManager } from '../../session/manager';
export const userSessionSwitchTool = tool({
    description: '切换用户的当前 OpenCode 会话',
    args: {
        userId: tool.schema.number().describe('用户QQ号'),
        sessionId: tool.schema.string().describe('目标 OpenCode 会话ID'),
    },
    async execute(args) {
        const sessionManager = getSessionManager();
        // 检查会话是否存在于用户历史中
        const history = sessionManager.getUserSessionHistory(args.userId);
        const sessionInfo = history.find(h => h.sessionId === args.sessionId);
        if (!sessionInfo) {
            return JSON.stringify({
                success: false,
                error: `Session ${args.sessionId} not found for user ${args.userId}`,
            }, null, 2);
        }
        // 切换会话
        const session = sessionManager.switchToSession(args.userId, args.sessionId);
        return JSON.stringify({
            success: true,
            userId: args.userId,
            sessionId: args.sessionId,
            title: session.title,
            switchedAt: new Date().toISOString(),
        }, null, 2);
    },
});
//# sourceMappingURL=user_session_switch.js.map