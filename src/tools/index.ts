/**
 * 工具导出
 */

// =====================
// QQ 消息工具 (参考 qq-message-napcat skill)
// =====================

// 消息相关
export { qqSendMessageTool } from './send_message';

// 好友相关
export { qqGetFriendsTool } from './get_friends';
export { qqSearchFriendTool } from './search_friend';

// 群聊相关
export { qqGetGroupHistoryTool } from './get_group_history';

// 文件相关
export { qqSendFileTool } from './send_file';
export { qqGetFileTool } from './get_file';

// 账号相关
export { qqGetLoginInfoTool } from './get_login_info';

// 互动相关
export { qqSendPokeTool } from './send_poke';

// =====================
// 控制工具 (参考 axeuh-control skill)
// =====================

// 用户会话管理
export { 
  userSessionListTool,
  userSessionCreateTool,
  userSessionSwitchTool,
  userSessionDeleteTool,
  sessionTitleSetTool,
  setUserSessionCreateClient,
  setSessionTitleSetClient,
} from './control';

// 任务管理
export { 
  taskListTool,
  taskCreateTool,
  taskDeleteTool,
} from './control';

// 智能体管理
export {
  agentListTool,
  agentGetTool,
  agentSetTool,
} from './control';

// 模型管理
export {
  modelListTool,
  modelGetTool,
  modelSetTool,
} from './control';

// 系统管理
export {
  systemHealthTool,
  systemReloadTool,
} from './control';