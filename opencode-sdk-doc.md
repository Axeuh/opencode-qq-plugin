# OpenCode SDK 完整功能说明

**版本**: 1.2.27  
**更新时间**: 2025-03

---

## 目录

1. [SDK 概述](#sdk-概述)
2. [安装与导入](#安装与导入)
3. [SDK 包结构](#sdk-包结构)
4. [客户端 API (OpencodeClient)](#客户端-api-opencodeclient)
5. [服务端 API](#服务端-api)
6. [插件系统](#插件系统)
7. [类型定义](#类型定义)
8. [使用示例](#使用示例)

---

## SDK 概述

OpenCode SDK 是一个 TypeScript/JavaScript SDK，用于与 OpenCode AI 平台进行交互。它提供了两个主要包：

- **@opencode-ai/sdk**: 核心 SDK，提供客户端和服务端 API
- **@opencode-ai/plugin**: 插件开发工具包，用于创建 OpenCode 插件

### 核心特性

- 完整的 REST API 客户端
- WebSocket 事件订阅
- 会话管理
- 文件操作
- PTY (伪终端) 管理
- MCP (Model Context Protocol) 支持
- LSP (Language Server Protocol) 集成
- 代码格式化支持
- 插件钩子系统

---

## 安装与导入

```bash
npm install @opencode-ai/sdk @opencode-ai/plugin
```

### 导入方式

```typescript
// 客户端 API
import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk/client'

// 服务端 API
import { createOpencodeServer, createOpencodeTui } from '@opencode-ai/sdk/server'

// 完整 SDK
import { createOpencode } from '@opencode-ai/sdk'

// V2 版本
import { createOpencode as createOpencodeV2 } from '@opencode-ai/sdk/v2'

// 插件开发
import { tool, ToolDefinition } from '@opencode-ai/plugin'
```

---

## SDK 包结构

```
@opencode-ai/sdk/
├── dist/
│   ├── index.js           # 主入口
│   ├── client.js          # 客户端模块
│   ├── server.js          # 服务端模块
│   ├── gen/               # 自动生成的类型和 API
│   │   ├── types.gen.d.ts # 所有类型定义
│   │   ├── sdk.gen.d.ts   # SDK 类定义
│   │   └── client/        # 客户端工具
│   └── v2/                # V2 版本 API
│       ├── index.js
│       ├── client.js
│       └── server.js

@opencode-ai/plugin/
├── dist/
│   ├── index.js           # 插件入口
│   ├── tool.js            # 工具定义
│   └── shell.js           # Shell 工具
```

---

## 客户端 API (OpencodeClient)

### 创建客户端

```typescript
import { createOpencodeClient } from '@opencode-ai/sdk/client'

// 创建客户端实例
const client = createOpencodeClient({
  baseUrl: 'http://localhost:4091',
  directory: '/path/to/project'  // 可选，项目目录
})
```

### API 模块分类

#### 1. Global - 全局事件

```typescript
// 获取全局事件流 (SSE)
const events = await client.global.event()
```

#### 2. Project - 项目管理

```typescript
// 列出所有项目
const projects = await client.project.list()

// 获取当前项目
const current = await client.project.current()
```

#### 3. Session - 会话管理

```typescript
// 列出所有会话
const sessions = await client.session.list()

// 创建新会话
const session = await client.session.create({
  body: { title: '新会话', parentID: 'parent-session-id' }
})

// 获取会话状态
const status = await client.session.status()

// 获取会话详情
const session = await client.session.get({ path: { id: 'session-id' } })

// 更新会话
await client.session.update({
  path: { id: 'session-id' },
  body: { title: '新标题' }
})

// 删除会话
await client.session.delete({ path: { id: 'session-id' } })

// 获取会话子会话
const children = await client.session.children({ path: { id: 'session-id' } })

// 获取会话 Todo 列表
const todos = await client.session.todo({ path: { id: 'session-id' } })

// 初始化会话 (创建 AGENTS.md)
await client.session.init({
  path: { id: 'session-id' },
  body: { modelID: 'model-id', providerID: 'provider-id', messageID: 'msg-id' }
})

// Fork 会话
const forked = await client.session.fork({
  path: { id: 'session-id' },
  body: { messageID: 'msg-id' }
})

// 中止会话
await client.session.abort({ path: { id: 'session-id' } })

// 分享/取消分享会话
await client.session.share({ path: { id: 'session-id' } })
await client.session.unshare({ path: { id: 'session-id' } })

// 获取会话差异
const diffs = await client.session.diff({ path: { id: 'session-id' } })

// 总结会话
await client.session.summarize({
  path: { id: 'session-id' },
  body: { providerID: 'provider-id', modelID: 'model-id' }
})

// 获取会话消息列表
const messages = await client.session.messages({
  path: { id: 'session-id' },
  query: { limit: 50 }
})

// 发送消息 (同步等待响应)
const response = await client.session.prompt({
  path: { id: 'session-id' },
  body: {
    parts: [{ type: 'text', text: '你好' }],
    agent: 'build',
    model: { providerID: 'anthropic', modelID: 'claude-3-opus' }
  }
})

// 发送消息 (异步，立即返回)
await client.session.promptAsync({
  path: { id: 'session-id' },
  body: { parts: [{ type: 'text', text: '你好' }] }
})

// 获取单条消息
const message = await client.session.message({
  path: { id: 'session-id', messageID: 'msg-id' }
})

// 执行命令
const cmdResult = await client.session.command({
  path: { id: 'session-id' },
  body: { command: '/help', arguments: '' }
})

// 执行 Shell 命令
const shellResult = await client.session.shell({
  path: { id: 'session-id' },
  body: { command: 'ls -la', agent: 'build' }
})

// 撤销消息
await client.session.revert({
  path: { id: 'session-id' },
  body: { messageID: 'msg-id' }
})

// 恢复撤销的消息
await client.session.unrevert({ path: { id: 'session-id' } })

// 响应权限请求
await client.postSessionIdPermissionsPermissionId({
  path: { id: 'session-id', permissionID: 'perm-id' },
  body: { response: 'allow' }  // 'once' | 'always' | 'reject'
})
```

#### 4. Config - 配置管理

```typescript
// 获取配置
const config = await client.config.get()

// 更新配置
await client.config.update({
  body: { model: 'anthropic/claude-3-opus' }
})

// 获取所有 Provider
const providers = await client.config.providers()
```

#### 5. Provider - 模型提供商

```typescript
// 列出所有提供商
const providers = await client.provider.list()

// 获取认证方法
const authMethods = await client.provider.auth()

// OAuth 授权
const authUrl = await client.provider.oauth.authorize({
  path: { id: 'provider-id' },
  body: { method: 0 }
})

// OAuth 回调
await client.provider.oauth.callback({
  path: { id: 'provider-id' },
  body: { method: 0, code: 'auth-code' }
})
```

#### 6. Tool - 工具管理

```typescript
// 获取工具 ID 列表
const toolIds = await client.tool.ids()

// 获取工具列表 (带参数 schema)
const tools = await client.tool.list({
  query: { provider: 'anthropic', model: 'claude-3-opus' }
})
```

#### 7. File - 文件操作

```typescript
// 列出文件和目录
const files = await client.file.list({
  query: { path: '/src' }
})

// 读取文件
const content = await client.file.read({
  query: { path: '/src/index.ts' }
})

// 获取文件状态
const status = await client.file.status()
```

#### 8. Find - 搜索功能

```typescript
// 搜索文本
const textResults = await client.find.text({
  query: { pattern: 'function' }
})

// 搜索文件
const fileResults = await client.find.files({
  query: { query: '*.ts', dirs: 'false' }
})

// 搜索符号
const symbols = await client.find.symbols({
  query: { query: 'MyClass' }
})
```

#### 9. Pty - 伪终端管理

```typescript
// 列出所有 PTY 会话
const ptys = await client.pty.list()

// 创建 PTY 会话
const pty = await client.pty.create({
  body: {
    command: 'bash',
    args: [],
    cwd: '/home/user',
    title: 'Terminal',
    env: { TERM: 'xterm-256color' }
  }
})

// 获取 PTY 信息
const ptyInfo = await client.pty.get({ path: { id: 'pty-id' } })

// 更新 PTY
await client.pty.update({
  path: { id: 'pty-id' },
  body: { title: 'New Title', size: { rows: 24, cols: 80 } }
})

// 连接 PTY
await client.pty.connect({ path: { id: 'pty-id' } })

// 删除 PTY
await client.pty.remove({ path: { id: 'pty-id' } })
```

#### 10. Mcp - Model Context Protocol

```typescript
// 获取 MCP 状态
const mcpStatus = await client.mcp.status()

// 添加 MCP 服务器
await client.mcp.add({
  body: {
    name: 'my-mcp',
    config: {
      type: 'local',
      command: ['node', 'mcp-server.js'],
      environment: { API_KEY: 'xxx' }
    }
  }
})

// 连接 MCP 服务器
await client.mcp.connect({ path: { name: 'my-mcp' } })

// 断开 MCP 服务器
await client.mcp.disconnect({ path: { name: 'my-mcp' } })

// MCP OAuth 认证
const authResult = await client.mcp.auth.authenticate({
  path: { name: 'my-mcp' }
})

// 设置认证
await client.auth.set({
  path: { id: 'provider-id' },
  body: { type: 'api', key: 'api-key' }
})
```

#### 11. Lsp - Language Server Protocol

```typescript
// 获取 LSP 状态
const lspStatus = await client.lsp.status()
```

#### 12. Formatter - 代码格式化

```typescript
// 获取格式化器状态
const formatterStatus = await client.formatter.status()
```

#### 13. App - 应用信息

```typescript
// 写日志
await client.app.log({
  body: { service: 'my-app', level: 'info', message: 'Hello' }
})

// 获取所有 Agent
const agents = await client.app.agents()
```

#### 14. Command - 命令管理

```typescript
// 列出所有命令
const commands = await client.command.list()
```

#### 15. Tui - 终端 UI 控制

```typescript
// 追加提示文本
await client.tui.appendPrompt({ body: { text: 'Hello' } })

// 打开帮助对话框
await client.tui.openHelp()

// 打开会话对话框
await client.tui.openSessions()

// 打开主题对话框
await client.tui.openThemes()

// 打开模型对话框
await client.tui.openModels()

// 提交提示
await client.tui.submitPrompt()

// 清除提示
await client.tui.clearPrompt()

// 执行 TUI 命令
await client.tui.executeCommand({ body: { command: 'agent_cycle' } })

// 显示 Toast 通知
await client.tui.showToast({
  body: {
    title: '提示',
    message: '操作成功',
    variant: 'success',
    duration: 3000
  }
})

// 发布事件
await client.tui.publish({
  body: {
    type: 'tui.toast.show',
    properties: { message: 'Hello', variant: 'info' }
  }
})
```

#### 16. Event - 事件订阅

```typescript
// 订阅事件流 (SSE)
const eventStream = await client.event.subscribe()
```

#### 17. Instance - 实例管理

```typescript
// 销毁实例
await client.instance.dispose()
```

#### 18. Path - 路径信息

```typescript
// 获取路径信息
const paths = await client.path.get()
```

#### 19. Vcs - 版本控制

```typescript
// 获取 VCS 信息
const vcsInfo = await client.vcs.get()
```

---

## 服务端 API

### 创建服务端

```typescript
import { createOpencodeServer, createOpencodeTui } from '@opencode-ai/sdk/server'

// 创建 HTTP 服务器
const server = await createOpencodeServer({
  hostname: 'localhost',
  port: 4091,
  timeout: 300000,
  config: {
    model: 'anthropic/claude-3-opus'
  }
})

console.log(`Server running at ${server.url}`)

// 关闭服务器
server.close()
```

### 创建 TUI

```typescript
// 创建终端 UI
const tui = createOpencodeTui({
  project: '/path/to/project',
  model: 'anthropic/claude-3-opus',
  session: 'session-id',
  agent: 'build'
})

// 关闭 TUI
tui.close()
```

### createOpencode (一体化)

```typescript
import { createOpencode } from '@opencode-ai/sdk'

// 同时创建客户端和服务器
const { client, server } = await createOpencode({
  hostname: 'localhost',
  port: 4091
})

// 使用客户端
const sessions = await client.session.list()

// 关闭
server.close()
```

---

## 插件系统

### 插件输入类型

```typescript
type PluginInput = {
  client: OpencodeClient       // OpenCode 客户端
  project: Project             // 项目信息
  directory: string            // 项目目录
  worktree: string             // Worktree 路径
  serverUrl: URL               // 服务器 URL
  $: BunShell                  // Shell 工具
}
```

### 插件函数签名

```typescript
type Plugin = (input: PluginInput) => Promise<Hooks>
```

### 插件钩子 (Hooks)

```typescript
interface Hooks {
  // 事件钩子
  event?: (input: { event: Event }) => Promise<void>
  
  // 配置钩子
  config?: (input: Config) => Promise<void>
  
  // 工具注册
  tool?: { [key: string]: ToolDefinition }
  
  // 认证钩子
  auth?: AuthHook
  
  // 聊天消息钩子
  'chat.message'?: (input, output) => Promise<void>
  
  // 聊天参数钩子
  'chat.params'?: (input, output) => Promise<void>
  
  // 聊天请求头钩子
  'chat.headers'?: (input, output) => Promise<void>
  
  // 权限请求钩子
  'permission.ask'?: (input, output) => Promise<void>
  
  // 命令执行前钩子
  'command.execute.before'?: (input, output) => Promise<void>
  
  // 工具执行前钩子
  'tool.execute.before'?: (input, output) => Promise<void>
  
  // Shell 环境钩子
  'shell.env'?: (input, output) => Promise<void>
  
  // 工具执行后钩子
  'tool.execute.after'?: (input, output) => Promise<void>
  
  // 消息转换钩子 (实验性)
  'experimental.chat.messages.transform'?: (input, output) => Promise<void>
  
  // 系统提示转换钩子 (实验性)
  'experimental.chat.system.transform'?: (input, output) => Promise<void>
  
  // 会话压缩钩子 (实验性)
  'experimental.session.compacting'?: (input, output) => Promise<void>
  
  // 文本完成钩子 (实验性)
  'experimental.text.complete'?: (input, output) => Promise<void>
  
  // 工具定义钩子
  'tool.definition'?: (input, output) => Promise<void>
}
```

### 创建工具

```typescript
import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'

// 定义工具
const myTool = tool({
  description: '这是一个示例工具',
  args: {
    input: z.string().describe('输入参数'),
    count: z.number().optional().describe('可选的数量参数')
  },
  async execute(args, context) {
    // context 包含: sessionID, messageID, agent, directory, worktree, abort, metadata, ask
    
    // 设置元数据
    context.metadata({ title: '执行中...', metadata: { custom: 'value' } })
    
    // 请求权限
    await context.ask({
      permission: 'read_file',
      patterns: ['*.ts'],
      always: ['src/**'],
      metadata: { reason: '读取源代码' }
    })
    
    return `处理结果: ${args.input}`
  }
})

// 导出插件
export default async function myPlugin(input: PluginInput) {
  return {
    tool: {
      my_tool: myTool
    }
  }
}
```

### 工具上下文 (ToolContext)

```typescript
type ToolContext = {
  sessionID: string          // 会话 ID
  messageID: string          // 消息 ID
  agent: string              // 当前 Agent
  directory: string          // 项目目录
  worktree: string           // Worktree 根目录
  abort: AbortSignal         // 中止信号
  metadata: (input: {        // 设置元数据
    title?: string
    metadata?: Record<string, any>
  }) => void
  ask: (input: AskInput) => Promise<void>  // 请求权限
}
```

### Shell 工具 (BunShell)

```typescript
// 使用 Shell
const { $ } = input

// 执行命令
const result = await $`ls -la`

// 获取输出
const text = await result.text()
const json = await result.json()
const lines = await result.lines()

// 链式调用
const output = await $`echo hello`.quiet().text()

// 设置工作目录
const output = await $`pwd`.cwd('/home/user').text()

// 设置环境变量
const output = await $`echo $MY_VAR`.env({ MY_VAR: 'value' }).text()

// 不抛出异常
const result = await $`exit 1`.nothrow()
```

---

## 类型定义

### 核心类型

#### Message (消息)

```typescript
type Message = UserMessage | AssistantMessage

type UserMessage = {
  id: string
  sessionID: string
  role: 'user'
  time: { created: number }
  summary?: { title?: string; body?: string; diffs: FileDiff[] }
  agent: string
  model: { providerID: string; modelID: string }
  system?: string
  tools?: Record<string, boolean>
}

type AssistantMessage = {
  id: string
  sessionID: string
  role: 'assistant'
  time: { created: number; completed?: number }
  error?: ProviderAuthError | UnknownError | MessageOutputLengthError | MessageAbortedError | ApiError
  parentID: string
  modelID: string
  providerID: string
  mode: string
  path: { cwd: string; root: string }
  summary?: boolean
  cost: number
  tokens: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
  finish?: string
}
```

#### Part (消息部分)

```typescript
type Part = TextPart | ReasoningPart | FilePart | ToolPart | StepStartPart | StepFinishPart | SnapshotPart | PatchPart | AgentPart | RetryPart | CompactionPart | SubtaskPart

type TextPart = {
  id: string
  sessionID: string
  messageID: string
  type: 'text'
  text: string
  synthetic?: boolean
  ignored?: boolean
  time?: { start: number; end?: number }
  metadata?: Record<string, unknown>
}

type FilePart = {
  id: string
  sessionID: string
  messageID: string
  type: 'file'
  mime: string
  filename?: string
  url: string
  source?: FileSource | SymbolSource
}

type ToolPart = {
  id: string
  sessionID: string
  messageID: string
  type: 'tool'
  callID: string
  tool: string
  state: ToolStatePending | ToolStateRunning | ToolStateCompleted | ToolStateError
  metadata?: Record<string, unknown>
}
```

#### Session (会话)

```typescript
type Session = {
  id: string
  projectID: string
  directory: string
  parentID?: string
  summary?: {
    additions: number
    deletions: number
    files: number
    diffs?: FileDiff[]
  }
  share?: { url: string }
  title: string
  version: string
  time: {
    created: number
    updated: number
    compacting?: number
  }
  revert?: {
    messageID: string
    partID?: string
    snapshot?: string
    diff?: string
  }
}
```

#### Config (配置)

```typescript
type Config = {
  $schema?: string
  theme?: string
  keybinds?: KeybindsConfig
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  tui?: { scroll_speed?: number; scroll_acceleration?: { enabled: boolean }; diff_style?: 'auto' | 'stacked' }
  command?: Record<string, { template: string; description?: string; agent?: string; model?: string; subtask?: boolean }>
  watcher?: { ignore?: string[] }
  plugin?: string[]
  snapshot?: boolean
  share?: 'manual' | 'auto' | 'disabled'
  autoupdate?: boolean | 'notify'
  disabled_providers?: string[]
  enabled_providers?: string[]
  model?: string
  small_model?: string
  username?: string
  agent?: Record<string, AgentConfig>
  provider?: Record<string, ProviderConfig>
  mcp?: Record<string, McpLocalConfig | McpRemoteConfig>
  formatter?: false | Record<string, FormatterConfig>
  lsp?: false | Record<string, LspConfig>
  instructions?: string[]
  permission?: PermissionConfig
  tools?: Record<string, boolean>
  enterprise?: { url?: string }
  experimental?: ExperimentalConfig
}
```

#### Event (事件)

```typescript
type Event = 
  | EventServerInstanceDisposed
  | EventInstallationUpdated
  | EventInstallationUpdateAvailable
  | EventLspClientDiagnostics
  | EventLspUpdated
  | EventMessageUpdated
  | EventMessageRemoved
  | EventMessagePartUpdated
  | EventMessagePartRemoved
  | EventPermissionUpdated
  | EventPermissionReplied
  | EventSessionStatus
  | EventSessionIdle
  | EventSessionCompacted
  | EventFileEdited
  | EventTodoUpdated
  | EventCommandExecuted
  | EventSessionCreated
  | EventSessionUpdated
  | EventSessionDeleted
  | EventSessionDiff
  | EventSessionError
  | EventFileWatcherUpdated
  | EventVcsBranchUpdated
  | EventTuiPromptAppend
  | EventTuiCommandExecute
  | EventTuiToastShow
  | EventPtyCreated
  | EventPtyUpdated
  | EventPtyExited
  | EventPtyDeleted
  | EventServerConnected
```

#### Model (模型)

```typescript
type Model = {
  id: string
  providerID: string
  api: { id: string; url: string; npm: string }
  name: string
  capabilities: {
    temperature: boolean
    reasoning: boolean
    attachment: boolean
    toolcall: boolean
    input: { text: boolean; audio: boolean; image: boolean; video: boolean; pdf: boolean }
    output: { text: boolean; audio: boolean; image: boolean; video: boolean; pdf: boolean }
  }
  cost: {
    input: number
    output: number
    cache: { read: number; write: number }
    experimentalOver200K?: { input: number; output: number; cache: { read: number; write: number } }
  }
  limit: { context: number; output: number }
  status: 'alpha' | 'beta' | 'deprecated' | 'active'
  options: Record<string, unknown>
  headers: Record<string, string>
}
```

#### Agent (智能体)

```typescript
type Agent = {
  name: string
  description?: string
  mode: 'subagent' | 'primary' | 'all'
  builtIn: boolean
  topP?: number
  temperature?: number
  color?: string
  permission: {
    edit: 'ask' | 'allow' | 'deny'
    bash: Record<string, 'ask' | 'allow' | 'deny'>
    webfetch?: 'ask' | 'allow' | 'deny'
    doom_loop?: 'ask' | 'allow' | 'deny'
    external_directory?: 'ask' | 'allow' | 'deny'
  }
  model?: { modelID: string; providerID: string }
  prompt?: string
  tools: Record<string, boolean>
  options: Record<string, unknown>
  maxSteps?: number
}
```

---

## 使用示例

### 示例 1: 创建会话并发送消息

```typescript
import { createOpencodeClient } from '@opencode-ai/sdk/client'

async function main() {
  const client = createOpencodeClient({ baseUrl: 'http://localhost:4091' })
  
  // 创建新会话
  const session = await client.session.create({
    body: { title: '我的会话' }
  })
  
  // 发送消息
  const response = await client.session.prompt({
    path: { id: session.data.id },
    body: {
      parts: [{ type: 'text', text: '请帮我写一个 Hello World 程序' }],
      agent: 'build'
    }
  })
  
  console.log(response.data)
}

main()
```

### 示例 2: 订阅事件流

```typescript
import { createOpencodeClient } from '@opencode-ai/sdk/client'

async function main() {
  const client = createOpencodeClient({ baseUrl: 'http://localhost:4091' })
  
  // 订阅全局事件
  const eventStream = await client.global.event()
  
  for await (const event of eventStream) {
    console.log('Event:', event)
    
    if (event.type === 'message.part.updated') {
      console.log('Message part updated:', event.properties.part)
    }
  }
}

main()
```

### 示例 3: 创建插件

```typescript
import { tool, PluginInput, Hooks } from '@opencode-ai/plugin'
import { z } from 'zod'

// 定义自定义工具
const weatherTool = tool({
  description: '获取指定城市的天气信息',
  args: {
    city: z.string().describe('城市名称')
  },
  async execute(args, context) {
    context.metadata({ title: `正在查询 ${args.city} 的天气...` })
    
    // 模拟天气查询
    const weather = { city: args.city, temp: 25, condition: '晴' }
    
    return JSON.stringify(weather)
  }
})

// 导出插件
export default async function weatherPlugin(input: PluginInput): Promise<Hooks> {
  console.log(`Plugin loaded for project: ${input.project.id}`)
  
  return {
    tool: {
      weather: weatherTool
    },
    
    // 添加事件钩子
    event: async ({ event }) => {
      if (event.type === 'message.updated') {
        console.log('Message updated:', event.properties.info.id)
      }
    },
    
    // 添加权限钩子
    'permission.ask': async (input, output) => {
      console.log('Permission requested:', input.type)
      // output.status = 'allow' // 自动允许
    }
  }
}
```

### 示例 4: 使用 Shell

```typescript
import { PluginInput, Hooks } from '@opencode-ai/plugin'

export default async function shellPlugin(input: PluginInput): Promise<Hooks> {
  const { $, client } = input
  
  return {
    'command.execute.before': async (input, output) => {
      // 在命令执行前运行 Shell 命令
      const gitStatus = await $`git status --porcelain`.quiet().text()
      
      if (gitStatus) {
        output.parts.push({
          type: 'text',
          text: `工作区有未提交的更改:\n${gitStatus}`
        })
      }
    }
  }
}
```

### 示例 5: 文件搜索和读取

```typescript
import { createOpencodeClient } from '@opencode-ai/sdk/client'

async function main() {
  const client = createOpencodeClient({ baseUrl: 'http://localhost:4091' })
  
  // 搜索 TypeScript 文件
  const files = await client.find.files({
    query: { query: '*.ts' }
  })
  
  console.log('Found files:', files.data)
  
  // 搜索文本
  const textResults = await client.find.text({
    query: { pattern: 'interface.*\\{' }
  })
  
  console.log('Text matches:', textResults.data)
  
  // 读取文件
  const content = await client.file.read({
    query: { path: 'src/index.ts' }
  })
  
  console.log('File content:', content.data)
}

main()
```

### 示例 6: MCP 服务器集成

```typescript
import { createOpencodeClient } from '@opencode-ai/sdk/client'

async function main() {
  const client = createOpencodeClient({ baseUrl: 'http://localhost:4091' })
  
  // 添加 MCP 服务器
  await client.mcp.add({
    body: {
      name: 'filesystem',
      config: {
        type: 'local',
        command: ['npx', '-y', '@modelcontextprotocol/server-filesystem', '/home/user'],
        enabled: true
      }
    }
  })
  
  // 连接 MCP
  await client.mcp.connect({ path: { name: 'filesystem' } })
  
  // 检查状态
  const status = await client.mcp.status()
  console.log('MCP status:', status.data)
}

main()
```

---

## 版本说明

### V1 vs V2

- **V1**: `@opencode-ai/sdk` - 主要版本，提供完整的客户端和服务端 API
- **V2**: `@opencode-ai/sdk/v2` - 新版本，API 结构相同，内部实现优化

### 导出路径

| 路径 | 说明 |
|------|------|
| `@opencode-ai/sdk` | 完整 SDK |
| `@opencode-ai/sdk/client` | 仅客户端 |
| `@opencode-ai/sdk/server` | 仅服务端 |
| `@opencode-ai/sdk/v2` | V2 完整版 |
| `@opencode-ai/sdk/v2/client` | V2 客户端 |
| `@opencode-ai/sdk/v2/server` | V2 服务端 |
| `@opencode-ai/plugin` | 插件开发 |
| `@opencode-ai/plugin/tool` | 工具定义 |

---

## 常见问题

### Q: 如何获取 API 响应数据?

```typescript
const result = await client.session.list()

// 检查是否成功
if (result.ok) {
  console.log(result.data)  // Session[]
} else {
  console.error(result.error)
}
```

### Q: 如何处理 SSE 事件流?

```typescript
const events = await client.event.subscribe()

// 使用 for await 循环
for await (const event of events) {
  console.log(event)
}
```

### Q: 如何设置认证?

```typescript
// API Key 认证
await client.auth.set({
  path: { id: 'anthropic' },
  body: { type: 'api', key: 'sk-ant-xxx' }
})

// OAuth 认证
const auth = await client.provider.oauth.authorize({
  path: { id: 'github' },
  body: { method: 0 }
})
```

### Q: 如何在插件中访问项目目录?

```typescript
export default async function myPlugin(input: PluginInput) {
  const { directory, worktree, project } = input
  
  console.log('Project directory:', directory)
  console.log('Worktree root:', worktree)
  
  return {}
}
```

---

**文档版本**: 1.0  
**最后更新**: 2025-03