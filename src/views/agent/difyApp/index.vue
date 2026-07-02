<template>
  <div class="dify-app-page">
    <a-card title="Dify 应用配置" :bordered="false">
      <template #extra>
        <a-space>
          <a-button v-hasPermi="['agent:difyApp:add']" type="primary" @click="openCreate">
            <BearJiaIcon icon="plus-outlined" />
            新增应用
          </a-button>
          <a-button @click="loadData">
            <BearJiaIcon icon="reload-outlined" />
            刷新
          </a-button>
        </a-space>
      </template>

      <a-alert
        class="mb-16"
        show-icon
        type="info"
        message="这里维护不同 AI 能力对应的 Dify 应用。API Key 只会保存到后端，列表中会脱敏显示。"
      />

      <a-form class="search-form" layout="inline" :model="query">
        <a-form-item label="应用编码">
          <a-input v-model:value="query.appCode" allow-clear placeholder="AGENT_CHAT / BOM_OCR" />
        </a-form-item>
        <a-form-item label="应用名称">
          <a-input v-model:value="query.appName" allow-clear placeholder="应用名称" />
        </a-form-item>
        <a-form-item label="启用状态">
          <a-select
            v-model:value="query.enabled"
            allow-clear
            placeholder="全部"
            style="width: 120px"
          >
            <a-select-option value="Y">启用</a-select-option>
            <a-select-option value="N">停用</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="resetSearch">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-table
        class="mt-16"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'appType'">
            <a-tag :color="record.appType === 'workflow' ? 'purple' : 'blue'">
              {{ record.appType || '-' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="record.enabled === 'Y' ? 'green' : 'default'">
              {{ record.enabled === 'Y' ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'apiKey'">
            <span class="muted-text">{{ record.apiKey ? '已配置' : '未配置' }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a v-hasPermi="['agent:difyApp:edit']" @click="openEdit(record)">编辑</a>
              <a-popconfirm
                v-hasPermi="['agent:difyApp:remove']"
                title="确认删除该 Dify 应用配置？"
                @confirm="handleDelete(record.id)"
              >
                <a class="danger-text">删除</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="modalOpen"
      :confirm-loading="saving"
      :title="form.id ? '编辑 Dify 应用' : '新增 Dify 应用'"
      width="680px"
      @ok="handleSubmit"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="应用编码" name="appCode">
              <a-input
                v-model:value="form.appCode"
                :disabled="!!form.id"
                placeholder="例如 AGENT_CHAT / BOM_OCR"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="应用类型" name="appType">
              <a-select v-model:value="form.appType" placeholder="请选择">
                <a-select-option value="chatflow">chatflow</a-select-option>
                <a-select-option value="workflow">workflow</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="应用名称" name="appName">
          <a-input v-model:value="form.appName" placeholder="业务可读名称" />
        </a-form-item>

        <a-form-item label="Dify API 地址" name="apiBaseUrl">
          <a-input v-model:value="form.apiBaseUrl" placeholder="https://api.dify.ai/v1" />
        </a-form-item>

        <a-form-item label="Dify API Key" name="apiKey">
          <a-input-password
            v-model:value="form.apiKey"
            autocomplete="new-password"
            placeholder="留空或保持脱敏值时，不覆盖原 Key"
          />
        </a-form-item>

        <a-form-item label="启用状态" name="enabled">
          <a-radio-group v-model:value="form.enabled">
            <a-radio value="Y">启用</a-radio>
            <a-radio value="N">停用</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="备注">
          <a-textarea v-model:value="form.remark" :auto-size="{ minRows: 3, maxRows: 5 }" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup name="DifyAppConfig">
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import {
  addDifyApp,
  deleteDifyApps,
  getDifyApp,
  listDifyApps,
  updateDifyApp,
} from '@/api/agent/difyApp';
import { BearJiaIcon } from '@/utils/BearJiaIcon.js';

const loading = ref(false);
const saving = ref(false);
const rows = ref([]);
const total = ref(0);
const modalOpen = ref(false);
const formRef = ref();

const query = reactive({
  pageNum: 1,
  pageSize: 10,
  appCode: '',
  appName: '',
  enabled: undefined,
});

const form = reactive(defaultForm());

const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  total: total.value,
  showSizeChanger: true,
  showTotal: (value) => `共 ${value} 条`,
}));

const columns = [
  { title: '应用编码', dataIndex: 'appCode', key: 'appCode', width: 150 },
  { title: '应用名称', dataIndex: 'appName', key: 'appName', width: 180 },
  { title: '类型', dataIndex: 'appType', key: 'appType', width: 120 },
  { title: 'API 地址', dataIndex: 'apiBaseUrl', key: 'apiBaseUrl', ellipsis: true },
  { title: 'API Key', dataIndex: 'apiKey', key: 'apiKey', width: 100 },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 100 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 170 },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  { title: '操作', key: 'action', width: 120, fixed: 'right' },
];

const rules = {
  appCode: [{ required: true, message: '请输入应用编码', trigger: 'blur' }],
  appName: [{ required: true, message: '请输入应用名称', trigger: 'blur' }],
  appType: [{ required: true, message: '请选择应用类型', trigger: 'change' }],
  apiBaseUrl: [{ required: true, message: '请输入 Dify API 地址', trigger: 'blur' }],
  enabled: [{ required: true, message: '请选择启用状态', trigger: 'change' }],
};

loadData();

function defaultForm() {
  return {
    id: undefined,
    appCode: '',
    appName: '',
    appType: 'workflow',
    apiBaseUrl: 'https://api.dify.ai/v1',
    apiKey: '',
    enabled: 'Y',
    remark: '',
  };
}

function assignForm(value) {
  Object.assign(form, defaultForm(), value || {});
}

async function loadData() {
  loading.value = true;
  try {
    const res = await listDifyApps(query);
    rows.value = res.rows || [];
    total.value = res.total || 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  query.pageNum = 1;
  loadData();
}

function resetSearch() {
  Object.assign(query, {
    pageNum: 1,
    pageSize: 10,
    appCode: '',
    appName: '',
    enabled: undefined,
  });
  loadData();
}

function handleTableChange(page) {
  query.pageNum = page.current;
  query.pageSize = page.pageSize;
  loadData();
}

function openCreate() {
  assignForm();
  modalOpen.value = true;
}

async function openEdit(record) {
  const res = await getDifyApp(record.id);
  assignForm(res.data);
  modalOpen.value = true;
}

async function handleSubmit() {
  await formRef.value.validate();
  saving.value = true;
  try {
    if (form.id) {
      await updateDifyApp(form);
      message.success('修改成功');
    } else {
      await addDifyApp(form);
      message.success('新增成功');
    }
    modalOpen.value = false;
    await loadData();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id) {
  await deleteDifyApps(id);
  message.success('删除成功');
  await loadData();
}
</script>

<style lang="less" scoped>
.dify-app-page {
  .search-form {
    padding: 4px 0;
  }

  .mt-16 {
    margin-top: 16px;
  }

  .mb-16 {
    margin-bottom: 16px;
  }

  .muted-text {
    color: rgba(0, 0, 0, 0.45);
  }

  .danger-text {
    color: #ff4d4f;
  }
}
</style>
