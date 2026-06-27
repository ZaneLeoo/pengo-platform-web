import request from '@/utils/request'
import { getToken } from '@/utils/auth'

export const listConversations = () => request({ url: '/agent/conversations', method: 'get' })
export const createConversation = (data = {}) => request({ url: '/agent/conversations', method: 'post', data })
export const listMessages = id => request({ url: `/agent/conversations/${id}/messages`, method: 'get' })
export const renameConversation = (id, title) => request({ url: `/agent/conversations/${id}/rename`, method: 'post', data: { title } })
export const deleteConversation = id => request({ url: `/agent/conversations/${id}`, method: 'delete' })
export const stopChat = conversationId => request({ url: '/agent/chat/stop', method: 'post', data: { conversationId } })

/** 使用 fetch 读取 POST text/event-stream，并按标准 SSE 帧回调。 */
export async function streamChat(data, onEvent, signal) {
  const response = await fetch(`${import.meta.env.VITE_APP_BASE_API}/agent/chat/stream`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error(`请求失败（${response.status}）`)
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replace(/\r\n/g, '\n')
    const frames = buffer.split('\n\n')
    buffer = frames.pop() || ''
    frames.forEach(frame => dispatchFrame(frame, onEvent))
    if (done) { if (buffer.trim()) dispatchFrame(buffer, onEvent); break }
  }
}

/** 解析单个 SSE 帧；数据始终以 JSON 处理，不执行 HTML 或脚本。 */
function dispatchFrame(frame, onEvent) {
  let event = 'message'
  const data = []
  frame.split('\n').forEach(line => {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
  })
  if (!data.length) return
  try { onEvent(event, JSON.parse(data.join('\n'))) }
  catch { onEvent('error', { message: '服务端返回了无法识别的流式数据' }) }
}
