<template>
  <div v-if="steps.length" class="reasoning-shell">
    <button class="reasoning-summary" type="button" @click="open = !open">
      <span class="summary-dot" :class="{ running: !isFinished }"></span>
      <span>{{ summaryText }}</span>
      <span class="summary-arrow" :class="{ open }"><ArrowDown /></span>
    </button>

    <div v-show="open" class="process-list">
      <div v-for="step in steps" :key="step.id" class="process-step">
        <span class="step-mark" :class="step.status"></span>
        <span class="step-label">
          {{ stepText(step) }}
        </span>
        <span v-if="formatElapsed(step.elapsedTime)" class="step-time">
          {{ formatElapsed(step.elapsedTime) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { DownOutlined as ArrowDown } from '@ant-design/icons-vue'
import { buildProcessSteps } from './processSteps.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
  done: Boolean,
  stopped: Boolean
})

const open = ref(true)
const terminalStatus = computed(() => props.stopped ? 'stopped' : (props.done ? 'finished' : undefined))
const steps = computed(() => buildProcessSteps(props.items, { terminalStatus: terminalStatus.value }))
const isFinished = computed(() => props.done || steps.value.every(step => step.status === 'finished'))
const runningStep = computed(() => [...steps.value].reverse().find(step => step.status === 'running'))
const summaryText = computed(() => {
  if (props.stopped) return '已停止生成'
  return runningStep.value
    ? `正在${runningStep.value.label}...`
    : `已完成 ${steps.value.length} 个处理步骤`
})

watch(() => props.done, done => {
  if (done) open.value = false
})

/** 将 Dify 秒数格式化为紧凑耗时。 */
function formatElapsed(value) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  return seconds < 1 ? `${Math.round(seconds * 1000)} ms` : `${seconds.toFixed(1)} s`
}

/** 根据步骤终态生成不误导用户的动作文本。 */
function stepText(step) {
  if (step.status === 'running') return `正在${step.label}`
  if (step.status === 'stopped') return `${step.label}（已停止）`
  return step.label
}
</script>

<style scoped lang="scss">
.reasoning-shell {
  margin: 8px 0 18px;
  color: #6b7280;
  font-size: 13px;
  border: 1px solid rgba(229, 231, 235, 0.8);
  border-radius: 10px;
  padding: 8px 10px;
  background: rgba(249, 250, 251, 0.7);
}

.reasoning-summary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border: 0;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
}

.summary-dot,
.step-mark {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #9ca3af;
  flex: none;
}

.summary-dot.running,
.step-mark.running {
  background: #111827;
  animation: breathe 1.4s ease-in-out infinite;
}

.step-mark.stopped { background: #d1d5db; }

.summary-arrow {
  font-size: 12px;
  transition: transform 0.2s ease;
}

.summary-arrow.open { transform: rotate(180deg); }

.process-list {
  margin: 5px 0 0 3px;
  padding: 2px 0 2px 14px;
  border-left: 1px solid #e5e7eb;
}

.process-step {
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: 9px;
}

.step-mark {
  width: 6px;
  height: 6px;
  margin-left: -17.5px;
  border: 2px solid #fff;
  box-sizing: content-box;
}

.step-label { color: #4b5563; }
.step-time { margin-left: auto; color: #9ca3af; font-size: 11px; }

@keyframes breathe {
  0%, 100% { opacity: 0.35; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}
</style>
