import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const agentPage = readFileSync(new URL('../index.vue', import.meta.url), 'utf8')
const chatMessage = readFileSync(new URL('./ChatMessage.vue', import.meta.url), 'utf8')
const chatComposer = readFileSync(new URL('./ChatComposer.vue', import.meta.url), 'utf8')
const processTimeline = readFileSync(new URL('./ProcessTimeline.vue', import.meta.url), 'utf8')

test('嵌入式 Agent 页面不再渲染重复顶部栏', () => {
  assert.match(agentPage, /\.agent-page\s*\{[\s\S]*?height:\s*calc\(100dvh\s*-\s*84px\)/)
  assert.doesNotMatch(agentPage, /\.agent-page\s*\{[\s\S]*?height:\s*100%/)
  assert.doesNotMatch(agentPage, /<header class="topbar">/)
  assert.doesNotMatch(agentPage, /class="status-indicator"/)
  assert.match(agentPage, /class="mobile-history-trigger"/)
})

test('助手消息占满内容列而用户气泡保持紧凑', () => {
  assert.match(chatMessage, /&\.assistant[\s\S]*?\.message-container\s*\{[\s\S]*?width:\s*100%/)
  assert.match(chatMessage, /&\.user[\s\S]*?\.message-container\s*\{[\s\S]*?width:\s*auto/)
})

test('Welcome 区域不再展示抽象 Logo', () => {
  assert.doesNotMatch(agentPage, /class="welcome-logo"/)
  assert.doesNotMatch(agentPage, /class="logo-spark"/)
})

test('输入框使用 Ant Design Vue textarea 而不是旧组件库选择器', () => {
  assert.match(chatComposer, /<a-textarea[\s\S]*?class="composer-textarea"/)
  assert.match(chatComposer, /:auto-size="\{\s*minRows:\s*1,\s*maxRows:\s*6\s*\}"/)
  assert.doesNotMatch(chatComposer, /el-textarea__inner/)
})

test('助手消息和推理过程使用 AI 应用化外壳', () => {
  assert.match(chatMessage, /class="ai-message-surface"/)
  assert.match(chatMessage, /class="ai-message-actions"/)
  assert.match(processTimeline, /class="reasoning-shell"/)
  assert.match(processTimeline, /class="reasoning-summary"/)
})

test('助手错误提示使用 Ant Design Vue 的 message 属性显示文案', () => {
  assert.match(chatMessage, /<a-alert[\s\S]*?:message="message\.error"/)
  assert.doesNotMatch(chatMessage, /<a-alert[\s\S]*?:title="message\.error"/)
})

test('ChatMessage 避免消息 prop 与 Ant Design Vue message API 重名', () => {
  assert.match(chatMessage, /import\s*\{\s*message\s+as\s+antMessage\s*\}\s*from\s*'ant-design-vue'/)
  assert.doesNotMatch(chatMessage, /import\s*\{\s*message\s*\}\s*from\s*'ant-design-vue'/)
  assert.match(chatMessage, /antMessage\.info/)
  assert.match(chatMessage, /antMessage\.error/)
})

test('Agent 页面使用 AI 工作台布局标记', () => {
  assert.match(agentPage, /class="agent-workspace"/)
  assert.match(agentPage, /class="chat-stream"/)
  assert.match(chatComposer, /class="prompt-dock"/)
})
