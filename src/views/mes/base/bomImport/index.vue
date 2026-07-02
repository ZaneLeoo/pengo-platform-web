<template>
  <div class="bom-import-page">
    <a-row :gutter="16">
      <a-col :xs="24" :lg="9" :xl="8">
        <a-card class="panel-card" title="BOM图纸识别">
          <a-upload-dragger
            :accept="acceptTypes"
            :before-upload="handleBeforeUpload"
            :file-list="fileList"
            :max-count="1"
            name="file"
            @remove="handleRemoveFile"
          >
            <p class="ant-upload-drag-icon">
              <BearJiaIcon icon="cloud-upload-outlined" />
            </p>
            <p class="ant-upload-text">上传图片或 PDF 图纸</p>
            <p class="ant-upload-hint">识别完成后会生成可校验、可编辑的 BOM 导入草稿。</p>
          </a-upload-dragger>

          <a-form class="recognize-form" layout="vertical">
            <a-form-item label="Dify 文件变量">
              <a-input v-model:value="recognizeForm.fileVariable" placeholder="默认 image" />
            </a-form-item>
            <a-form-item label="识别提示">
              <a-textarea
                v-model:value="recognizeForm.query"
                :auto-size="{ minRows: 2, maxRows: 4 }"
                placeholder="可选，不填则使用后端默认提示"
              />
            </a-form-item>
            <a-form-item label="额外 inputs JSON">
              <a-textarea
                v-model:value="recognizeForm.inputs"
                :auto-size="{ minRows: 2, maxRows: 5 }"
                placeholder='例如 {"template":"railway-bom"}'
              />
            </a-form-item>
          </a-form>

          <a-space class="action-row">
            <a-button type="primary" :loading="recognizing" @click="handleRecognize">
              开始识别
            </a-button>
            <a-button @click="resetUpload">重置</a-button>
          </a-space>

          <a-alert
            v-if="recognizeError"
            class="mt-12"
            :message="recognizeError"
            type="error"
            show-icon
          />
        </a-card>

        <a-card v-if="currentDraft" class="panel-card mt-16" title="识别摘要">
          <a-descriptions :column="1" size="small" bordered>
            <a-descriptions-item label="任务ID">{{ currentDraft.id }}</a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag :color="statusColor(currentDraft.status)">{{
                statusLabel(currentDraft.status)
              }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item v-if="currentDraft.errorMessage" label="失败原因">
              {{ currentDraft.errorMessage }}
            </a-descriptions-item>
            <a-descriptions-item label="标题">{{
              currentDraft.document?.title || '-'
            }}</a-descriptions-item>
            <a-descriptions-item label="母件候选">{{
              currentDraft.document?.parentNameCandidate || '-'
            }}</a-descriptions-item>
            <a-descriptions-item label="图号">{{
              currentDraft.document?.drawingNo || '-'
            }}</a-descriptions-item>
            <a-descriptions-item label="明细行数">{{
              currentDraft.items?.length || 0
            }}</a-descriptions-item>
            <a-descriptions-item label="问题数">{{
              currentDraft.issues?.length || 0
            }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="15" :xl="16">
        <a-card class="panel-card" title="导入草稿">
          <template #extra>
            <a-space>
              <a-button :disabled="!currentDraft?.id" @click="handleValidateCurrent"
                >校验当前草稿</a-button
              >
              <a-button @click="loadTasks">刷新列表</a-button>
            </a-space>
          </template>

          <a-table
            :columns="taskColumns"
            :data-source="taskRows"
            :loading="taskLoading"
            :pagination="pagination"
            row-key="id"
            size="middle"
            @change="handleTaskTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a @click="loadDraft(record.id)">查看</a>
                  <a
                    :class="{ 'disabled-link': isProcessingStatus(record.status) }"
                    @click="!isProcessingStatus(record.status) && handleValidate(record.id)"
                  >
                    校验
                  </a>
                  <a-popconfirm title="确认删除该草稿？" @confirm="handleDelete(record.id)">
                    <a class="danger-text">删除</a>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-card>

        <a-card v-if="currentDraft" class="panel-card mt-16" title="草稿预览">
          <a-tabs v-model:active-key="activeTab">
            <a-tab-pane key="items" tab="明细行">
              <a-table
                :columns="itemColumns"
                :data-source="currentDraft.items || []"
                :pagination="{ pageSize: 10, showSizeChanger: true }"
                row-key="lineNo"
                size="small"
                :scroll="{ x: 1140 }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'riskLevel'">
                    <a-tag :color="riskColor(record.riskLevel)">{{
                      riskLabel(record.riskLevel)
                    }}</a-tag>
                  </template>
                </template>
              </a-table>
            </a-tab-pane>
            <a-tab-pane key="issues" :tab="`问题 ${currentDraft.issues?.length || 0}`">
              <a-empty v-if="!currentDraft.issues?.length" description="暂无问题" />
              <a-list v-else :data-source="currentDraft.issues" bordered>
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-list-item-meta>
                      <template #title>
                        <a-tag :color="issueColor(item.level)">{{ item.level || 'warning' }}</a-tag>
                        {{ item.field || item.code || '识别问题' }}
                      </template>
                      <template #description>{{ item.message }}</template>
                    </a-list-item-meta>
                  </a-list-item>
                </template>
              </a-list>
            </a-tab-pane>
            <a-tab-pane key="document" tab="标题区">
              <a-descriptions :column="2" size="small" bordered>
                <a-descriptions-item label="标题">{{
                  currentDraft.document?.title || '-'
                }}</a-descriptions-item>
                <a-descriptions-item label="母件名称候选">{{
                  currentDraft.document?.parentNameCandidate || '-'
                }}</a-descriptions-item>
                <a-descriptions-item label="母件编码候选">{{
                  currentDraft.document?.parentCodeCandidate || '-'
                }}</a-descriptions-item>
                <a-descriptions-item label="产品型号">{{
                  currentDraft.document?.productModel || '-'
                }}</a-descriptions-item>
                <a-descriptions-item label="图号">{{
                  currentDraft.document?.drawingNo || '-'
                }}</a-descriptions-item>
                <a-descriptions-item label="版本">{{
                  currentDraft.document?.revision || '-'
                }}</a-descriptions-item>
                <a-descriptions-item label="母件底数">{{
                  currentDraft.document?.baseQtyCandidate || '-'
                }}</a-descriptions-item>
                <a-descriptions-item label="总行数">{{
                  currentDraft.document?.totalRows || '-'
                }}</a-descriptions-item>
              </a-descriptions>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup name="BomImport">
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import {
  listBomImport,
  getBomImport,
  recognizeBomImport,
  validateBomImport,
  delBomImport,
} from '@/api/mes/base';
import { BearJiaIcon } from '@/utils/BearJiaIcon.js';

const acceptTypes = '.png,.jpg,.jpeg,.webp,.gif,.bmp,.pdf';
const fileList = ref([]);
const selectedFile = ref(null);
const recognizing = ref(false);
const recognizeError = ref('');
const taskLoading = ref(false);
const taskRows = ref([]);
const currentDraft = ref(null);
const activeTab = ref('items');
let pollingTimer = null;
const query = reactive({ pageNum: 1, pageSize: 10 });
const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  total: total.value,
  showSizeChanger: true,
  showTotal: (value) => `共 ${value} 条`,
}));
const total = ref(0);
const recognizeForm = reactive({
  fileVariable: 'image',
  query: '',
  inputs: '',
});

const taskColumns = [
  { title: '任务ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '文件名', dataIndex: 'fileName', key: 'fileName', ellipsis: true },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  {
    title: '母件候选',
    dataIndex: 'parentNameCandidate',
    key: 'parentNameCandidate',
    ellipsis: true,
  },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 150, ellipsis: true },
  { title: '行数', dataIndex: 'totalRows', key: 'totalRows', width: 80 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' },
];

const itemColumns = [
  { title: '序号', dataIndex: 'lineNo', key: 'lineNo', width: 72 },
  {
    title: '子件编码候选',
    dataIndex: 'componentCodeCandidate',
    key: 'componentCodeCandidate',
    width: 150,
  },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 150 },
  { title: '名称', dataIndex: 'itemName', key: 'itemName', width: 160 },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 70 },
  { title: '类型', dataIndex: 'itemType', key: 'itemType', width: 90 },
  { title: '规格', dataIndex: 'spec', key: 'spec', width: 220, ellipsis: true },
  { title: '单重', dataIndex: 'unitWeight', key: 'unitWeight', width: 80 },
  { title: '总重', dataIndex: 'totalWeight', key: 'totalWeight', width: 80 },
  { title: '风险', dataIndex: 'riskLevel', key: 'riskLevel', width: 90 },
  { title: '问题', dataIndex: 'issueMessage', key: 'issueMessage', width: 180, ellipsis: true },
];

loadTasks();

onBeforeUnmount(() => {
  clearPolling();
});

function handleBeforeUpload(file) {
  selectedFile.value = file;
  fileList.value = [file];
  return false;
}

function handleRemoveFile() {
  selectedFile.value = null;
  fileList.value = [];
}

function resetUpload() {
  selectedFile.value = null;
  fileList.value = [];
  recognizeError.value = '';
}

async function handleRecognize() {
  if (!selectedFile.value) {
    message.warning('请先选择图纸文件');
    return;
  }
  recognizeError.value = '';
  recognizing.value = true;
  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    if (recognizeForm.fileVariable) formData.append('fileVariable', recognizeForm.fileVariable);
    if (recognizeForm.query) formData.append('query', recognizeForm.query);
    if (recognizeForm.inputs) formData.append('inputs', recognizeForm.inputs);
    const res = await recognizeBomImport(formData);
    currentDraft.value = res.data;
    activeTab.value = 'items';
    message.success('已提交识别任务，正在后台处理');
    resetUpload();
    await loadTasks();
    if (res.data?.id) {
      pollDraftUntilFinished(res.data.id);
    } else {
      recognizing.value = false;
    }
  } catch (error) {
    recognizeError.value = error?.message || '识别失败';
    recognizing.value = false;
  }
}

async function pollDraftUntilFinished(id) {
  clearPolling();
  recognizing.value = true;
  try {
    const res = await getBomImport(id);
    currentDraft.value = res.data;
    if (isTerminalStatus(res.data?.status)) {
      recognizing.value = false;
      await loadTasks();
      if (res.data?.status === 'failed') {
        recognizeError.value = res.data?.errorMessage || '识别失败，请稍后重试';
        message.error('识别失败');
      } else {
        message.success('识别完成，已生成导入草稿');
      }
      return;
    }
    pollingTimer = window.setTimeout(() => pollDraftUntilFinished(id), 3000);
  } catch (error) {
    recognizing.value = false;
    recognizeError.value = error?.message || '查询识别任务失败';
  }
}

function clearPolling() {
  if (pollingTimer) {
    window.clearTimeout(pollingTimer);
    pollingTimer = null;
  }
}

async function loadTasks() {
  taskLoading.value = true;
  try {
    const res = await listBomImport(query);
    taskRows.value = res.rows || [];
    total.value = res.total || 0;
  } finally {
    taskLoading.value = false;
  }
}

function handleTaskTableChange(page) {
  query.pageNum = page.current;
  query.pageSize = page.pageSize;
  loadTasks();
}

async function loadDraft(id) {
  const res = await getBomImport(id);
  currentDraft.value = res.data;
  activeTab.value = 'items';
}

async function handleValidate(id) {
  await validateBomImport(id);
  message.success('校验完成');
  await loadDraft(id);
  await loadTasks();
}

function handleValidateCurrent() {
  if (!currentDraft.value?.id) return;
  handleValidate(currentDraft.value.id);
}

async function handleDelete(id) {
  await delBomImport(id);
  message.success('删除成功');
  if (currentDraft.value?.id === id) currentDraft.value = null;
  await loadTasks();
}

function statusLabel(value) {
  const labels = {
    processing: '识别中',
    draft: '草稿',
    recognized: '已识别',
    validated: '已校验',
    imported: '已导入',
    failed: '失败',
  };
  return labels[value] || value || '-';
}

function statusColor(value) {
  const colors = {
    processing: 'blue',
    draft: 'default',
    recognized: 'blue',
    validated: 'green',
    imported: 'purple',
    failed: 'red',
  };
  return colors[value] || 'default';
}

function isProcessingStatus(value) {
  return value === 'processing';
}

function isTerminalStatus(value) {
  return ['recognized', 'validated', 'imported', 'failed'].includes(value);
}

function riskLabel(value) {
  return { ok: '正常', warning: '警告', error: '错误' }[value] || value || '-';
}

function riskColor(value) {
  return { ok: 'green', warning: 'orange', error: 'red' }[value] || 'default';
}

function issueColor(value) {
  return { info: 'blue', warning: 'orange', error: 'red' }[value] || 'orange';
}
</script>

<style lang="less" scoped>
.bom-import-page {
  .panel-card {
    border-radius: 8px;
  }

  .recognize-form {
    margin-top: 16px;
  }

  .action-row {
    margin-top: 4px;
  }

  .mt-12 {
    margin-top: 12px;
  }

  .mt-16 {
    margin-top: 16px;
  }

  .danger-text {
    color: #ff4d4f;
  }

  .disabled-link {
    color: rgba(0, 0, 0, 0.25);
    cursor: not-allowed;
  }

  :deep(.ant-upload-drag-icon) {
    color: #1677ff;
    font-size: 34px;
  }
}
</style>
