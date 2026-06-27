import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const agentPage = readFileSync(new URL('../index.vue', import.meta.url), 'utf8')
const chatMessage = readFileSync(new URL('./ChatMessage.vue', import.meta.url), 'utf8')

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
