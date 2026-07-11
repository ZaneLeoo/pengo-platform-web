<template>
  <div class="app-container">
    <a-card title="智能助手配置说明">
      <a-alert
        type="info"
        :closable="false"
        title="当前版本只保留 Spring 转发到 Dify 的基础流式聊天"
      />
      <a-descriptions :column="1" bordered class="mt20">
        <a-descriptions-item label="Dify 应用编码">AGENT_SUPERVISOR</a-descriptions-item>
        <a-descriptions-item label="后端入口">POST /agent/chat/stream</a-descriptions-item>
        <a-descriptions-item label="流式事件">message / metadata / done / error</a-descriptions-item>
        <a-descriptions-item label="当前范围">基础对话、Dify 会话 ID 续聊、停止生成</a-descriptions-item>
      </a-descriptions>
      <p class="tip">
        API Key 只保存在后端配置表中。工具调用、图表、文件生成和复杂编排暂时冻结，后续按一个小目标一个小目标恢复。
      </p>
    </a-card>
  </div>
</template>
