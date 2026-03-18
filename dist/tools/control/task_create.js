/**
 * 任务管理工具 - task_create
 * 创建定时任务
 */
import { tool } from '@opencode-ai/plugin';
import { getTaskScheduler } from '../../task/scheduler';
export const taskCreateTool = tool({
    description: '创建延时或定时任务。schedule_type: delay(延时), scheduled(定时)。schedule_config: delay模式用{minutes, hours}，scheduled模式用{mode, days/day/month, hour, repeat}',
    args: {
        userId: tool.schema.number().describe('用户QQ号'),
        sessionId: tool.schema.string().describe('OpenCode 会话ID'),
        name: tool.schema.string().describe('任务名称'),
        prompt: tool.schema.string().describe('任务提示词（到时间发送给AI）'),
        scheduleType: tool.schema.enum(['delay', 'scheduled']).describe('计划类型'),
        scheduleConfig: tool.schema.object({}).describe('计划配置，JSON对象'),
    },
    async execute(args) {
        const scheduler = getTaskScheduler();
        try {
            let task;
            if (args.scheduleType === 'delay') {
                const config = args.scheduleConfig;
                task = scheduler.createDelayTask(args.userId, args.sessionId, args.name, args.prompt, {
                    minutes: config.minutes,
                    hours: config.hours,
                });
            }
            else {
                const config = args.scheduleConfig;
                task = scheduler.createScheduledTask(args.userId, args.sessionId, args.name, args.prompt, config);
            }
            return JSON.stringify({
                success: true,
                taskId: task.id,
                name: task.name,
                scheduleType: task.scheduleType,
                nextRunAt: task.nextRunAt ? new Date(task.nextRunAt).toISOString() : null,
                message: 'Task created successfully',
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
//# sourceMappingURL=task_create.js.map