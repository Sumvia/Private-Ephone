// toy-control.js - 玩具控制功能

document.addEventListener('DOMContentLoaded', () => {
  // ===================================================================
  // 1. 全局变量
  // ===================================================================
  let activeToySession = null; // 当前会话 { chatId, characterName, history }
  let toyState = {
    intensity: 0,        // 震动强度 0-100
    mode: 'off',         // 模式: off, pulse, continuous, wave, tease
    temperature: 36.5,   // 模拟温度
    isActive: false      // 是否激活
  };
  let toyMemoryCount = 20; // 上下文记忆条数，默认20条

  // 模式配置
  const TOY_MODES = {
    off: { name: '关闭', description: '设备已关闭，乖乖休息吧~' },
    pulse: { name: '脉冲', description: '适合你上课假装正常时使用' },
    continuous: { name: '持续', description: '稳定输出，考验你的忍耐力' },
    wave: { name: '波浪', description: '忽强忽弱，让你无法预测下一秒' },
    tease: { name: '挑逗', description: '若即若离，欲擒故纵的小把戏' }
  };

  // 强度状态文案
  const INTENSITY_STATUS = {
    0: { level: '休眠', text: '设备处于待机状态，等待主人的指令~', color: '#9e9e9e' },
    20: { level: '轻柔', text: '微微的触感，像羽毛掠过...能忍住吗？', color: '#4caf50' },
    50: { level: '中等', text: '开始有感觉了吧？表情管理好哦~', color: '#ff9800' },
    80: { level: '强烈', text: '呼吸开始急促了？要加油忍住啊~', color: '#f44336' },
    100: { level: '极限', text: '已经到极限了！能撑多久呢？', color: '#9c27b0' }
  };

  // ===================================================================
  // 2. DOM 元素获取
  // ===================================================================
  const toyCharacterSelect = document.getElementById('toy-character-select');
  const toyStartBtn = document.getElementById('toy-start-session-btn');
  const toyIntensityValue = document.getElementById('toy-intensity-value');
  const toyIntensityBar = document.getElementById('toy-intensity-bar');
  const toyModeDisplay = document.getElementById('toy-mode-display');
  const toyModeDescription = document.getElementById('toy-mode-description');
  const toyTemperatureValue = document.getElementById('toy-temperature-value');
  const toyStatusText = document.getElementById('toy-status-text');
  const toyStatusLevel = document.getElementById('toy-status-level');
  const toyChatMessages = document.getElementById('toy-chat-messages');
  const toyChatInput = document.getElementById('toy-chat-input');
  const toySendBtn = document.getElementById('toy-send-btn');
  const toyRequestAiBtn = document.getElementById('toy-request-ai-btn');

  // ===================================================================
  // 3. 工具函数
  // ===================================================================

  // 从 localStorage 恢复上次状态
  function loadSavedToyState() {
    const saved = localStorage.getItem('toy-control-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        toyState = { ...toyState, ...parsed };
        // 恢复记忆条数设置
        if (parsed.memoryCount !== undefined) {
          toyMemoryCount = parsed.memoryCount;
        }
      } catch (e) {
        console.warn('无法解析保存的玩具状态:', e);
      }
    }
  }

  // 保存状态到 localStorage
  function saveToyState() {
    localStorage.setItem('toy-control-state', JSON.stringify({
      intensity: toyState.intensity,
      mode: toyState.mode,
      lastCharacterId: activeToySession?.chatId || null,
      lastCharacterName: activeToySession?.characterName || null,
      memoryCount: toyMemoryCount
    }));
  }

  // 保存聊天历史到数据库
  async function saveToyHistory() {
    if (!activeToySession) return;
    try {
      // 保存到专门的toy control历史表
      const historyKey = `toy-history-${activeToySession.chatId}`;
      await db.globalSettings.put({
        id: historyKey,
        history: activeToySession.history,
        toyState: toyState,
        lastUpdated: Date.now()
      });
    } catch (e) {
      console.warn('保存玩具历史失败:', e);
    }
  }

  // 加载聊天历史
  async function loadToyHistory(chatId) {
    try {
      const historyKey = `toy-history-${chatId}`;
      const saved = await db.globalSettings.get(historyKey);
      if (saved && saved.history) {
        return saved.history;
      }
    } catch (e) {
      console.warn('加载玩具历史失败:', e);
    }
    return [];
  }

  // ===================================================================
  // 记忆总结管理
  // ===================================================================

  // 保存总结到数据库
  async function saveToyMemorySummaries(chatId, summaries) {
    try {
      const summaryKey = `toy-summaries-${chatId}`;
      await db.globalSettings.put({
        id: summaryKey,
        summaries: summaries,
        lastUpdated: Date.now()
      });
    } catch (e) {
      console.warn('保存记忆总结失败:', e);
    }
  }

  // 加载总结
  async function loadToyMemorySummaries(chatId) {
    try {
      const summaryKey = `toy-summaries-${chatId}`;
      const saved = await db.globalSettings.get(summaryKey);
      if (saved && saved.summaries) {
        return saved.summaries;
      }
    } catch (e) {
      console.warn('加载记忆总结失败:', e);
    }
    return [];
  }

  // 获取当前会话的总结（从activeToySession或数据库）
  function getCurrentSummaries() {
    return activeToySession?.summaries || [];
  }

  // 计算模拟温度
  function calculateTemperature(intensity) {
    return (36.5 + intensity * 0.05).toFixed(1);
  }

  // 获取强度对应的状态
  function getIntensityStatus(intensity) {
    if (intensity === 0) return INTENSITY_STATUS[0];
    if (intensity <= 20) return INTENSITY_STATUS[20];
    if (intensity <= 50) return INTENSITY_STATUS[50];
    if (intensity <= 80) return INTENSITY_STATUS[80];
    return INTENSITY_STATUS[100];
  }

  // 更新控制面板显示
  function updateControlPanel() {
    if (!toyIntensityValue) return;

    // 更新强度
    toyIntensityValue.textContent = toyState.intensity;
    if (toyIntensityBar) {
      toyIntensityBar.style.width = `${toyState.intensity}%`;
      const status = getIntensityStatus(toyState.intensity);
      toyIntensityBar.style.backgroundColor = status.color;
    }

    // 更新模式
    const modeInfo = TOY_MODES[toyState.mode] || TOY_MODES.off;
    if (toyModeDisplay) toyModeDisplay.textContent = modeInfo.name;
    if (toyModeDescription) toyModeDescription.textContent = modeInfo.description;

    // 更新温度
    toyState.temperature = calculateTemperature(toyState.intensity);
    if (toyTemperatureValue) toyTemperatureValue.textContent = `${toyState.temperature}°C`;

    // 更新状态文案
    const status = getIntensityStatus(toyState.intensity);
    if (toyStatusLevel) {
      toyStatusLevel.textContent = status.level;
      toyStatusLevel.style.color = status.color;
    }
    if (toyStatusText) toyStatusText.textContent = status.text;

    // 保存状态
    saveToyState();
  }

  // ===================================================================
  // 4. 角色选择与会话管理
  // ===================================================================

  // 渲染角色选择列表
  async function renderCharacterSelect() {
    if (!toyCharacterSelect) return;

    const chats = await db.chats.toArray();
    // 过滤非群聊、有名字的角色聊天
    const characters = chats.filter(c => !c.isGroup && c.id !== 'settings' && c.name);

    toyCharacterSelect.innerHTML = '<option value="">-- 选择角色 --</option>';

    characters.forEach(chat => {
      const option = document.createElement('option');
      option.value = chat.id;
      option.textContent = chat.name; // 角色名存储在 chat.name
      toyCharacterSelect.appendChild(option);
    });

    // 尝试恢复上次选择的角色
    const saved = localStorage.getItem('toy-control-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.lastCharacterId) {
          toyCharacterSelect.value = parsed.lastCharacterId;
        }
      } catch (e) {}
    }
  }

  // 显示玩具控制主屏幕
  async function showToyControlScreen() {
    loadSavedToyState();
    await renderCharacterSelect();
    showScreen('toy-control-screen');
  }

  // 开始会话
  async function startToySession() {
    const selectedId = toyCharacterSelect?.value;
    if (!selectedId) {
      alert('请先选择一个角色！');
      return;
    }

    const chat = await db.chats.get(selectedId);
    if (!chat) {
      alert('角色不存在！');
      return;
    }

    const characterName = chat.name || '角色';
    const characterAvatar = chat.settings?.aiAvatar || ''; // 角色头像

    // 加载历史记录
    const savedHistory = await loadToyHistory(selectedId);

    // 加载记忆总结
    const savedSummaries = await loadToyMemorySummaries(selectedId);

    activeToySession = {
      chatId: selectedId,
      characterName: characterName,
      characterPersona: chat.settings?.aiPersona || '', // 角色人设存储在 aiPersona
      characterAvatar: characterAvatar, // 角色头像
      userAvatar: chat.settings?.myAvatar || '', // 用户头像
      history: savedHistory,
      summaries: savedSummaries // 记忆总结数组
    };

    // 更新标题
    const titleEl = document.getElementById('toy-session-title');
    if (titleEl) titleEl.textContent = characterName;

    // 重置或恢复玩具状态
    loadSavedToyState();
    updateControlPanel();

    // 渲染聊天区域
    renderToyMessages();

    // 显示会话屏幕
    showScreen('toy-session-screen');

    // 如果没有历史记录，添加开场消息
    if (activeToySession.history.length === 0) {
      const savedState = JSON.parse(localStorage.getItem('toy-control-state') || '{}');
      let openingMessage;
      if (savedState.intensity > 0 && savedState.lastCharacterId === selectedId) {
        openingMessage = `*${characterName} 拿起了遥控器* 上次我把你调到了 ${savedState.intensity}，还记得吧？让我们继续~`;
      } else {
        openingMessage = `*${characterName} 拿起了遥控器，嘴角微微上扬* 准备好了吗？控制权现在在我手里了哦~`;
      }

      const openingMsg = {
        role: 'assistant',
        content: openingMessage,
        senderName: characterName,
        timestamp: Date.now()
      };

      activeToySession.history.push(openingMsg);
      appendToyMessage(openingMsg);
      await saveToyHistory();
    }
  }

  // ===================================================================
  // 5. 消息渲染与管理
  // ===================================================================

  // 渲染所有消息
  function renderToyMessages() {
    const messagesContainer = document.getElementById('toy-chat-messages');
    if (!messagesContainer || !activeToySession) return;
    messagesContainer.innerHTML = '';

    activeToySession.history.forEach((msg, index) => {
      appendToyMessage(msg, index);
    });
  }

  // 添加消息到聊天区域
  function appendToyMessage(msg, index) {
    const messagesContainer = document.getElementById('toy-chat-messages');
    if (!messagesContainer) {
      console.warn('[Toy Control] 找不到消息容器');
      return;
    }

    const msgEl = document.createElement('div');
    msgEl.className = `toy-message ${msg.role === 'user' ? 'user' : 'assistant'}`;
    msgEl.dataset.index = index !== undefined ? index : activeToySession.history.length - 1;
    msgEl.dataset.timestamp = msg.timestamp;

    // 创建头像
    const avatarEl = document.createElement('div');
    avatarEl.className = 'toy-message-avatar';
    if (msg.role === 'assistant' && activeToySession?.characterAvatar) {
      avatarEl.style.backgroundImage = `url(${activeToySession.characterAvatar})`;
    } else if (msg.role === 'user') {
      // 用户头像 - 从会话设置获取
      const userAvatar = activeToySession?.userAvatar || '';
      if (userAvatar) {
        avatarEl.style.backgroundImage = `url(${userAvatar})`;
      } else {
        avatarEl.textContent = '我';
      }
    } else {
      avatarEl.textContent = (msg.senderName || activeToySession?.characterName || '角')[0];
    }

    // 创建消息气泡容器
    const bubbleContainer = document.createElement('div');
    bubbleContainer.className = 'toy-message-bubble-container';

    const nameEl = document.createElement('div');
    nameEl.className = 'toy-message-name';
    nameEl.textContent = msg.role === 'user' ? '你' : (msg.senderName || activeToySession?.characterName || '角色');

    const contentEl = document.createElement('div');
    contentEl.className = 'toy-message-content';
    contentEl.textContent = msg.content;

    bubbleContainer.appendChild(nameEl);
    bubbleContainer.appendChild(contentEl);

    // 统一顺序：头像在前，气泡在后（CSS flex-direction: row-reverse 会让 user 消息头像显示在右边）
    msgEl.appendChild(avatarEl);
    msgEl.appendChild(bubbleContainer);

    // 添加长按/右键菜单支持
    msgEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showMessageContextMenu(e, msg, parseInt(msgEl.dataset.index));
    });

    // 长按支持（移动端）
    let longPressTimer;
    msgEl.addEventListener('touchstart', (e) => {
      longPressTimer = setTimeout(() => {
        showMessageContextMenu(e.touches[0], msg, parseInt(msgEl.dataset.index));
      }, 500);
    });
    msgEl.addEventListener('touchend', () => clearTimeout(longPressTimer));
    msgEl.addEventListener('touchmove', () => clearTimeout(longPressTimer));

    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // 当前操作的消息索引
  let activeMessageIndex = null;

  // 显示消息操作模态框
  function showMessageContextMenu(event, msg, index) {
    activeMessageIndex = index;

    const modal = document.getElementById('toy-message-actions-modal');
    const regenerateBtn = document.getElementById('toy-regenerate-btn');

    // 只有AI消息才显示重新生成按钮
    if (regenerateBtn) {
      regenerateBtn.style.display = msg.role === 'assistant' ? 'block' : 'none';
    }

    if (modal) {
      modal.classList.add('visible');
    }
  }

  // 隐藏消息操作模态框
  function hideMessageActions() {
    const modal = document.getElementById('toy-message-actions-modal');
    if (modal) modal.classList.remove('visible');
    activeMessageIndex = null;
  }

  // 显示消息编辑器
  function showMessageEditor() {
    if (activeMessageIndex === null || !activeToySession) return;

    const msg = activeToySession.history[activeMessageIndex];
    if (!msg) return;

    const editorModal = document.getElementById('toy-message-editor-modal');
    const textarea = document.getElementById('toy-message-editor-textarea');

    if (textarea) textarea.value = msg.content;
    if (editorModal) editorModal.classList.add('visible');

    hideMessageActions();
  }

  // 保存编辑的消息
  async function saveEditedMessage() {
    if (activeMessageIndex === null || !activeToySession) return;

    const textarea = document.getElementById('toy-message-editor-textarea');
    const editorModal = document.getElementById('toy-message-editor-modal');

    if (textarea && activeToySession.history[activeMessageIndex]) {
      activeToySession.history[activeMessageIndex].content = textarea.value;
      await saveToyHistory();
      renderToyMessages();
    }

    if (editorModal) editorModal.classList.remove('visible');
    activeMessageIndex = null;
  }

  // 复制消息
  function copyMessage() {
    if (activeMessageIndex === null || !activeToySession) return;
    const msg = activeToySession.history[activeMessageIndex];
    if (msg) {
      navigator.clipboard.writeText(msg.content);
    }
    hideMessageActions();
  }

  // 删除消息
  async function deleteMessage() {
    if (activeMessageIndex === null || !activeToySession) return;
    activeToySession.history.splice(activeMessageIndex, 1);
    await saveToyHistory();
    renderToyMessages();
    hideMessageActions();
  }

  // 删除此条及之后
  async function deleteMessageAfter() {
    if (activeMessageIndex === null || !activeToySession) return;
    activeToySession.history = activeToySession.history.slice(0, activeMessageIndex);
    await saveToyHistory();
    renderToyMessages();
    hideMessageActions();
  }

  // 重新生成
  async function regenerateMessage() {
    if (activeMessageIndex === null || !activeToySession) return;
    activeToySession.history = activeToySession.history.slice(0, activeMessageIndex);
    await saveToyHistory();
    renderToyMessages();
    hideMessageActions();
    await requestAiResponse();
  }

  // ===================================================================
  // 6. 发送消息与AI交互
  // ===================================================================

  // 发送用户消息（不自动触发AI回复）
  async function sendToyMessage() {
    // 动态获取输入框元素
    const inputEl = document.getElementById('toy-chat-input');
    const messagesEl = document.getElementById('toy-chat-messages');

    console.log('[Toy Control] sendToyMessage 调用', { inputEl: !!inputEl, activeToySession: !!activeToySession });

    if (!inputEl) {
      console.warn('[Toy Control] 找不到输入框');
      return;
    }
    if (!activeToySession) {
      console.warn('[Toy Control] 没有活跃会话');
      return;
    }

    const content = inputEl.value.trim();
    if (!content) {
      console.log('[Toy Control] 输入内容为空');
      return;
    }

    // 添加用户消息
    const userMsg = {
      role: 'user',
      content: content,
      timestamp: Date.now()
    };

    activeToySession.history.push(userMsg);
    appendToyMessage(userMsg, activeToySession.history.length - 1);
    inputEl.value = '';

    // 保存历史
    await saveToyHistory();
    console.log('[Toy Control] 消息已发送并保存');
  }

  // 请求AI回复
  async function requestAiResponse() {
    if (!activeToySession) {
      console.warn('[Toy Control] requestAiResponse: 没有活跃会话');
      return;
    }

    const messagesContainer = document.getElementById('toy-chat-messages');
    const requestBtn = document.getElementById('toy-request-ai-btn');

    // 显示加载状态
    const loadingEl = document.createElement('div');
    loadingEl.className = 'toy-message assistant loading';
    loadingEl.innerHTML = '<div class="toy-message-name">' + activeToySession.characterName + '</div><div class="toy-message-content">正在思考...</div>';
    if (messagesContainer) {
      messagesContainer.appendChild(loadingEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 禁用按钮
    if (requestBtn) requestBtn.disabled = true;

    try {
      // 调用AI
      const response = await callToyControlAI();
      loadingEl.remove();

      // 解析响应
      const parsed = parseToyResponse(response);

      // 处理玩具控制指令
      if (parsed.toyControl) {
        if (parsed.toyControl.intensity !== undefined) {
          toyState.intensity = Math.max(0, Math.min(100, parsed.toyControl.intensity));
        }
        if (parsed.toyControl.mode && TOY_MODES[parsed.toyControl.mode]) {
          toyState.mode = parsed.toyControl.mode;
        }
        updateControlPanel();
      }

      // 显示文字消息
      if (parsed.message) {
        const assistantMsg = {
          role: 'assistant',
          content: parsed.message,
          senderName: activeToySession.characterName,
          timestamp: Date.now()
        };
        activeToySession.history.push(assistantMsg);
        appendToyMessage(assistantMsg, activeToySession.history.length - 1);
        await saveToyHistory();
      }

    } catch (error) {
      loadingEl.remove();
      console.error('Toy Control AI 调用失败:', error);

      const errorMsg = {
        role: 'assistant',
        content: `*设备连接出现问题* ${error.message}`,
        senderName: '系统',
        timestamp: Date.now()
      };
      activeToySession.history.push(errorMsg);
      appendToyMessage(errorMsg, activeToySession.history.length - 1);
    } finally {
      if (requestBtn) requestBtn.disabled = false;
    }
  }

  // 调用AI
  async function callToyControlAI() {
    const apiConfig = getApiConfigForFeature('chat', activeToySession.chatId);
    if (!apiConfig.proxyUrl || !apiConfig.apiKey) {
      throw new Error('请先配置API');
    }

    // 检测是否是继续回复（最后一条消息是AI的）
    const historySlice = activeToySession.history.slice(-toyMemoryCount);
    const lastMessage = historySlice[historySlice.length - 1];
    const isContinuation = lastMessage && lastMessage.role === 'assistant';

    const systemPrompt = buildToyControlPrompt(isContinuation);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...historySlice.map(m => ({
        role: m.role,
        content: m.content
      }))
    ];

    const response = await fetch(`${apiConfig.proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.model || 'gpt-4o-mini',
        messages: messages,
        temperature: 0.85,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API错误 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // 构建系统提示词
  function buildToyControlPrompt(isContinuation = false) {
    const modesList = Object.entries(TOY_MODES)
      .map(([key, val]) => `"${key}" (${val.name}: ${val.description})`)
      .join(', ');

    // 构建记忆总结上下文
    let summaryContext = '';
    const summaries = getCurrentSummaries();
    if (summaries.length > 0) {
      summaryContext = `\n# 历史记忆总结（重要！请参考这些信息保持互动连贯性）\n${summaries.map((s, i) => `【记忆${i + 1}】${s.content}`).join('\n')}\n`;
    }

    // 继续回复的提示
    let continuationHint = '';
    if (isContinuation) {
      continuationHint = `
# 【重要】继续回复指示
用户没有发送新消息，而是在等待你继续。请你：
1. 接续你之前说的话，自然地继续互动
2. 可以主动调整玩具参数，观察用户的反应
3. 可以询问用户的感受，或者挑逗、调侃
4. 不要重复之前说过的内容，要有新的发展
5. 发挥创意！可以制造新的情节、惊喜或转折，让互动保持新鲜感
`;
    }

    return `# 你的身份
你是 **${activeToySession.characterName}**，正在通过远程遥控器控制用户身上的可穿戴玩具设备。
${activeToySession.characterPersona ? `人设: ${activeToySession.characterPersona}` : ''}
${summaryContext}

# 当前玩具状态
- 震动强度: ${toyState.intensity}/100
- 当前模式: ${TOY_MODES[toyState.mode]?.name || '关闭'}
- 设备温度: ${toyState.temperature}°C

# 你的能力
你可以通过输出特殊JSON指令来控制玩具：
- 调整强度 (0-100)
- 切换模式: ${modesList}

# 互动指南（必须遵守）
1. 根据对话内容和用户的反应，适时调整玩具参数
2. 可以挑逗、调侃用户，让互动更有趣
3. 描述你操作遥控器的动作，增加代入感
4. 根据场景（用户说在上班/上课等）选择合适的模式和强度
5. 偶尔突然调高或调低，给用户惊喜/惊吓
6. 观察并描述用户可能的反应，增强沉浸感

# 回复长度要求（重要！）
- 你的回复必须足够丰富和详细，不能只有一句话
- message 字段至少要包含：动作描述 + 说的话 + 对用户反应的观察或调侃
- 善用 *动作描述* 格式来增加画面感
- 每次回复建议 50-150 字左右
${continuationHint}

# 输出格式
你的回复必须是JSON格式：
\`\`\`json
{
  "message": "你想说的话和动作描述（要详细丰富）",
  "toy_control": {
    "intensity": 数字0-100（可选，不改变则不写）,
    "mode": "模式名"（可选，不改变则不写）
  }
}
\`\`\`

优秀示例（注意回复的丰富程度）：
{"message": "*手指轻轻拨动遥控器上的旋钮，嘴角勾起一抹玩味的笑* 嗯？刚才是不是抖了一下？让我看看你能忍到什么程度~ *眼睛紧盯着你，不放过任何细微的表情变化* 放心，我会慢慢来的...也许吧。", "toy_control": {"intensity": 35, "mode": "wave"}}
{"message": "*看着你努力维持平静的样子，忍不住轻笑出声* 表情管理得不错嘛，但是你的耳朵红了哦~ *故意凑近你耳边低语* 要不要...再加一点？ *手指悬在遥控器上方，似乎在等待你的反应*"}
{"message": "*突然把强度调到最低，看着你松一口气的样子* 累了吧？休息一下~ *温柔地笑着* 不过别太放松哦，谁知道我什么时候会突然... *话说一半故意停住，留下悬念*", "toy_control": {"intensity": 5, "mode": "tease"}}

直接输出JSON，不要有其他内容：`;
  }

  // 解析AI响应
  function parseToyResponse(responseText) {
    let result = { message: '', toyControl: null };

    try {
      // 清理markdown代码块
      let cleaned = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

      // 尝试提取完整的JSON对象（使用非贪婪匹配找到第一个完整的JSON）
      // 先尝试匹配带有 "message" 字段的JSON结构
      let jsonMatch = null;

      // 方法1: 尝试找到包含 "message" 的JSON
      const messageJsonMatch = cleaned.match(/\{[^{}]*"message"\s*:\s*"[^"]*"[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/);
      if (messageJsonMatch) {
        jsonMatch = messageJsonMatch;
      } else {
        // 方法2: 使用括号平衡来找到第一个完整的JSON对象
        const startIdx = cleaned.indexOf('{');
        if (startIdx !== -1) {
          let depth = 0;
          let endIdx = -1;
          for (let i = startIdx; i < cleaned.length; i++) {
            if (cleaned[i] === '{') depth++;
            else if (cleaned[i] === '}') {
              depth--;
              if (depth === 0) {
                endIdx = i;
                break;
              }
            }
          }
          if (endIdx !== -1) {
            jsonMatch = [cleaned.substring(startIdx, endIdx + 1)];
          }
        }
      }

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result.message = parsed.message || '';
        if (parsed.toy_control) {
          result.toyControl = {
            intensity: parsed.toy_control.intensity,
            mode: parsed.toy_control.mode
          };
        }
      } else {
        // 如果没有JSON，直接作为消息
        result.message = cleaned;
      }
    } catch (e) {
      console.warn('解析玩具控制响应失败:', e);
      // 尝试从原始文本中提取可读内容（去掉JSON残留）
      let fallbackMsg = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .replace(/"message"\s*:\s*"/gi, '')
        .replace(/",?\s*"toy_control"\s*:\s*\{[\s\S]*?\}/gi, '')
        .replace(/[{}"]/g, '')
        .replace(/^\s*,?\s*/, '')
        .trim();
      result.message = fallbackMsg || responseText;
    }

    return result;
  }

  // ===================================================================
  // 7. 聊天记录管理
  // ===================================================================

  // 清空聊天记录
  async function clearToyHistory() {
    if (!activeToySession) return;
    if (!confirm('确定要清空所有聊天记录吗？')) return;

    activeToySession.history = [];
    renderToyMessages();
    await saveToyHistory();
  }

  // 生成记忆总结
  async function generateMemorySummary() {
    if (!activeToySession || activeToySession.history.length < 5) {
      alert('聊天记录太少，无法生成总结（至少需要5条消息）');
      return;
    }

    const apiConfig = getApiConfigForFeature('chat', activeToySession.chatId);
    if (!apiConfig.proxyUrl || !apiConfig.apiKey) {
      alert('请先配置API');
      return;
    }

    const messagesContainer = document.getElementById('toy-chat-messages');
    const loadingEl = document.createElement('div');
    loadingEl.className = 'toy-message assistant loading';
    loadingEl.innerHTML = '<div class="toy-message-name">系统</div><div class="toy-message-content">正在生成记忆总结...</div>';
    if (messagesContainer) {
      messagesContainer.appendChild(loadingEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    try {
      const historyText = activeToySession.history
        .map(m => {
          const time = new Date(m.timestamp).toLocaleString('zh-CN', { hour12: false });
          return `[${time}] ${m.role === 'user' ? '用户' : activeToySession.characterName}: ${m.content}`;
        })
        .join('\n');

      const response = await fetch(`${apiConfig.proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.model || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `请总结以下Toy Control玩具控制互动的要点，包括：
1) 玩具控制的变化（强度、模式的调整）
2) 用户的反应和状态
3) 角色的态度和互动风格
4) 关键事件或有趣的时刻

用简洁的语言概括，不超过200字。保留关键的时间线索。`
            },
            { role: 'user', content: historyText }
          ],
          temperature: 0.5,
          max_tokens: 400
        })
      });

      loadingEl.remove();

      if (!response.ok) {
        throw new Error('API调用失败');
      }

      const data = await response.json();
      const summaryContent = data.choices?.[0]?.message?.content || '无法生成总结';

      // 创建新的总结对象
      const newSummary = {
        id: Date.now(),
        content: summaryContent,
        timestamp: Date.now(),
        messageCount: activeToySession.history.length
      };

      // 添加到总结数组
      if (!activeToySession.summaries) {
        activeToySession.summaries = [];
      }
      activeToySession.summaries.push(newSummary);

      // 保存到数据库
      await saveToyMemorySummaries(activeToySession.chatId, activeToySession.summaries);

      // 显示成功提示
      alert('记忆总结已生成并保存！\n\n' + summaryContent);

      // 如果总结管理器打开着，刷新显示
      const summaryModal = document.getElementById('toy-summary-manager-modal');
      if (summaryModal && summaryModal.classList.contains('visible')) {
        renderToySummaryList();
      }

    } catch (error) {
      loadingEl.remove();
      alert('生成总结失败: ' + error.message);
    }
  }

  // 打开总结管理器
  function openToySummaryManager() {
    const modal = document.getElementById('toy-summary-manager-modal');
    if (modal) {
      renderToySummaryList();
      modal.classList.add('visible');
    }
  }

  // 关闭总结管理器
  function closeToySummaryManager() {
    const modal = document.getElementById('toy-summary-manager-modal');
    if (modal) {
      modal.classList.remove('visible');
    }
  }

  // 渲染总结列表
  function renderToySummaryList() {
    const listContainer = document.getElementById('toy-summary-list');
    if (!listContainer) return;

    const summaries = getCurrentSummaries();

    if (summaries.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
          <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
          <div>还没有记忆总结</div>
          <div style="font-size: 12px; margin-top: 8px;">点击下方按钮生成第一个总结吧~</div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = summaries.map((summary, index) => {
      const time = new Date(summary.timestamp).toLocaleString('zh-CN', { hour12: false });
      return `
        <div class="toy-summary-card" data-id="${summary.id}">
          <div class="toy-summary-content">${escapeHtml(summary.content)}</div>
          <div class="toy-summary-meta">
            <span>📅 ${time}</span>
            <span>💬 基于${summary.messageCount || '?'}条消息</span>
          </div>
          <div class="toy-summary-actions">
            <button class="toy-summary-edit-btn" data-id="${summary.id}" title="编辑">✏️</button>
            <button class="toy-summary-delete-btn" data-id="${summary.id}" title="删除">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // 编辑总结
  async function editToySummary(summaryId) {
    const summaries = getCurrentSummaries();
    const summary = summaries.find(s => s.id === summaryId);
    if (!summary) return;

    const newContent = prompt('编辑记忆总结：', summary.content);
    if (newContent === null || newContent.trim() === '') return;

    summary.content = newContent.trim();
    await saveToyMemorySummaries(activeToySession.chatId, summaries);
    renderToySummaryList();
  }

  // 删除总结
  async function deleteToySummary(summaryId) {
    if (!confirm('确定要删除这条记忆总结吗？')) return;

    const summaries = getCurrentSummaries();
    const index = summaries.findIndex(s => s.id === summaryId);
    if (index === -1) return;

    summaries.splice(index, 1);
    activeToySession.summaries = summaries;
    await saveToyMemorySummaries(activeToySession.chatId, summaries);
    renderToySummaryList();
  }

  // 清空所有总结
  async function clearAllToySummaries() {
    if (!confirm('确定要清空所有记忆总结吗？此操作不可恢复！')) return;

    activeToySession.summaries = [];
    await saveToyMemorySummaries(activeToySession.chatId, []);
    renderToySummaryList();
  }

  // HTML转义辅助函数
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 结束会话
  async function endToySession() {
    if (!confirm('确定要结束本次会话吗？聊天记录会保存。')) return;

    await saveToyHistory();
    saveToyState();
    activeToySession = null;
    showScreen('home-screen');
  }

  // ===================================================================
  // 8. 事件绑定
  // ===================================================================

  // 应用图标点击
  const toyAppIcon = document.getElementById('toy-control-app-icon');
  if (toyAppIcon) {
    toyAppIcon.addEventListener('click', showToyControlScreen);
  }

  // 开始会话按钮
  if (toyStartBtn) {
    toyStartBtn.addEventListener('click', startToySession);
  }

  // 发送消息按钮 - 重新获取元素以确保存在
  const sendBtn = document.getElementById('toy-send-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      console.log('[Toy Control] 发送按钮点击');
      sendToyMessage();
    });
  } else {
    console.warn('[Toy Control] 未找到发送按钮 #toy-send-btn');
  }

  // 请求AI回复按钮
  const requestBtn = document.getElementById('toy-request-ai-btn');
  if (requestBtn) {
    requestBtn.addEventListener('click', () => {
      console.log('[Toy Control] 请求AI按钮点击');
      requestAiResponse();
    });
  } else {
    console.warn('[Toy Control] 未找到请求AI按钮 #toy-request-ai-btn');
  }

  // 输入框回车发送
  const chatInput = document.getElementById('toy-chat-input');
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        console.log('[Toy Control] 回车发送');
        sendToyMessage();
      }
    });
  } else {
    console.warn('[Toy Control] 未找到输入框 #toy-chat-input');
  }

  // 返回主界面按钮
  const toyBackBtn = document.getElementById('toy-back-btn');
  if (toyBackBtn) {
    toyBackBtn.addEventListener('click', async () => {
      if (activeToySession) {
        await saveToyHistory();
      }
      showScreen('toy-control-screen');
    });
  }

  // 结束会话按钮
  const toyEndSessionBtn = document.getElementById('toy-end-session-btn');
  if (toyEndSessionBtn) {
    toyEndSessionBtn.addEventListener('click', endToySession);
  }

  // 返回主屏幕按钮
  const backFromToyBtn = document.getElementById('back-from-toy-control');
  if (backFromToyBtn) {
    backFromToyBtn.addEventListener('click', () => {
      showScreen('home-screen');
    });
  }

  // 清空记录按钮
  const toyClearHistoryBtn = document.getElementById('toy-clear-history-btn');
  if (toyClearHistoryBtn) {
    toyClearHistoryBtn.addEventListener('click', clearToyHistory);
  }

  // 记忆总结按钮
  const toySummaryBtn = document.getElementById('toy-summary-btn');
  if (toySummaryBtn) {
    toySummaryBtn.addEventListener('click', generateMemorySummary);
  }

  // 设置按钮 - 打开设置模态框
  const toySettingsBtn = document.getElementById('toy-settings-btn');
  const toySettingsModal = document.getElementById('toy-settings-modal');
  const toySettingsCloseBtn = document.getElementById('toy-settings-close-btn');
  const toyMemorySlider = document.getElementById('toy-memory-slider');
  const toyMemoryValue = document.getElementById('toy-memory-value');

  console.log('[Toy Control] 设置按钮元素:', {
    settingsBtn: !!toySettingsBtn,
    settingsModal: !!toySettingsModal,
    closeBtn: !!toySettingsCloseBtn
  });

  if (toySettingsBtn && toySettingsModal) {
    toySettingsBtn.addEventListener('click', () => {
      console.log('[Toy Control] 设置按钮点击');
      // 打开模态框前，同步当前设置到UI
      if (toyMemorySlider) {
        toyMemorySlider.value = toyMemoryCount;
      }
      if (toyMemoryValue) {
        toyMemoryValue.textContent = toyMemoryCount;
      }
      toySettingsModal.classList.add('visible'); // 使用 visible 类显示模态框
    });
  }

  // 关闭设置模态框
  if (toySettingsCloseBtn && toySettingsModal) {
    toySettingsCloseBtn.addEventListener('click', () => {
      toySettingsModal.classList.remove('visible');
      // 保存设置
      saveToyState();
    });
  }

  // 点击模态框外部关闭
  if (toySettingsModal) {
    toySettingsModal.addEventListener('click', (e) => {
      if (e.target === toySettingsModal) {
        toySettingsModal.classList.remove('visible');
        saveToyState();
      }
    });
  }

  // 记忆条数滑块
  if (toyMemorySlider) {
    toyMemorySlider.addEventListener('input', (e) => {
      toyMemoryCount = parseInt(e.target.value) || 20;
      if (toyMemoryValue) {
        toyMemoryValue.textContent = toyMemoryCount;
      }
    });
  }

  // ===================================================================
  // 消息操作模态框事件
  // ===================================================================
  const toyEditBtn = document.getElementById('toy-edit-message-btn');
  const toyCopyBtn = document.getElementById('toy-copy-message-btn');
  const toyDeleteBtn = document.getElementById('toy-delete-message-btn');
  const toyDeleteAfterBtn = document.getElementById('toy-delete-after-btn');
  const toyRegenerateBtn = document.getElementById('toy-regenerate-btn');
  const toyCancelActionBtn = document.getElementById('toy-cancel-action-btn');
  const toyMessageActionsModal = document.getElementById('toy-message-actions-modal');

  if (toyEditBtn) toyEditBtn.addEventListener('click', showMessageEditor);
  if (toyCopyBtn) toyCopyBtn.addEventListener('click', copyMessage);
  if (toyDeleteBtn) toyDeleteBtn.addEventListener('click', deleteMessage);
  if (toyDeleteAfterBtn) toyDeleteAfterBtn.addEventListener('click', deleteMessageAfter);
  if (toyRegenerateBtn) toyRegenerateBtn.addEventListener('click', regenerateMessage);
  if (toyCancelActionBtn) toyCancelActionBtn.addEventListener('click', hideMessageActions);

  // 点击模态框外部关闭
  if (toyMessageActionsModal) {
    toyMessageActionsModal.addEventListener('click', (e) => {
      if (e.target === toyMessageActionsModal) {
        hideMessageActions();
      }
    });
  }

  // 消息编辑器事件
  const toyEditorSaveBtn = document.getElementById('toy-editor-save-btn');
  const toyEditorCancelBtn = document.getElementById('toy-editor-cancel-btn');
  const toyEditorModal = document.getElementById('toy-message-editor-modal');

  if (toyEditorSaveBtn) toyEditorSaveBtn.addEventListener('click', saveEditedMessage);
  if (toyEditorCancelBtn) {
    toyEditorCancelBtn.addEventListener('click', () => {
      if (toyEditorModal) toyEditorModal.classList.remove('visible');
      activeMessageIndex = null;
    });
  }
  if (toyEditorModal) {
    toyEditorModal.addEventListener('click', (e) => {
      if (e.target === toyEditorModal) {
        toyEditorModal.classList.remove('visible');
        activeMessageIndex = null;
      }
    });
  }

  // ===================================================================
  // 记忆总结管理器事件
  // ===================================================================
  const toySummaryManagerBtn = document.getElementById('toy-view-summaries-btn');
  const toySummaryManagerModal = document.getElementById('toy-summary-manager-modal');
  const toySummaryCloseBtn = document.getElementById('toy-summary-close-btn');
  const toySummaryGenerateBtn = document.getElementById('toy-summary-generate-btn');
  const toySummaryClearAllBtn = document.getElementById('toy-summary-clear-all-btn');
  const toySummaryList = document.getElementById('toy-summary-list');

  // 打开总结管理器
  if (toySummaryManagerBtn) {
    toySummaryManagerBtn.addEventListener('click', openToySummaryManager);
  }

  // 关闭总结管理器
  if (toySummaryCloseBtn) {
    toySummaryCloseBtn.addEventListener('click', closeToySummaryManager);
  }

  // 点击模态框外部关闭
  if (toySummaryManagerModal) {
    toySummaryManagerModal.addEventListener('click', (e) => {
      if (e.target === toySummaryManagerModal) {
        closeToySummaryManager();
      }
    });
  }

  // 生成新总结
  if (toySummaryGenerateBtn) {
    toySummaryGenerateBtn.addEventListener('click', generateMemorySummary);
  }

  // 清空所有总结
  if (toySummaryClearAllBtn) {
    toySummaryClearAllBtn.addEventListener('click', clearAllToySummaries);
  }

  // 总结列表事件委托（编辑、删除按钮）
  if (toySummaryList) {
    toySummaryList.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.toy-summary-edit-btn');
      if (editBtn) {
        const summaryId = parseInt(editBtn.dataset.id);
        editToySummary(summaryId);
        return;
      }

      const deleteBtn = e.target.closest('.toy-summary-delete-btn');
      if (deleteBtn) {
        const summaryId = parseInt(deleteBtn.dataset.id);
        deleteToySummary(summaryId);
        return;
      }
    });
  }

  // ===================================================================
  // 9. 暴露全局函数
  // ===================================================================
  window.showToyControlScreen = showToyControlScreen;
  window.updateToyState = (newState) => {
    toyState = { ...toyState, ...newState };
    updateControlPanel();
  };

  // 初始化
  loadSavedToyState();
  console.log('[Toy Control] 模块初始化完成');
});
