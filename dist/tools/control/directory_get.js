/**
 * 工作目录管理工具 - directory_get
 * 获取用户工作目录
 */
import { tool } from '@opencode-ai/plugin';
import { getSessionManager } from '../../session/manager';
import { getOpenCodeConfig } from '../../config/loader';
export const directoryGetTool = tool({
    description: '获取用户当前的工作目录',
    args: {
        userId: tool.schema.number().describe('用户QQ号'),
    },
    async execute(args) {
        const sessionManager = getSessionManager();
        const config = getOpenCodeConfig();
        const userSession = sessionManager.getUserSession(args.userId);
        const userConfig = sessionManager.getUserConfig(args.userId);
        const directory = userSession?.directory || userConfig?.directory || config.directory;
        return JSON.stringify({
            success: true,
            userId: args.userId,
            directory: directory,
        }, null, 2);
    },
});
//# sourceMappingURL=directory_get.js.map