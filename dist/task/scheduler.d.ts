/**
 * 任务调度器 - 管理延时和定时任务
 * 支持 delay（延时）和 scheduled（定时）两种模式
 */
export interface TaskScheduleConfig {
    minutes?: number;
    hours?: number;
    mode?: 'weekly' | 'monthly' | 'yearly';
    days?: number[];
    day?: number;
    month?: number;
    hour: number;
    minute?: number;
    repeat?: boolean;
}
export interface Task {
    id: string;
    userId: number;
    sessionId: string;
    name: string;
    prompt: string;
    scheduleType: 'delay' | 'scheduled';
    scheduleConfig: TaskScheduleConfig;
    status: 'pending' | 'running' | 'completed' | 'cancelled';
    createdAt: number;
    nextRunAt?: number;
    lastRunAt?: number;
    runCount: number;
}
export interface TaskExecutionCallback {
    (task: Task): Promise<void>;
}
declare class TaskScheduler {
    private tasks;
    private timers;
    private executionCallback;
    private dataPath;
    private taskIdCounter;
    constructor();
    /**
     * 设置任务执行回调
     */
    setExecutionCallback(callback: TaskExecutionCallback): void;
    /**
     * 创建延时任务
     */
    createDelayTask(userId: number, sessionId: string, name: string, prompt: string, config: {
        minutes?: number;
        hours?: number;
    }): Task;
    /**
     * 创建定时任务
     */
    createScheduledTask(userId: number, sessionId: string, name: string, prompt: string, config: TaskScheduleConfig): Task;
    /**
     * 计算下次运行时间
     */
    private calculateNextRunTime;
    /**
     * 调度任务执行
     */
    private scheduleTask;
    /**
     * 执行任务
     */
    private executeTask;
    /**
     * 获取用户任务列表
     */
    getUserTasks(userId: number): Task[];
    /**
     * 获取所有任务
     */
    getAllTasks(): Task[];
    /**
     * 获取任务
     */
    getTask(taskId: string): Task | undefined;
    /**
     * 删除任务
     */
    deleteTask(userId: number, taskId: string): boolean;
    /**
     * 取消任务
     */
    cancelTask(taskId: string): boolean;
    /**
     * 启动所有任务调度
     */
    startAll(): void;
    /**
     * 停止所有任务
     */
    stopAll(): void;
    /**
     * 保存数据
     */
    private saveData;
    /**
     * 加载数据
     */
    private loadData;
}
export declare function getTaskScheduler(): TaskScheduler;
export {};
//# sourceMappingURL=scheduler.d.ts.map