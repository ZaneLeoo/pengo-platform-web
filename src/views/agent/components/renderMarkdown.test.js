import test from 'node:test'
import assert from 'node:assert/strict'
import { renderSafeMarkdown } from './renderMarkdown.js'

test('保留常用 Markdown 格式', () => {
  const html = renderSafeMarkdown('**经营分析**\n\n- 销售额增长')

  assert.match(html, /<strong>经营分析<\/strong>/)
  assert.match(html, /<li>销售额增长<\/li>/)
})

test('把模型返回的原始 HTML 当作文本显示', () => {
  const html = renderSafeMarkdown('<img src=x onerror="alert(1)">')

  assert.doesNotMatch(html, /<img/i)
  assert.doesNotMatch(html, /onerror=/i)
  assert.match(html, /&lt;img/)
})

test('危险协议链接不生成可点击地址', () => {
  const html = renderSafeMarkdown('[点击](javascript:alert(1))')

  assert.doesNotMatch(html, /javascript:/i)
  assert.doesNotMatch(html, /href=/i)
  assert.match(html, /点击/)
})
