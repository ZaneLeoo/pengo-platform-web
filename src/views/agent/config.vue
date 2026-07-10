<template>
  <div class="app-container">
    <a-card title="Agent V2 配置说明">
      <a-alert
        type="info"
        :closable="false"
        title="聊天入口已由 Dify Supervisor + Spring 工具网关接管"
      />
      <a-descriptions :column="1" bordered class="mt20">
        <a-descriptions-item label="Dify 应用编码">AGENT_SUPERVISOR</a-descriptions-item>
        <a-descriptions-item label="工具服务密钥">agent.v2.tool_gateway_key</a-descriptions-item>
        <a-descriptions-item label="工具定义">ruoyi-agent/docs/agent-v2-tools.openapi.yaml</a-descriptions-item>
        <a-descriptions-item label="Supervisor 提示词">ruoyi-agent/docs/agent-v2-supervisor.md</a-descriptions-item>
      </a-descriptions>
      <p class="tip">
        API Key 与工具密钥仅保存在后端。Dify Cloud 必须通过受控 HTTPS 地址访问 Spring 工具网关。
      </p>
    </a-card>
  </div>
</template>
