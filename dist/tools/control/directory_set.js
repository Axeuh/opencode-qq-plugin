/**
 * 工作目录管理工具 - directory_set
 * 设置用户工作目录
 */
import { tool } from '@opencode-ai/plugin';
import { getSessionManager } from '../../session/manager';
import * as fs from 'fs';
export const directorySetTool = tool({
    description: '设置用户的工作目录（用于 OpenCode 执行任务的目录）',
    args: {
        userId: tool.schema.number().describe('用户QQ号'),
        directory: tool.schema.string().describe('工作目录路径'),
    },
    async execute(args) {
        // 验证目录是否存在
        if (!fs.existsSync(args.directory)) {
            return JSON.stringify({
                success: false,
                error: `Directory does not exist: ${args.directory}`,
            }, null, 2);
        }
        const sessionManager = getSessionManager();
        sessionManager.updateUserConfig(args.userId, { directory: args.directory });
        return JSON.stringify({
            success: true,
            userId: args.userId,
            directory: args.directory,
            message: 'Working directory updated',
        }, null, 2);
    },
});
//# sourceMappingURL=directory_set.js.map