import { Marked } from 'marked'

const renderer = {
  html(tokenOrSource) {
    const source = readTokenText(tokenOrSource)
    return escapeHtml(source).replace(/on(?=[a-z]+\s*=)/gi, 'on&#8203;')
  },
  link(tokenOrHref, title, text) {
    const { href, title: linkTitle, text: linkText } = readLinkToken(tokenOrHref, title, text)
    if (!isSafeUrl(href)) return linkText
    const titleAttribute = linkTitle ? ` title="${escapeAttribute(linkTitle)}"` : ''
    return `<a href="${escapeAttribute(href)}"${titleAttribute} target="_blank" rel="noopener noreferrer">${linkText}</a>`
  },
  image(tokenOrHref, title, text) {
    const { href, title: imageTitle, text: imageText } = readLinkToken(tokenOrHref, title, text)
    if (!isSafeUrl(href)) return escapeHtml(imageText || '')
    const titleAttribute = imageTitle ? ` title="${escapeAttribute(imageTitle)}"` : ''
    return `<img src="${escapeAttribute(href)}" alt="${escapeAttribute(imageText || '')}"${titleAttribute}>`
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

/** 兼容 marked 17 的 token renderer API 与旧版参数 API。 */
function readTokenText(value) {
  if (value && typeof value === 'object') {
    return value.text ?? value.raw ?? ''
  }
  return value
}

/** 读取链接/图片 token，旧版 marked 会以位置参数传入。 */
function readLinkToken(tokenOrHref, title, text) {
  if (tokenOrHref && typeof tokenOrHref === 'object') {
    return {
      href: tokenOrHref.href,
      title: tokenOrHref.title,
      text: tokenOrHref.text ?? ''
    }
  }

  return {
    href: tokenOrHref,
    title,
    text: text ?? ''
  }
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
