# Toy Control 开发日志

> 最后更新: 2026-02-02

## 项目概述

**Toy Control (玩具控制)** 是 Ephone 应用的一个独立功能模块，允许用户选择一个已创建的角色来进行远程玩具控制的角色扮演互动。

### 核心功能
- AI 角色控制虚拟可穿戴设备
- 实时显示震动强度 (0-100)、模式、温度
- 聊天互动，AI 通过 JSON 指令控制设备参数
- 记忆持久化 (IndexedDB + localStorage)

---

## 文件结构

```
D:\AIs\k\Ephone14\Ephone\
├── index.html          # 主 HTML，包含 Toy Control 的屏幕和样式
├── toy-control.js      # Toy Control 独立 JS 模块
├── style.css           # 主样式文件
└── DEV_LOG_TOY_CONTROL.md  # 本开发日志
```

---

## 关键代码位置

### HTML (index.html)

| 内容 | 行号范围 (约) | 说明 |
|------|--------------|------|
| 桌面图标 | 搜索 `toy-control-app-icon` | 主屏幕的应用图标 |
| 角色选择屏幕 | `#toy-control-screen` | 选择角色开始会话 |
| 会话屏幕 | `#toy-session-screen` | 控制面板 + 聊天区域 |
| 设置模态框 | `#toy-settings-modal` | 记忆条数设置 |
| 消息操作模态框 | `#toy-message-actions-modal` | 编辑/删除/复制等 |
| 消息编辑器 | `#toy-message-editor-modal` | 编辑消息内容 |
| CSS 样式 | 搜索 `<!-- Toy Control CSS -->` | 所有 Toy Control 样式 |

### JS (toy-control.js)

| 函数/变量 | 行号 (约) | 说明 |
|----------|----------|------|
| `toyState` | 8-13 | 设备状态 (intensity, mode, temperature) |
| `toyMemoryCount` | 14 | 上下文记忆条数 |
| `TOY_MODES` | 16-22 | 可用模式定义 |
| `renderCharacterSelect()` | 166 | 渲染角色下拉列表 |
| `startToySession()` | 201 | 开始会话，加载历史 |
| `appendToyMessage()` | 281 | 渲染单条消息 (含头像) |
| `showMessageContextMenu()` | 328 | 显示消息操作模态框 |
| `sendToyMessage()` | 390 | 发送用户消息 (不触发AI) |
| `requestAiResponse()` | 433 | 请求 AI 回复 |
| `callToyControlAI()` | 504 | 调用 AI API |
| `buildToyControlPrompt()` | 543 | 构建系统提示词 |
| `parseToyResponse()` | 589 | 解析 AI 响应中的 toy_control |
| `saveToyHistory()` | 78 | 保存历史到 IndexedDB |
| `loadToyHistory()` | 95 | 加载历史 |

---

## 已完成功能

### 核心功能
- [x] 角色选择 (从私聊角色列表读取)
- [x] 会话管理 (开始/结束/保存)
- [x] 聊天消息发送
- [x] AI 回复请求 (手动触发)
- [x] 玩具控制指令解析 (intensity, mode)
- [x] 控制面板实时更新

### UI/UX
- [x] 上下分框布局 (控制面板 + 聊天)
- [x] 角色头像显示
- [x] 用户头像显示
- [x] 深色模式支持
- [x] 消息长按/右键菜单

### 消息管理
- [x] 编辑消息
- [x] 复制消息
- [x] 删除单条消息
- [x] 删除此条及之后
- [x] 重新生成 (AI消息)

### 设置
- [x] 记忆条数滑块 (5-50)
- [x] 设置持久化 (localStorage)

### 记忆总结管理
- [x] 生成记忆总结 (调用 API)
- [x] 总结管理界面 (查看列表)
- [x] 编辑总结
- [x] 删除单条总结
- [x] 清空所有总结
- [x] 总结作为长期记忆注入 AI 上下文

---

## 数据存储

### localStorage
```javascript
// key: 'toy-control-state'
{
  intensity: number,      // 当前强度
  mode: string,           // 当前模式
  lastCharacterId: string,// 上次选择的角色
  lastCharacterName: string,
  memoryCount: number     // 记忆条数
}
```

### IndexedDB (通过 db.globalSettings)
```javascript
// key: 'toy-history-{chatId}' - 聊天历史
{
  id: 'toy-history-{chatId}',
  history: Array<Message>,
  toyState: object,
  lastUpdated: number
}

// key: 'toy-summaries-{chatId}' - 记忆总结
{
  id: 'toy-summaries-{chatId}',
  summaries: Array<Summary>,
  lastUpdated: number
}
```

### Message 结构
```javascript
{
  role: 'user' | 'assistant',
  content: string,
  senderName: string,     // AI消息的角色名
  timestamp: number
}
```

### Summary 结构
```javascript
{
  id: number,             // 时间戳作为唯一ID
  content: string,        // 总结内容
  timestamp: number,      // 创建时间
  messageCount: number    // 基于多少条消息生成
}
```

---

## AI 提示词格式

### 系统提示词 (buildToyControlPrompt)
- 告知 AI 它是哪个角色
- 包含角色人设 (aiPersona)
- **历史记忆总结** (如有) - 作为长期记忆保持连贯性
- 当前设备状态
- 可用模式列表
- 输出格式要求 (JSON)

### AI 响应格式
```json
{
  "message": "角色说的话和动作描述",
  "toy_control": {
    "intensity": 0-100,
    "mode": "off|pulse|continuous|wave|tease"
  }
}
```

---

## 已知问题 / 待测试

1. **消息操作模态框** - 需要测试长按是否正常弹出
2. ~~**头像显示** - 需要确认用户头像 `window.state?.settings?.myAvatar` 是否可用~~ ✅ 已修复 (2026-02-03)
3. **深色模式** - 需要测试主题切换后 Toy Control 是否正确响应
4. **API 配置** - 使用 `getApiConfigForFeature('chat', chatId)` 获取，需确认兼容性
5. **Gemini 兼容性** - 需测试新的 JSON 解析逻辑是否能正确处理各种格式

---

## 下次开发建议

### 优先修复
1. 测试完整流程：选择角色 → 开始会话 → 发送消息 → 请求AI → 查看控制面板更新
2. 测试消息操作：长按消息 → 弹出菜单 → 各功能正常
3. 测试设置：点击齿轮 → 调整滑块 → 关闭 → 重新打开确认保存

### 功能增强建议
1. **实时设备模拟** - 添加震动动画效果
2. **场景预设** - 快速切换预设场景 (上班、上课等)
3. **历史会话列表** - 查看与不同角色的历史
4. **导出聊天记录** - 导出为文本/图片
5. **自定义模式** - 允许用户添加自定义震动模式

### 代码优化
1. 移除调试 `console.log` 语句 (正式发布前)
2. 考虑将 toy-control.js 中的硬编码文本提取为配置

---

## 修改历史

### 2026-02-03
- **修复用户头像位置问题**: 用户消息头像原本错误显示在左边，现已修复为右边
  - 原因: DOM元素顺序与CSS `flex-direction: row-reverse` 配合不当
  - 修改: `appendToyMessage()` 中统一使用 `avatarEl` 在前、`bubbleContainer` 在后的顺序
- **修复用户头像不显示问题**: 用户头像未正确从聊天设置中获取
  - 原因: 使用 `window.state?.settings?.myAvatar` 但该路径不存在
  - 修改: 在 `activeToySession` 中新增 `userAvatar` 字段，从 `chat.settings.myAvatar` 获取
- **增强 Gemini 响应解析**: 解决 Gemini 返回格式异常导致显示原始 JSON 的问题
  - 新增括号平衡算法精确提取第一个完整 JSON 对象
  - 新增 fallback 逻辑，解析失败时清理 JSON 残留内容
- **新增记忆总结管理功能**: 完整的长期记忆管理系统
  - 数据存储: IndexedDB 独立存储 `toy-summaries-{chatId}`
  - 总结生成: 调用 API 生成对话总结，包含时间线索
  - 管理界面: 查看、编辑、删除总结的完整 UI
  - AI 引用: 总结作为长期记忆自动注入系统提示词
  - 相关函数: `saveToyMemorySummaries()`, `loadToyMemorySummaries()`, `openToySummaryManager()`, `editToySummary()`, `deleteToySummary()`, `clearAllToySummaries()`
  - HTML: 新增 `#toy-summary-manager-modal` 模态框和 `#toy-view-summaries-btn` 按钮
  - CSS: 新增 `.toy-summary-card` 等样式
- **优化 AI 回复质量**: 解决回复过短和无法接续的问题
  - 增强系统提示词，明确要求回复长度 50-150 字
  - 添加详细示例展示期望的回复风格（动作描述 + 对话 + 观察）
  - 新增继续回复检测机制（检测最后一条是否为 AI 消息）
  - `buildToyControlPrompt(isContinuation)` 新增参数，继续回复时注入特殊指示
  - 提高 `max_tokens` 从 1000 到 1500，`temperature` 从 0.8 到 0.85

### 2026-02-02
- 创建 Toy Control 功能模块
- 实现基础聊天和控制面板
- 添加记忆条数控制
- 添加消息操作功能 (编辑/删除/复制/重新生成)
- 添加头像显示
- 添加深色模式支持
- 修复角色选择 (使用 `chat.name` 而非 `settings.characterName`)
- 修复模态框显示 (使用 `.visible` 类)
- 删除多余的"结束"按钮
- 调换发送/请求按钮位置

---

## 相关依赖

- **Dexie.js** - IndexedDB 封装
- **全局函数**: `showScreen()`, `getApiConfigForFeature()`, `db`
- **全局状态**: `window.state` (用户设置、头像等)

---

## 快速调试

在浏览器控制台执行：
```javascript
// 查看当前会话状态
console.log('Toy Session:', window.activeToySession);

// 手动更新设备状态
window.updateToyState({ intensity: 50, mode: 'wave' });

// 打开 Toy Control 屏幕
window.showToyControlScreen();
```
