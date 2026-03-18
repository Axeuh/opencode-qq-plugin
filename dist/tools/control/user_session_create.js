/**
 * 用户会话管理工具 - user_session_create
 * 为用户创建新会话映射
 */
import { tool } from '@opencode-ai/plugin';
import { getSessionManager } from '../../session/manager';
// OpenCode 客户端引用（由插件初始化时设置）
let opencodeClient = null;
export function setOpenCodeClient(client) {
    opencodeClient = client;
}
export const userSessionCreateTool = tool({
    description: '为用户创建新的 OpenCode 会话映射',
    args: {
        userId: tool.schema.number().describe('用户QQ号'),
        title: tool.schema.string().optional().describe('会话标题（可选）'),
    },
    async execute(args) {
        if (!opencodeClient) {
            return JSON.stringify({
                success: false,
                error: 'OpenCode client not initialized',
            }, null, 2);
        }
        try {
            const sessionManager = getSessionManager();
            // 使用 SDK 创建 OpenCode 会话
            const result = await opencodeClient.session.create({
                body: {
                    title: args.title || `QQ_${args.userId}`,
                },
            });
            if (result.error) {
                return JSON.stringify({
                    success: false,
                    error: JSON.stringify(result.error),
                }, null, 2);
            }
            const sessionId = result.data?.id;
            if (!sessionId) {
                return JSON.stringify({
                    success: false,
                    error: 'Failed to get session ID',
                }, null, 2);
            }
            // 创建本地会话映射
            const session = sessionManager.createUserSession(args.userId, sessionId, args.title);
            return JSON.stringify({
                success: true,
                userId: args.userId,
                sessionId,
                title: session.title,
                createdAt: new Date(session.createdAt).toISOString(),
            }, null, 2);
        }
        catch (error) {
            return JSON.stringify({
                success: false,
                error: error.message || 'Unknown error',
            }, null, 2);
        }
    },
});
//# sourceMappingURL=user_session_create.js.map