<template>
  <div class="agent-page">
    <div class="agent-workspace">
      <button class="mobile-history-trigger" type="button" @click="drawerVisible = true">
        <span><ChatSquare /></span>
        <span>历史会话</span>
      </button>

      <!-- 历史对话内嵌侧栏 -->
      <ConversationDrawer
        :visible="drawerVisible"
        :conversations="conversations"
        :active-id="activeId"
        :disabled="streaming"
        :username="username"
        :avatar="avatar"
        @close="drawerVisible = false"
        @open="drawerVisible = true"
        @new="newChat"
        @select="selectConversation"
        @remove="remove"
      />

      <!-- 主体聊天流区域 -->
      <div class="chat-main">
      <div ref="scrollRef" class="chat-stream">
        <!-- 空状态欢迎页 -->
        <div v-if="messages.length === 0" class="welcome-screen">
          <h1 class="welcome-title">今天想分析什么？</h1>
          <p class="welcome-subtitle">
            可以提问业务问题、分析经营数据，或直接生成可视化图表。
          </p>
          
          <div class="suggestion-grid">
            <div 
              v-for="tip in tips" 
              :key="tip" 
              class="suggestion-card" 
              @click="applySuggestion(tip)"
            >
              <span class="card-text">{{ tip }}</span>
              <span class="card-arrow">→</span>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-else class="message-list">
          <ChatMessage
            v-for="message in messages"
            :key="message.localId || message.id"
            :message="message"
          />
        </div>
      </div>

      <!-- 输入栏 -->
      <ChatComposer
        ref="composerRef"
        v-model="draft"
        :streaming="streaming"
        @send="send"
        @stop="stop"
      />
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, nextTick } from 'vue'
import { MessageOutlined as ChatSquare } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { useUserStore } from '@/stores/user'
import { listConversations, listMessages, deleteConversation, streamChat, stopChat } from '@/api/agent/chat'
import ConversationDrawer from './components/ConversationDrawer.vue'
import ChatMessage from './components/ChatMessage.vue'
import ChatComposer from './components/ChatComposer.vue'

const userStore = useUserStore()
const username = computed(() => userStore.nickName || userStore.name || 'User')
const avatar = computed(() => userStore.avatar || '')

const conversations = ref([])
const messages = ref([])
const activeId = ref(undefined)
const draft = ref('')
const streaming = ref(false)
const drawerVisible = ref(false)
const scrollRef = ref(null)
const composerRef = ref(null)

const tips = [
  '帮我总结一下本月经营情况', 
  '分析销售趋势并生成图表', 
  '我想了解一个业务问题'
]

// 滚动到聊天窗口最底部
function scrollBottom() {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  })
}

// 快速应用建议问题
function applySuggestion(tip) {
  draft.value = tip
  nextTick(() => {
    if (composerRef.value) {
      composerRef.value.focusInput()
    }
  })
}

// 加载历史会话列表
async function loadConversations() {
  try {
    const res = await listConversations()
    conversations.value = res.data || []
  } catch (error) {
    message.error('加载历史会话失败: ' + (error.msg || error.message))
  }
}

// 切换对话会话
async function selectConversation(item) {
  if (streaming.value) return
  activeId.value = item.id
  drawerVisible.value = false
  messages.value = []
  
  try {
    const res = await listMessages(item.id)
    messages.value = (res.data || []).map(m => ({
      ...m,
      artifacts: parseArtifacts(m.metadata),
      stopped: m.status === 'stopped'
    }))
    scrollBottom()
  } catch (error) {
    message.error('加载历史消息失败: ' + (error.msg || error.message))
  }
}

// 解析元数据中的结构化产物 (图表/表格)
function parseArtifacts(metadata) {
  try {
    return JSON.parse(metadata || '{}').artifacts || []
  } catch {
    return []
  }
}

// 开启一个新对话
function newChat() {
  if (streaming.value) return
  activeId.value = undefined
  messages.value = []
  drawerVisible.value = false
  draft.value = ''
  nextTick(() => {
    if (composerRef.value) {
      composerRef.value.focusInput()
    }
  })
}

// 删除历史会话
async function remove(item) {
  try {
    await new Promise((resolve, reject) => {
      Modal.confirm({
        title: '删除对话',
        content: `确定删除对话"${item.title}"吗？此操作不可逆。`,
        okText: '删除',
        cancelText: '取消',
        okType: 'danger',
        onOk() { resolve() },
        onCancel() { reject('cancel') }
      })
    })
    
    await deleteConversation(item.id)
    message.success('对话已删除')
    
    if (activeId.value === item.id) {
      newChat()
    }
    await loadConversations()
  } catch (e) {
    if (e !== 'cancel') {
      message.error('删除会话失败: ' + (e.msg || e.message))
    }
  }
}

// 发送消息核心逻辑
async function send() {
  const query = draft.value.trim()
  if (!query || streaming.value) return
  
  // 1. 推入用户发送的消息
  messages.value.push({
    localId: crypto.randomUUID(),
    role: 'user',
    content: query
  })
  
  // 2. 创建一个临时的 AI 回答占位符并设为流式响应状态
  const assistantMsg = reactive({
    localId: crypto.randomUUID(),
    role: 'assistant',
    content: '',
    process: [],
    artifacts: [],
    streaming: true,
    stopped: false
  })
  
  messages.value.push(assistantMsg)
  draft.value = ''
  streaming.value = true
  scrollBottom()
  
  try {
    await streamChat(
      {
        conversationId: activeId.value,
        query,
        inputs: {}
      },
      (event, data) => {
        if (event === 'conversation') {
          activeId.value = data.conversationId
          loadConversations()
        } else if (event === 'message') {
          assistantMsg.content += data.content || ''
        } else if (event === 'message_replace') {
          assistantMsg.content = data.content || ''
        } else if (event === 'node' || event === 'workflow') {
          // 推入工作流步骤数据
          assistantMsg.process.push(data)
        } else if (event === 'artifact') {
          // 推入表格/图表结构化产物
          assistantMsg.artifacts.push(data)
          assistantMsg.process.push({
            event: 'artifact_ready',
            artifactType: data.type,
            title: data.title
          })
        } else if (event === 'error') {
          assistantMsg.error = data.message
        } else if (event === 'done') {
          assistantMsg.streaming = false
        }
        scrollBottom()
      }
    )
  } catch (error) {
    assistantMsg.error = error.message
    message.error(error.message || '发送消息失败')
  } finally {
    assistantMsg.streaming = false
    streaming.value = false
    await loadConversations()
    scrollBottom()
  }
}

// 中断当前的流式输出
async function stop() {
  if (!activeId.value) return
  try {
    await stopChat(activeId.value)
    const assistant = [...messages.value].reverse().find(message =>
      message.role === 'assistant' && message.streaming
    )
    if (assistant) {
      assistant.stopped = true
      assistant.streaming = false
    }
    message.info('已请求停止生成')
  } catch (e) {
    message.error(e.msg || '停止生成失败')
  }
}

onMounted(() => {
  loadConversations()
})
</script>

<style scoped lang="scss">
.agent-page {
  margin: 0 !important;
  height: calc(100vh - 84px);
  height: calc(100dvh - 84px);
  min-height: 0;
  display: flex;
  flex-direction: column;
  background-color: #f9fafb; // 中性淡冷灰底色
  color: #1f2937;
  overflow: hidden;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.agent-workspace {
  flex: 1;
  display: flex;
  width: 100%;
  overflow: hidden;
  position: relative;
}

.mobile-history-trigger {
  display: none;
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 20;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e5e7eb;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #4b5563;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);

  &:hover {
    background-color: #f3f4f6;
    color: #1f2937;
  }
}

// 主体内容
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  align-items: center;
  background-color: #ffffff; /* 确保右侧主体呈现高质感白底卡片 */
  min-width: 0;              /* 防止 Flex 内部元素溢出挤压侧栏 */
}

.chat-stream {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  padding: 28px 0 0;
  box-sizing: border-box;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(209, 213, 219, 0.6);
    border-radius: 3px;
  }
}

.message-list {
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  padding: 0 20px 100px; // 为底部 composer 腾出空隙
  box-sizing: border-box;
}

// 欢迎主页
.welcome-screen {
  max-width: 680px;
  margin: 8vh auto 0;
  text-align: center;
  padding: 0 20px;
  animation: fadeIn 0.4s ease-out;

  .welcome-title {
    font-size: 26px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 10px 0;
  }

  .welcome-subtitle {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.5;
    margin: 0 auto 36px;
    max-width: 480px;
  }
}

.suggestion-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  text-align: left;
}

.suggestion-card {
  background-color: #ffffff;
  border: 1px solid rgba(229, 231, 235, 0.8);
  border-radius: 12px;
  padding: 14px;
  min-height: 72px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  .card-text {
    font-size: 13px;
    color: #374151;
    line-height: 1.4;
  }

  .card-arrow {
    align-self: flex-end;
    font-size: 14px;
    color: #9ca3af;
    transition: transform 0.2s ease;
  }

  &:hover {
    border-color: #9ca3af;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    
    .card-arrow {
      color: #1f2937;
      transform: translateX(3px);
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 移动端及窄屏适配
@media (max-width: 768px) {
  .suggestion-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .welcome-title {
    font-size: 22px;
  }
  
  .welcome-screen {
    margin-top: 4vh;
  }

  .mobile-history-trigger {
    display: flex;
  }
}
</style>
