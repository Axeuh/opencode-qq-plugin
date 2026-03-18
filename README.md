# OpenCode QQ Plugin

将 QQ 消息与 OpenCode AI 集成的插件，支持 Web 界面，**无需 OpenCode HTTP API**。

## 核心特性

- **QQ 消息集成**：通过 WebSocket 连接 NapCat 接收 QQ 消息
- **AI 对话**：将消息转发到 OpenCode AI 处理
- **Web 界面**：完整的 Web 管理界面（端口 8080）
- **无需 HTTP API**：使用插件钩子监听事件，不需要 `--port` 参数
- **命令系统**：支持 /help, /new, /session, /agent, /model 等命令
- **自定义工具**：AI 可调用 qq_send_message, qq_get_friends 等工具

## 架构设计

### 事件流架构

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   QQ 消息       │     │   OpenCode       │     │   Web 界面      │
│  (NapCat WS)    │────▶│   插件钩子       │────▶│   (SSE 事件)    │
└─────────────────┘     │   event: {}      │     └─────────────────┘
                        └──────────────────┘
```

**关键设计**：
- 使用插件 `event` 钩子监听 OpenCode 内部事件
- 通过 `broadcastOpenCodeEvent` 广播给 Web SSE 客户端
- 完全不需要 OpenCode HTTP API（不依赖 `--port` 参数）

### 目录结构

```
opencode-qq-plugin/
├── src/
│   ├── index.ts           # 插件入口，事件钩子
│   ├── web-server.ts      # Web 服务器，SSE 事件广播
│   ├── tools/             # 自定义工具
│   │   └── index.ts       # qq_send_message, qq_get_friends 等
│   ├── session/           # 会话管理
│   │   └── manager.ts     # 用户会话映射
│   ├── config/            # 配置加载
│   │   └── loader.ts      # JSON 配置解析
│   ├── cache/             # 缓存服务
│   │   └── agent-model.ts # 智能体/模型缓存
│   ├── napcat/            # NapCat 客户端
│   │   └── client.ts      # WebSocket 连接
│   ├── types/             # 类型定义
│   ├── log-server.ts      # 日志服务器 (4099)
│   └── api-server.ts      # API 测试服务器 (4098)
├── public/
│   └── index.html         # Web 界面
├── config.json            # 插件配置
├── package.json
└── tsconfig.json
```

## 安装

### 方式1: npm 安装（推荐）

```bash
# 全局安装
npm install -g opencode-qq-plugin

# 或者在项目中安装
npm install opencode-qq-plugin
```

### 方式2: 从源码安装

```bash
# 克隆仓库
git clone https://github.com/your-username/opencode-qq-plugin.git

# 安装依赖并构建
cd opencode-qq-plugin
npm install
npm run build
```

### 配置

1. 复制配置模板：
   ```bash
   cp config.example.json config.json
   ```

2. 编辑 `config.json`，填写必要信息：
   - `bot.qqId`: 机器人 QQ 号
   - `napcat.websocket.accessToken`: NapCat 访问令牌
   - `whitelist.qqUsers`: 允许使用的 QQ 号列表
   - `whitelist.groups`: 允许使用的群号列表

### 启动

```json
{
  "bot": {
    "name": "Axeuh_home",
    "qqId": "3938121220",
    "adminQq": "2176284372"
  },
  "napcat": {
    "websocket": {
      "url": "ws://localhost:3002",
      "accessToken": "your-token",
      "heartbeatInterval": 30000,
      "reconnectInterval": 5000
    },
    "httpApi": {
      "baseUrl": "http://localhost:3001",
      "accessToken": "your-token",
      "timeout": 30,
      "enabled": true
    }
  },
  "opencode": {
    "host": "127.0.0.1",
    "port": 4091,
    "directory": "C:\\",
    "defaultAgent": "Sisyphus (Ultraworker)",
    "defaultModel": "alibaba-coding-plan-cn/glm-5",
    "defaultProvider": "alibaba-coding-plan-cn",
    "supportedAgents": ["Sisyphus (Ultraworker)", "Prometheus", "Atlas"],
    "supportedModels": ["alibaba-coding-plan-cn/glm-5", ...]
  },
  "whitelist": {
    "qqUsers": [2176284372],
    "groups": [813729523]
  },
  "session": {
    "storageType": "file",
    "filePath": "data/sessions.json",
    "maxSessionsPerUser": 100,
    "isolateByUser": false
  },
  "webServer": {
    "enabled": true,
    "port": 8080
  }
}
```

### 配置项说明

| 配置项 | 说明 |
|--------|------|
| `bot` | 机器人基本信息（名称、QQ号、管理员） |
| `napcat.websocket` | NapCat WebSocket 连接配置 |
| `napcat.httpApi` | NapCat HTTP API 配置 |
| `opencode` | OpenCode 相关配置（智能体、模型默认值） |
| `whitelist` | 白名单用户和群组 |
| `session.isolateByUser` | `true`=用户隔离模式，`false`=全局模式 |
| `webServer.enabled` | 是否启用 Web 界面 |

## 使用

### 启动方式

1. 在项目目录创建 `.opencode/opencode.json`：
   ```json
   {
     "plugin": ["./opencode-qq-plugin"]
   }
   ```

2. 启动 OpenCode（**无需 `--port` 参数**）：
   ```bash
   opencode
   ```

### 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Web 界面 | 8080 | Web 管理界面 |
| 日志服务器 | 4099 | 实时日志流 |
| API 测试 | 4098 | 模拟消息发送 |

### QQ 命令

| 命令 | 功能 | 示例 |
|------|------|------|
| `/help` | 显示帮助 | `/help` |
| `/new` | 创建新会话 | `/new 我的会话` |
| `/session` | 查看/切换会话 | `/session` 或 `/session 1` |
| `/agent` | 查看/切换智能体 | `/agent` 或 `/agent 1` |
| `/model` | 查看/切换模型 | `/model` 或 `/model 1` |

### 自定义工具

| 工具 | 描述 | 参数 |
|------|------|------|
| `qq_send_message` | 发送 QQ 私聊或群聊消息 | `user_id`, `group_id`, `message` |
| `qq_get_friends` | 获取好友列表 | 无 |
| `qq_get_group_history` | 获取群历史消息 | `group_id`, `count` |

### Web 界面

访问 `http://127.0.0.1:8080` 即可使用 Web 界面：

- 用户认证（QQ号 + 密码）
- 会话管理
- 实时 SSE 事件流
- 智能体/模型切换
- 消息历史查看

## API 端点

### 认证 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/login` | POST | 登录 |
| `/api/password/set` | POST | 设置密码 |
| `/api/password/change` | POST | 修改密码 |

### 会话 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/session/list` | POST | 获取会话列表 |
| `/api/session/new` | POST | 创建新会话 |
| `/api/session/switch` | POST | 切换会话 |
| `/api/session/delete` | POST | 删除会话 |

### OpenCode API（SDK 模式）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/opencode/sessions` | GET/POST | 会话列表/创建 |
| `/api/opencode/sessions/:id/messages` | GET/POST | 消息列表/发送 |
| `/api/opencode/agents` | GET | 智能体列表 |
| `/api/opencode/models` | GET | 模型列表 |
| `/api/opencode/events` | GET | SSE 事件流（插件钩子模式） |

## 技术细节

### SDK 模式 vs HTTP API 模式

| 特性 | SDK 模式 | HTTP API 模式 |
|------|----------|---------------|
| 启动参数 | 无需 `--port` | 需要 `--port 4099` |
| 事件获取 | 插件钩子 `event` | SDK `global.event()` |
| 依赖 | 无外部依赖 | 需要 HTTP API 服务 |

### 事件钩子实现

```typescript
// src/index.ts
return {
  event: async ({ event }) => {
    const sseEvent = {
      directory: directory,
      payload: {
        type: event.type,
        properties: event.properties,
      },
    };
    broadcastOpenCodeEvent(sseEvent);
  },
};
```

### SSE 事件广播

```typescript
// src/web-server.ts
const eventListeners: Set<EventCallback> = new Set();

export function subscribeToEvents(callback: EventCallback): () => void {
  eventListeners.add(callback);
  return () => eventListeners.delete(callback);
}

export function broadcastOpenCodeEvent(event: any): void {
  for (const callback of eventListeners) {
    callback(event);
  }
}
```

## 从 Python 版本迁移

此插件是从 Python 版本重构而来，主要变化：

| 项目 | Python 版本 | TypeScript 版本 |
|------|-------------|-----------------|
| 语言 | Python | TypeScript |
| 配置 | YAML | JSON |
| 架构 | 独立程序 | OpenCode 插件 |
| 消息处理 | HTTP 服务 | OpenCode SDK |
| 事件流 | 轮询/HTTP | 插件钩子 |

## 开发

```bash
# 开发模式（监听变化）
npm run dev

# 构建
npm run build
```

## 许可证

MIT