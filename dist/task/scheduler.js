/**
 * 任务调度器 - 管理延时和定时任务
 * 支持 delay（延时）和 scheduled（定时）两种模式
 */
import * as fs from 'fs';
import * as path from 'path';
class TaskScheduler {
    constructor() {
        this.tasks = new Map();
        this.timers = new Map();
        this.executionCallback = null;
        this.taskIdCounter = 1;
        this.dataPath = path.join(process.cwd(), 'data', 'tasks.json');
        this.loadData();
    }
    /**
     * 设置任务执行回调
     */
    setExecutionCallback(callback) {
        this.executionCallback = callback;
    }
    /**
     * 创建延时任务
     */
    createDelayTask(userId, sessionId, name, prompt, config) {
        const totalMinutes = (config.hours || 0) * 60 + (config.minutes || 0);
        const nextRunAt = Date.now() + totalMinutes * 60 * 1000;
        const task = {
            id: `task_${this.taskIdCounter++}_${Date.now()}`,
            userId,
            sessionId,
            name,
            prompt,
            scheduleType: 'delay',
            scheduleConfig: {
                minutes: config.minutes,
                hours: config.hours,
                hour: 0,
            },
            status: 'pending',
            createdAt: Date.now(),
            nextRunAt,
            runCount: 0,
        };
        this.tasks.set(task.id, task);
        this.scheduleTask(task);
        this.saveData();
        return task;
    }
    /**
     * 创建定时任务
     */
    createScheduledTask(userId, sessionId, name, prompt, config) {
        const nextRunAt = this.calculateNextRunTime(config);
        const task = {
            id: `task_${this.taskIdCounter++}_${Date.now()}`,
            userId,
            sessionId,
            name,
            prompt,
            scheduleType: 'scheduled',
            scheduleConfig: config,
            status: 'pending',
            createdAt: Date.now(),
            nextRunAt,
            runCount: 0,
        };
        this.tasks.set(task.id, task);
        this.scheduleTask(task);
        this.saveData();
        return task;
    }
    /**
     * 计算下次运行时间
     */
    calculateNextRunTime(config) {
        const now = new Date();
        const targetHour = config.hour;
        const targetMinute = config.minute || 0;
        switch (config.mode) {
            case 'weekly': {
                const days = config.days || [1, 2, 3, 4, 5];
                let next = new Date();
                next.setHours(targetHour, targetMinute, 0, 0);
                if (next <= now) {
                    next.setDate(next.getDate() + 1);
                }
                // 找到下一个匹配的星期几
                for (let i = 0; i < 7; i++) {
                    const checkDate = new Date(now);
                    checkDate.setDate(now.getDate() + i);
                    checkDate.setHours(targetHour, targetMinute, 0, 0);
                    if (checkDate > now && days.includes(checkDate.getDay())) {
                        return checkDate.getTime();
                    }
                }
                return next.getTime();
            }
            case 'monthly': {
                const targetDay = config.day || 1;
                let next = new Date(now.getFullYear(), now.getMonth(), targetDay, targetHour, targetMinute);
                if (next <= now) {
                    next = new Date(now.getFullYear(), now.getMonth() + 1, targetDay, targetHour, targetMinute);
                }
                return next.getTime();
            }
            case 'yearly': {
                const targetMonth = (config.month || 1) - 1;
                const targetDay = config.day || 1;
                let next = new Date(now.getFullYear(), targetMonth, targetDay, targetHour, targetMinute);
                if (next <= now) {
                    next = new Date(now.getFullYear() + 1, targetMonth, targetDay, targetHour, targetMinute);
                }
                return next.getTime();
            }
            default:
                return Date.now() + 60000; // 默认1分钟后
        }
    }
    /**
     * 调度任务执行
     */
    scheduleTask(task) {
        if (!task.nextRunAt || task.status !== 'pending')
            return;
        const delay = Math.max(0, task.nextRunAt - Date.now());
        const timer = setTimeout(async () => {
            await this.executeTask(task.id);
        }, delay);
        this.timers.set(task.id, timer);
    }
    /**
     * 执行任务
     */
    async executeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'pending')
            return;
        task.status = 'running';
        task.lastRunAt = Date.now();
        this.saveData();
        try {
            if (this.executionCallback) {
                await this.executionCallback(task);
            }
            task.runCount++;
            task.status = 'completed';
        }
        catch (error) {
            task.status = 'completed'; // 标记为完成即使失败
        }
        // 如果是定时任务且设置了重复，重新调度
        if (task.scheduleType === 'scheduled' && task.scheduleConfig.repeat) {
            task.status = 'pending';
            task.nextRunAt = this.calculateNextRunTime(task.scheduleConfig);
            this.scheduleTask(task);
        }
        this.saveData();
    }
    /**
     * 获取用户任务列表
     */
    getUserTasks(userId) {
        return Array.from(this.tasks.values()).filter(t => t.userId === userId);
    }
    /**
     * 获取所有任务
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    /**
     * 获取任务
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    /**
     * 删除任务
     */
    deleteTask(userId, taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.userId !== userId)
            return false;
        // 取消定时器
        const timer = this.timers.get(taskId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(taskId);
        }
        this.tasks.delete(taskId);
        this.saveData();
        return true;
    }
    /**
     * 取消任务
     */
    cancelTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return false;
        const timer = this.timers.get(taskId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(taskId);
        }
        task.status = 'cancelled';
        this.saveData();
        return true;
    }
    /**
     * 启动所有任务调度
     */
    startAll() {
        for (const task of this.tasks.values()) {
            if (task.status === 'pending' && task.nextRunAt && task.nextRunAt > Date.now()) {
                this.scheduleTask(task);
            }
            else if (task.status === 'pending' && task.scheduleType === 'scheduled' && task.scheduleConfig.repeat) {
                // 重新计算下次运行时间
                task.nextRunAt = this.calculateNextRunTime(task.scheduleConfig);
                this.scheduleTask(task);
            }
        }
    }
    /**
     * 停止所有任务
     */
    stopAll() {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }
    /**
     * 保存数据
     */
    saveData() {
        const dir = path.dirname(this.dataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const data = {
            tasks: Array.from(this.tasks.values()),
            taskIdCounter: this.taskIdCounter,
            savedAt: Date.now(),
        };
        fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
    }
    /**
     * 加载数据
     */
    loadData() {
        if (!fs.existsSync(this.dataPath))
            return;
        try {
            const content = fs.readFileSync(this.dataPath, 'utf-8');
            const data = JSON.parse(content);
            if (Array.isArray(data.tasks)) {
                for (const task of data.tasks) {
                    this.tasks.set(task.id, task);
                }
            }
            if (data.taskIdCounter) {
                this.taskIdCounter = data.taskIdCounter;
            }
        }
        catch (error) { }
    }
}
// 单例实例
let schedulerInstance = null;
export function getTaskScheduler() {
    if (!schedulerInstance) {
        schedulerInstance = new TaskScheduler();
    }
    return schedulerInstance;
}
//# sourceMappingURL=scheduler.js.map