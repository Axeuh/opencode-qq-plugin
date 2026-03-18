/**
 * 日志服务器 - 提供 HTTP 接口查看实时日志
 */
import * as http from 'http';
/**
 * 添加日志
 */
export declare function addLog(message: string): void;
/**
 * 创建日志服务器
 */
export declare function createLogServer(port?: number): http.Server;
/**
 * 重写 console.log (静默模式 - 不输出到 TUI)
 */
export declare function interceptConsole(): void;
//# sourceMappingURL=log-server.d.ts.map