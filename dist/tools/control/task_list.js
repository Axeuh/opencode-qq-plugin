/**
 * 任务管理工具 - task_list
 * 获取用户任务列表
 */
import { tool } from '@opencode-ai/plugin';
import { getTaskScheduler } from '../../task/scheduler';
export const taskListTool = tool({
    description: '获取用户的定时/延时任务列表',
    args: {
        userId: tool.schema.number().describe('用户QQ号'),
    },
    async execute(args) {
        const scheduler = getTaskScheduler();
        const tasks = scheduler.getUserTasks(args.userId);
        const formattedTasks = tasks.map(t => ({
            id: t.id,
            name: t.name,
            scheduleType: t.scheduleType,
            status: t.status,
            sessionId: t.sessionId,
            createdAt: new Date(t.createdAt).toISOString(),
            nextRunAt: t.nextRunAt ? new Date(t.nextRunAt).toISOString() : null,
            lastRunAt: t.lastRunAt ? new Date(t.lastRunAt).toISOString() : null,
            runCount: t.runCount,
        }));
        return JSON.stringify({
            success: true,
            userId: args.userId,
            count: formattedTasks.length,
            tasks: formattedTasks,
        }, null, 2);
    },
});
//# sourceMappingURL=task_list.js.map