<template>
  <div class="agent-host">
    <iframe
      ref="frameRef"
      class="agent-frame"
      :src="agentUiUrl"
      title="企业智能体"
      allow="clipboard-write"
      @load="sendBootstrap"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { getToken } from '@/utils/auth'

const READY_TYPE = 'agent-ui:ready'
const BOOTSTRAP_TYPE = 'agent-ui:bootstrap'
const frameRef = ref(null)
const userStore = useUserStore()
const agentUiUrl = import.meta.env.VITE_AGENT_UI_URL || 'http://localhost:5174'
const agentOrigin = new URL(agentUiUrl, window.location.href).origin
const userName = computed(() => userStore.nickName || userStore.name || '当前用户')

function sendBootstrap() {
  frameRef.value?.contentWindow?.postMessage({
    type: BOOTSTRAP_TYPE,
    payload: {
      token: userStore.token || getToken() || '',
      baseApi: import.meta.env.VITE_APP_BASE_API || '/dev-api',
      user: { name: userStore.name, nickName: userName.value },
    },
  }, agentOrigin)
}

function handleMessage(event) {
  if (event.origin !== agentOrigin || event.source !== frameRef.value?.contentWindow) return
  if (event.data?.type === READY_TYPE) sendBootstrap()
}

onMounted(() => window.addEventListener('message', handleMessage))
onBeforeUnmount(() => window.removeEventListener('message', handleMessage))
</script>

<style scoped>
.agent-host {
  height: calc(100vh - 84px);
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

.agent-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}
</style>
