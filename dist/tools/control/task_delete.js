/**
 * 任务管理工具 - task_delete
 * 删除任务
 */
import { tool } from '@opencode-ai/plugin';
import { getTaskScheduler } from '../../task/scheduler';
export const taskDeleteTool = tool({
    description: '删除用户的定时/延时任务',
    args: {
        userId: tool.schema.number().describe('用户QQ号'),
        taskId: tool.schema.string().describe('任务ID'),
    },
    async execute(args) {
        const scheduler = getTaskScheduler();
        const deleted = scheduler.deleteTask(args.userId, args.taskId);
        if (!deleted) {
            return JSON.stringify({
                success: false,
                error: `Task ${args.taskId} not found for user ${args.userId}`,
            }, null, 2);
        }
        return JSON.stringify({
            success: true,
            taskId: args.taskId,
            message: 'Task deleted successfully',
        }, null, 2);
    },
});
//# sourceMappingURL=task_delete.js.map