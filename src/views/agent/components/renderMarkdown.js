import { Marked } from 'marked'

const renderer = {
  html(source) {
    return escapeHtml(source).replace(/on(?=[a-z]+\s*=)/gi, 'on&#8203;')
  },
  link(href, title, text) {
    if (!isSafeUrl(href)) return text
    const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : ''
    return `<a href="${escapeAttribute(href)}"${titleAttribute} target="_blank" rel="noopener noreferrer">${text}</a>`
  },
  image(href, title, text) {
    if (!isSafeUrl(href)) return escapeHtml(text || '')
    const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : ''
    return `<img src="${escapeAttribute(href)}" alt="${escapeAttribute(text || '')}"${titleAttribute}>`
  }
}

const markdown = new Marked({
  breaks: true,
  gfm: true,
  renderer
})

/** 将 Agent Markdown 转换为不执行原始 HTML 或危险链接的安全内容。 */
export function renderSafeMarkdown(source = '') {
  return markdown.parse(String(source))
}

/** 判断链接是否属于浏览器可安全打开的协议。 */
function isSafeUrl(value) {
  const url = String(value || '').trim()
  if (!url) return false
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../') || url.startsWith('#')) return true
  return /^(https?:|mailto:)/i.test(url)
}

/** 转义 HTML 文本节点。 */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** 转义 HTML 属性值。 */
function escapeAttribute(value) {
  return escapeHtml(value)
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
