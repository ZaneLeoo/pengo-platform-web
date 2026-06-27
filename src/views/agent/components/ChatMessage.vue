<template>
  <div class="message-wrapper" :class="message.role">
    <div class="message-container">
      <!-- AI 思考过程 (置于回答上方或回答内部) -->
      <ProcessTimeline
        v-if="message.role === 'assistant' && message.process && message.process.length"
        :items="message.process"
        :done="!message.streaming"
        :stopped="Boolean(message.stopped || message.status === 'stopped')"
      />

      <!-- 消息主体 -->
      <div class="message-content">
        <!-- 助手渲染 Markdown -->
        <div
          v-if="message.role === 'assistant'"
          ref="contentRef"
          class="content-body markdown-body"
          v-html="renderedContent"
        ></div>
        
        <!-- 用户渲染纯文本 -->
        <div v-else class="content-body user-body">
          {{ message.content }}
        </div>

        <!-- 错误提示 -->
        <div v-if="message.error" class="error-box">
          <a-alert :title="message.error" type="error" :closable="false" show-icon />
        </div>
      </div>

      <!-- 结构化图表/表格产物 -->
      <div v-if="message.role === 'assistant' && message.artifacts && message.artifacts.length" class="artifacts-container">
        <ArtifactRenderer
          v-for="(artifact, i) in message.artifacts"
          :key="i"
          :artifact="artifact"
        />
      </div>

      <!-- 消息操作条 (Hover 显示) -->
      <div class="message-actions" v-if="!message.streaming && message.content">
        <button class="action-btn" title="复制消息" @click="copyMessage">
          <span><DocumentCopy /></span>
          <span>复制</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import Prism from 'prismjs'
import { message } from 'ant-design-vue'
import { CopyOutlined as DocumentCopy } from '@ant-design/icons-vue'
import 'prismjs/themes/prism.css'
// 显式引入 AI 常见输出的主流语言高亮包
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import ProcessTimeline from './ProcessTimeline.vue'
import ArtifactRenderer from './ArtifactRenderer.vue'
import { renderSafeMarkdown } from './renderMarkdown.js'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const contentRef = ref(null)

// 转换 markdown 并包含流式输入光标
const renderedContent = computed(() => {
  if (props.message.role !== 'assistant') return ''
  let text = props.message.content || ''
  
  let parsedHtml = renderSafeMarkdown(text)
  if (props.message.streaming) {
    if (!text.trim()) {
      // 思考阶段：尚未输出任何文字，渲染 3x3 矩阵方块 Loading 动画
      parsedHtml += `
        <div class="matrix-loader">
          <div class="square" id="sq1"></div>
          <div class="square" id="sq2"></div>
          <div class="square" id="sq3"></div>
          <div class="square" id="sq4"></div>
          <div class="square" id="sq5"></div>
          <div class="square" id="sq6"></div>
          <div class="square" id="sq7"></div>
          <div class="square" id="sq8"></div>
          <div class="square" id="sq9"></div>
        </div>
      `
    } else {
      // 打印阶段：已有文字吐出，改为文字末尾低调闪烁的常规编辑光标 (Typing)
      parsedHtml += '<span class="text-cursor"></span>'
    }
  }
  return parsedHtml
})

// 监听内容变化以重新渲染高亮和复制按钮
watch(() => props.message.content, () => {
  nextTick(() => {
    highlightCode()
  })
}, { immediate: true })

watch(() => props.message.streaming, (val) => {
  if (!val) {
    nextTick(() => {
      highlightCode()
    })
  }
})

onMounted(() => {
  highlightCode()
})

function highlightCode() {
  if (!contentRef.value) return
  Prism.highlightAllUnder(contentRef.value)
  addCopyButtons()
}

function addCopyButtons() {
  if (!contentRef.value) return
  const preElements = contentRef.value.querySelectorAll('pre')
  preElements.forEach(pre => {
    pre.style.position = 'relative'

    // 1. 动态生成并挂载仿 GPT 顶栏 (code-block-header)
    let header = pre.querySelector('.code-block-header')
    if (!header) {
      header = document.createElement('div')
      header.className = 'code-block-header'

      // 提取语言
      const codeEl = pre.querySelector('code')
      let lang = ''
      if (codeEl) {
        const match = codeEl.className.match(/(?:language|lang)-(\w+)/)
        if (match) {
          lang = match[1]
        }
      }
      
      // 首字母大写格式化，例如 python -> Python
      const formattedLang = lang 
        ? lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase() 
        : 'Text'

      // 创建左侧语言标志容器 (包含极细 </> SVG 与首字母大写名称)
      const langWrapper = document.createElement('div')
      langWrapper.className = 'code-lang-wrapper'
      langWrapper.innerHTML = `
        <svg class="code-icon" viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        <span class="code-lang-label">${formattedLang}</span>
      `
      header.appendChild(langWrapper)

      // 创建右侧复制图标按钮 (SVG)
      const copyBtn = document.createElement('button')
      copyBtn.className = 'copy-code-btn'
      copyBtn.setAttribute('title', '复制代码')
      copyBtn.innerHTML = `
        <svg class="copy-icon" viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      `
      copyBtn.onclick = () => {
        const codeText = pre.querySelector('code')?.innerText || pre.innerText
        navigator.clipboard.writeText(codeText).then(() => {
          copyBtn.innerHTML = `
            <svg class="check-icon" viewBox="0 0 24 24" width="13" height="13" stroke="#10b981" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          `
          copyBtn.classList.add('copied')
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg class="copy-icon" viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            `
            copyBtn.classList.remove('copied')
          }, 2000)
        }).catch(err => {
          console.error('复制失败', err)
        })
      }
      header.appendChild(copyBtn)

      // 插入到 pre 的最前面
      pre.insertBefore(header, pre.firstChild)
    }
  })
}

function copyMessage() {
  navigator.clipboard.writeText(props.message.content).then(() => {
    message.info({
      message: '消息内容已复制',
      type: 'success',
      duration: 1500
    })
  }).catch(err => {
    message.error('复制失败，请重试')
  })
}
</script>

<style scoped lang="scss">
.message-wrapper {
  display: flex;
  width: 100%;
  margin-bottom: 28px;
  
  &.user {
    justify-content: flex-end;

    .message-container {
      width: auto;
      max-width: min(75%, 680px);
    }
  }
  
  &.assistant {
    justify-content: flex-start;

    .message-container {
      width: 100%;
      max-width: 100%;
    }
  }
}

.message-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &:hover {
    .message-actions {
      opacity: 1;
    }
  }
}

.message-content {
  border-radius: 12px;
  font-size: 14.5px;
  line-height: 1.65;
  word-break: break-word;
}

// 用户气泡样式
.user-body {
  background-color: #f3f4f6;
  color: #1f2937;
  padding: 12px 16px;
  border-radius: 16px;
  border-bottom-right-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

// 助手内容样式 (无背景，整洁左对齐)
.markdown-body {
  color: #1f2937;
  padding: 4px 0;
  
  :deep(p) {
    margin: 0 0 12px 0;
    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(ul), :deep(ol) {
    margin: 0 0 12px 0;
    padding-left: 20px;
  }

  :deep(li) {
    margin-bottom: 4px;
  }

  :deep(code) {
    background-color: #f3f4f6;
    padding: 2px 5px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
    color: #ef4444;
  }

  :deep(pre) {
    background-color: #f3f4f6; /* 温和淡灰 */
    padding: 0;
    border-radius: 14px; /* 大圆角 */
    overflow: hidden;
    margin: 16px 0;
    display: flex;
    flex-direction: column;
    border: none;

    code {
      padding: 0 16px 16px 16px; /* 顶 0，左右下 16px */
      background-color: transparent;
      color: #1f2937;
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 13px;
      line-height: 1.65;
      overflow-x: auto;
      display: block;
    }

    .code-block-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 38px;
      padding: 0 16px;
      user-select: none;
      flex-shrink: 0;
      background-color: transparent;

      .code-lang-wrapper {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #6b7280;

        .code-icon {
          color: #6b7280;
          opacity: 0.85;
          display: flex;
          align-items: center;
        }

        .code-lang-label {
          font-size: 11.5px;
          font-weight: 600;
          text-transform: capitalize; /* 首字母大写，正如 GPT */
          letter-spacing: 0.3px;
        }
      }

      .copy-code-btn {
        background: transparent;
        border: none;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 6px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background-color: rgba(0, 0, 0, 0.05);
          color: #111827;
        }
      }
    }
  }

  /* 覆盖 Prism 浅色语法着色，注入极其高档的 GPT 浅色配色 */
  :deep(.token.comment),
  :deep(.token.prolog),
  :deep(.token.doctype),
  :deep(.token.cdata) {
    color: #6b7280 !important;
    font-style: italic;
  }

  :deep(.token.namespace) {
    opacity: 0.7;
  }

  :deep(.token.string),
  :deep(.token.char),
  :deep(.token.attr-value),
  :deep(.token.regex),
  :deep(.token.variable) {
    color: #047857 !important; /* 优雅的森林绿 */
  }

  :deep(.token.number),
  :deep(.token.boolean) {
    color: #b45309 !important; /* 深橙棕色，高清晰度 */
  }

  :deep(.token.keyword),
  :deep(.token.selector),
  :deep(.token.important),
  :deep(.token.atrule) {
    color: #be123c !important; /* GPT 专属玫瑰红 */
    font-weight: 600;
  }

  :deep(.token.operator),
  :deep(.token.punctuation),
  :deep(.token.entity),
  :deep(.token.url) {
    color: #374151 !important; /* 深灰 */
  }

  :deep(.token.function) {
    color: #6d28d9 !important; /* 深紫蓝色 */
    font-weight: 600;
  }

  :deep(.token.class-name) {
    color: #4f46e5 !important; /* 靛蓝色 */
    font-weight: 500;
  }

  :deep(.token.property),
  :deep(.token.tag),
  :deep(.token.constant),
  :deep(.token.symbol),
  :deep(.token.deleted) {
    color: #9a3412 !important; /* 棕红色 */
  }

  :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
    margin: 16px 0 8px 0;
    font-weight: 600;
    color: #111827;
  }

  :deep(h1) { font-size: 1.5em; }
  :deep(h2) { font-size: 1.3em; }
  :deep(h3) { font-size: 1.15em; }

  :deep(blockquote) {
    margin: 12px 0;
    padding-left: 12px;
    border-left: 4px solid #d1d5db;
    color: #4b5563;
    font-style: italic;
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 13.5px;
    
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px 12px;
      text-align: left;
    }

    th {
      background-color: #f9fafb;
      font-weight: 600;
    }
  }
}

.error-box {
  margin-top: 8px;
}

.artifacts-container {
  margin-top: 10px;
  width: 100%;
}

.message-actions {
  display: flex;
  opacity: 0;
  transition: opacity 0.2s ease;
  position: absolute;
  bottom: -22px;
  left: 0;
  z-index: 5;
  
  .action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 11px;
    color: #9ca3af;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
      color: #4b5563;
      background-color: #f3f4f6;
    }
  }
}

.user {
  .message-actions {
    left: auto;
    right: 0;
  }
}

// 思考阶段：模拟 Dify Agent 运算的 3x3 矩阵方块 Loading 动画 (16px 微型高精版)
:deep(.matrix-loader) {
  position: relative;
  width: 16px;
  height: 16px;
  margin: 3px 8px;
  display: inline-block;
  vertical-align: middle;
}

:deep(.square) {
  background: #1f2937; /* 炭黑色 */
  width: 3px;
  height: 3px;
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -1.5px;
  margin-left: -1.5px;
  border-radius: 0.8px; /* 微型圆角 */
}

:deep(#sq1) {
  margin-top: -7.5px;
  margin-left: -7.5px;
  animation: loader_5191 675ms ease-in-out 0s infinite alternate;
}

:deep(#sq2) {
  margin-top: -7.5px;
  animation: loader_5191 675ms ease-in-out 75ms infinite alternate;
}

:deep(#sq3) {
  margin-top: -7.5px;
  margin-left: 4.5px;
  animation: loader_5191 675ms ease-in-out 150ms infinite alternate;
}

:deep(#sq4) {
  margin-left: -7.5px;
  animation: loader_5191 675ms ease-in-out 225ms infinite alternate;
}

:deep(#sq5) {
  animation: loader_5191 675ms ease-in-out 300ms infinite alternate;
}

:deep(#sq6) {
  margin-left: 4.5px;
  animation: loader_5191 675ms ease-in-out 375ms infinite alternate;
}

:deep(#sq7) {
  margin-top: 4.5px;
  margin-left: -7.5px;
  animation: loader_5191 675ms ease-in-out 450ms infinite alternate;
}

:deep(#sq8) {
  margin-top: 4.5px;
  animation: loader_5191 675ms ease-in-out 525ms infinite alternate;
}

:deep(#sq9) {
  margin-top: 4.5px;
  margin-left: 4.5px;
  animation: loader_5191 675ms ease-in-out 600ms infinite alternate;
}

@keyframes loader_5191 {
  from {
    opacity: 0.12;
    transform: scale(0.75);
  }
  to {
    opacity: 1;
    transform: scale(1.2);
  }
}

// 打印阶段：低调常规光标，防止晃眼
:deep(.text-cursor) {
  display: inline-block;
  width: 1.5px;
  height: 14px;
  background-color: #4b5563; /* 温和中灰 */
  margin-left: 4px;
  vertical-align: middle;
  animation: text-cursor-blink 0.8s infinite;
}

@keyframes text-cursor-blink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
</style>
