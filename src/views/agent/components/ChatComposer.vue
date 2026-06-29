<template>
  <div class="prompt-dock">
    <div class="composer-wrapper">
      <div class="input-box">
        <a-textarea
          ref="inputRef"
          :value="modelValue"
          :auto-size="{ minRows: 1, maxRows: 6 }"
          placeholder="向智能助手发送消息..."
          class="composer-textarea"
          @input="event => emit('update:modelValue', event.target.value)"
          @keydown="handleKeyDown"
        />
        
        <!-- 操作按钮区 -->
        <div class="action-buttons">
          <button
            v-if="streaming"
            class="control-btn stop-btn"
            title="停止生成"
            @click="emit('stop')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2"></rect>
            </svg>
          </button>
          
          <button
            v-else
            class="control-btn send-btn"
            :disabled="!modelValue.trim()"
            title="发送消息 (Enter)"
            @click="send"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
    <div class="composer-footer">
      <span>AI 生成内容可能有误，请核对重要信息</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  streaming: Boolean
})

const emit = defineEmits(['update:modelValue', 'send', 'stop'])

const inputRef = ref(null)

onMounted(() => {
  // 聚焦输入框
  focusInput()
})

function focusInput() {
  if (inputRef.value) {
    inputRef.value.focus()
  }
}

function handleKeyDown(e) {
  // Enter 键逻辑：非 Shift + Enter 时触发发送，Shift + Enter 用于换行
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault() // 阻止默认的回车换行
    send()
  }
}

function send() {
  if (props.streaming || !props.modelValue.trim()) return
  emit('send')
}

// 暴露聚焦接口给父组件
defineExpose({
  focusInput
})
</script>

<style scoped lang="scss">
.prompt-dock {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: linear-gradient(transparent, #ffffff 30%);
  padding: 16px 0 20px;
}

.composer-wrapper {
  width: 100%;
  max-width: 920px;
  position: relative;
  padding: 0 20px;
  box-sizing: border-box;
}

.input-box {
  display: flex;
  align-items: flex-end;
  background: #ffffff;
  border: 1px solid rgba(229, 231, 235, 1);
  border-radius: 20px;
  padding: 8px 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.03), 
              0 2px 4px rgba(0, 0, 0, 0.01);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  gap: 12px;

  &:focus-within {
    border-color: #9ca3af;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.05),
                0 0 0 3px rgba(229, 231, 235, 0.5);
  }
}

.composer-textarea {
  flex: 1;
  font-family: inherit;
  border: none;
  box-shadow: none;
  padding: 6px 4px;
  font-size: 14.5px;
  color: #1f2937;
  line-height: 1.5;
  background: transparent;
  min-height: 24px !important;
  resize: none;

  &:focus {
    border: none;
    box-shadow: none;
    background: transparent;
  }

  &::placeholder {
    color: #9ca3af;
  }
}

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 3px; // 微调对齐
}

.control-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &.send-btn {
    background-color: #1f2937;
    color: #ffffff;

    &:hover:not(:disabled) {
      background-color: #111827;
      transform: scale(1.05);
    }

    &:disabled {
      background-color: #f3f4f6;
      color: #9ca3af;
      cursor: not-allowed;
    }
  }

  &.stop-btn {
    background-color: #ef4444;
    color: #ffffff;
    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);

    &:hover {
      background-color: #dc2626;
      transform: scale(1.05);
    }
  }
}

.composer-footer {
  font-size: 11.5px;
  color: #9ca3af;
  text-align: center;
  user-select: none;
}

@media (max-width: 640px) {
  .composer-wrapper {
    padding: 0 12px;
  }
  .input-box {
    padding: 6px 10px;
    border-radius: 16px;
  }
}
</style>
