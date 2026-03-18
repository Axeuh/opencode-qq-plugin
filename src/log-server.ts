/**
 * 日志服务器 - 提供 HTTP 接口查看实时日志
 */

import * as http from 'http';

// 日志缓冲区
const logBuffer: string[] = [];
const MAX_LOG_LINES = 1000;

// WebSocket 客户端列表 (简单实现)
const clients: Set<http.ServerResponse> = new Set();

/**
 * 添加日志
 */
export function addLog(message: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  
  logBuffer.push(logLine);
  if (logBuffer.length > MAX_LOG_LINES) {
    logBuffer.shift();
  }
  
  // 广播给所有客户端
  broadcast(logLine);
}

/**
 * 广播日志到客户端
 */
function broadcast(message: string): void {
  const data = `data: ${message}\n\n`;
  clients.forEach(client => {
    try {
      client.write(data);
    } catch (e) {
      clients.delete(client);
    }
  });
}

/**
 * 创建日志服务器
 */
export function createLogServer(port: number = 4099): http.Server {
  const server = http.createServer((req, res) => {
    const url = req.url || '/';
    
    // SSE 端点 - 实时日志流
    if (url === '/logs/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      
      // 发送现有日志
      res.write(`data: === Connected to QQ Plugin Log Stream ===\n\n`);
      logBuffer.slice(-50).forEach(line => {
        res.write(`data: ${line}\n\n`);
      });
      
      clients.add(res);
      
      req.on('close', () => {
        clients.delete(res);
      });
      return;
    }
    
    // JSON API - 获取日志
    if (url === '/logs' || url === '/logs/json') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({
        logs: logBuffer.slice(-100),
        total: logBuffer.length
      }, null, 2));
      return;
    }
    
    // HTML 页面 - 日志查看器
    if (url === '/' || url === '/logs.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(LOG_VIEWER_HTML);
      return;
    }
    
    // 清除日志
    if (url === '/logs/clear') {
      logBuffer.length = 0;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Logs cleared' }));
      return;
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });
  
  server.listen(port, () => {
    addLog(`[LogServer] HTTP server started on http://127.0.0.1:${port}`);
    addLog(`[LogServer] View logs at: http://127.0.0.1:${port}/`);
    addLog(`[LogServer] SSE stream at: http://127.0.0.1:${port}/logs/stream`);
  });
  
  return server;
}

/**
 * 重写 console.log (静默模式 - 不输出到 TUI)
 */
export function interceptConsole(): void {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.log = (...args: any[]) => {
    const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    addLog(message);
    // 不调用 originalLog，静默模式
  };
  
  console.error = (...args: any[]) => {
    const message = '[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    addLog(message);
    // 不调用 originalError，静默模式
  };
  
  console.warn = (...args: any[]) => {
    const message = '[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    addLog(message);
    // 不调用 originalWarn，静默模式
  };
}

// 日志查看器 HTML
const LOG_VIEWER_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>QQ Plugin Logs</title>
  <style>
    body { font-family: monospace; background: #1a1a1a; color: #eee; margin: 0; padding: 10px; }
    .header { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #2a2a2a; border-radius: 5px; margin-bottom: 10px; }
    .status { display: flex; align-items: center; gap: 8px; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; background: #4ade80; animation: pulse 2s infinite; }
    .status-dot.disconnected { background: #ef4444; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    button { padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer; }
    button:hover { background: #2563eb; }
    #logs { height: calc(100vh - 80px); overflow-y: auto; background: #0a0a0a; padding: 10px; border-radius: 5px; font-size: 13px; }
    .log-line { padding: 2px 0; border-bottom: 1px solid #222; }
    .log-time { color: #666; }
    .log-error { color: #ef4444; }
    .log-warn { color: #f59e0b; }
    .log-info { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin:0">QQ Plugin Logs</h2>
    <div class="status">
      <div class="status-dot" id="statusDot"></div>
      <span id="statusText">Connecting...</span>
    </div>
    <div>
      <button onclick="clearLogs()">Clear</button>
      <button onclick="location.reload()">Refresh</button>
    </div>
  </div>
  <div id="logs"></div>
  <script>
    const logsDiv = document.getElementById('logs');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    let eventSource;
    
    function connect() {
      eventSource = new EventSource('/logs/stream');
      
      eventSource.onopen = () => {
        statusDot.classList.remove('disconnected');
        statusText.textContent = 'Connected';
      };
      
      eventSource.onmessage = (e) => {
        const line = document.createElement('div');
        line.className = 'log-line';
        
        let text = e.data;
        if (text.includes('[ERROR]')) line.classList.add('log-error');
        else if (text.includes('[WARN]')) line.classList.add('log-warn');
        else if (text.includes('[QQPlugin]')) line.classList.add('log-info');
        
        line.textContent = text;
        logsDiv.appendChild(line);
        logsDiv.scrollTop = logsDiv.scrollHeight;
        
        // 限制行数
        while (logsDiv.children.length > 500) {
          logsDiv.removeChild(logsDiv.firstChild);
        }
      };
      
      eventSource.onerror = () => {
        statusDot.classList.add('disconnected');
        statusText.textContent = 'Disconnected - Reconnecting...';
        setTimeout(connect, 3000);
      };
    }
    
    function clearLogs() {
      fetch('/logs/clear').then(() => logsDiv.innerHTML = '');
    }
    
    connect();
  </script>
</body>
</html>`;