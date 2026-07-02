<template>
  <a-drawer
    v-model:open="visible"
    title="AI 识别导入 BOM"
    width="1120"
    :destroy-on-close="true"
    @close="handleClose"
  >
    <div class="ocr-import-drawer">
      <a-alert
        class="mb-16"
        type="info"
        show-icon
        message="识别结果会先生成草稿，确认后追加导入到当前 BOM 版本。未匹配到物料或数量异常的行会被跳过。"
      />

      <a-row :gutter="16">
        <a-col :span="8">
          <a-card size="small" title="上传图纸">
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
              <p class="ant-upload-text">上传图片或 PDF</p>
              <p class="ant-upload-hint">支持图纸截图、扫描件和 PDF。</p>
            </a-upload-dragger>

            <a-collapse class="advanced-options" ghost>
              <a-collapse-panel key="advanced" header="高级参数">
                <a-form layout="vertical">
                  <a-form-item label="Dify 文件变量">
                    <a-input v-model:value="recognizeForm.fileVariable" placeholder="image" />
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
                      :auto-size="{ minRows: 2, maxRows: 4 }"
                      placeholder='例如 {"template":"lamp-bom"}'
                    />
                  </a-form-item>
                </a-form>
              </a-collapse-panel>
            </a-collapse>

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

          <a-card v-if="currentDraft" class="mt-16" size="small" title="识别摘要">
            <a-descriptions :column="1" size="small" bordered>
              <a-descriptions-item label="草稿ID">{{ currentDraft.id }}</a-descriptions-item>
              <a-descriptions-item label="状态">
                <a-tag :color="statusColor(currentDraft.status)">
                  {{ statusLabel(currentDraft.status) }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="标题">
                {{ currentDraft.document?.title || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="母件候选">
                {{ currentDraft.document?.parentNameCandidate || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="明细行数">
                {{ currentDraft.items?.length || 0 }}
              </a-descriptions-item>
              <a-descriptions-item label="问题数">
                {{ currentDraft.issues?.length || 0 }}
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>

        <a-col :span="16">
          <a-card size="small" title="草稿确认">
            <template #extra>
              <a-space>
                <a-button :disabled="!currentDraft?.id" :loading="saving" @click="handleSave">
                  保存修正
                </a-button>
                <a-button :disabled="!currentDraft?.id" :loading="validating" @click="handleValidate">
                  校验
                </a-button>
                <a-button
                  type="primary"
                  :disabled="!canImport"
                  :loading="importing"
                  @click="handleImport"
                >
                  确认导入
                </a-button>
              </a-space>
            </template>

            <a-empty v-if="!currentDraft" description="上传图纸并识别后，在这里确认导入内容" />
            <a-tabs v-else v-model:active-key="activeTab">
              <a-tab-pane key="items" tab="明细行">
                <a-table
                  :columns="itemColumns"
                  :data-source="currentDraft.items || []"
                  :pagination="{ pageSize: 8, showSizeChanger: true }"
                  row-key="lineNo"
                  size="small"
                  :scroll="{ x: 1240 }"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'lineNo'">
                      <a-input-number v-model:value="record.lineNo" :min="1" style="width:72px" />
                    </template>
                    <template v-else-if="column.key === 'componentCodeCandidate'">
                      <a-input v-model:value="record.componentCodeCandidate" placeholder="物料编码" />
                    </template>
                    <template v-else-if="column.key === 'itemName'">
                      <a-input v-model:value="record.itemName" placeholder="名称" />
                    </template>
                    <template v-else-if="column.key === 'quantity'">
                      <a-input-number
                        v-model:value="record.quantity"
                        :min="0"
                        :precision="3"
                        style="width:88px"
                      />
                    </template>
                    <template v-else-if="column.key === 'unit'">
                      <a-input v-model:value="record.unit" />
                    </template>
                    <template v-else-if="column.key === 'itemType'">
                      <a-input v-model:value="record.itemType" placeholder="类型" />
                    </template>
                    <template v-else-if="column.key === 'spec'">
                      <a-input v-model:value="record.spec" />
                    </template>
                    <template v-else-if="column.key === 'remark'">
                      <a-input v-model:value="record.remark" />
                    </template>
                    <template v-else-if="column.key === 'riskLevel'">
                      <a-tag :color="riskColor(record.riskLevel)">
                        {{ riskLabel(record.riskLevel) }}
                      </a-tag>
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
                          <a-space>
                            <a-tag :color="issueColor(item.level)">{{ item.level || 'warning' }}</a-tag>
                            <span>{{ item.field || item.code || '识别问题' }}</span>
                          </a-space>
                        </template>
                        <template #description>{{ item.message }}</template>
                      </a-list-item-meta>
                    </a-list-item>
                  </template>
                </a-list>
              </a-tab-pane>

              <a-tab-pane key="document" tab="标题区">
                <a-descriptions :column="2" size="small" bordered>
                  <a-descriptions-item label="标题">
                    {{ currentDraft.document?.title || '-' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="母件名称候选">
                    {{ currentDraft.document?.parentNameCandidate || '-' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="母件编码候选">
                    {{ currentDraft.document?.parentCodeCandidate || '-' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="产品型号">
                    {{ currentDraft.document?.productModel || '-' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="图号">
                    {{ currentDraft.document?.drawingNo || '-' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="版本">
                    {{ currentDraft.document?.revision || '-' }}
                  </a-descriptions-item>
                </a-descriptions>
              </a-tab-pane>
            </a-tabs>
          </a-card>

          <a-alert
            v-if="importResult"
            class="mt-16"
            type="success"
            show-icon
            :message="`导入完成：成功 ${importResult.importedCount || 0} 行，跳过 ${importResult.skippedCount || 0} 行`"
          />
          <a-list
            v-if="importResult?.skippedItems?.length"
            class="mt-12"
            size="small"
            bordered
            :data-source="importResult.skippedItems"
          >
            <template #renderItem="{ item }">
              <a-list-item>
                第 {{ item.lineNo || '-' }} 行 {{ item.itemName || '' }}：{{ item.reason }}
              </a-list-item>
            </template>
          </a-list>
        </a-col>
      </a-row>
    </div>
  </a-drawer>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import * as mesBaseApi from '@/api/mes/base'
import { BearJiaIcon } from '@/utils/BearJiaIcon.js'

const emit = defineEmits(['imported'])

const visible = ref(false)
const targetBomVersionId = ref(null)
const acceptTypes = '.png,.jpg,.jpeg,.webp,.gif,.bmp,.pdf'
const fileList = ref([])
const selectedFile = ref(null)
const recognizing = ref(false)
const saving = ref(false)
const validating = ref(false)
const importing = ref(false)
const recognizeError = ref('')
const currentDraft = ref(null)
const importResult = ref(null)
const activeTab = ref('items')
let pollingTimer = null

const recognizeForm = reactive({
  fileVariable: 'image',
  query: '',
  inputs: '',
})

const canImport = computed(() => {
  return currentDraft.value?.id && !recognizing.value && !isProcessingStatus(currentDraft.value?.status)
})

const itemColumns = [
  { title: '序号', dataIndex: 'lineNo', key: 'lineNo', width: 92 },
  { title: '物料编码候选', dataIndex: 'componentCodeCandidate', key: 'componentCodeCandidate', width: 160 },
  { title: '名称', dataIndex: 'itemName', key: 'itemName', width: 150 },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 110 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 80 },
  { title: '类型', dataIndex: 'itemType', key: 'itemType', width: 110 },
  { title: '规格', dataIndex: 'spec', key: 'spec', width: 190 },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 160 },
  { title: '风险', dataIndex: 'riskLevel', key: 'riskLevel', width: 90 },
  { title: '问题', dataIndex: 'issueMessage', key: 'issueMessage', width: 180, ellipsis: true },
]

onBeforeUnmount(() => {
  clearPolling()
})

function open(bomVersionId) {
  targetBomVersionId.value = bomVersionId
  visible.value = true
  resetState()
}

function resetState() {
  clearPolling()
  selectedFile.value = null
  fileList.value = []
  recognizeError.value = ''
  currentDraft.value = null
  importResult.value = null
  activeTab.value = 'items'
}

function handleBeforeUpload(file) {
  selectedFile.value = file
  fileList.value = [file]
  return false
}

function handleRemoveFile() {
  selectedFile.value = null
  fileList.value = []
}

function resetUpload() {
  selectedFile.value = null
  fileList.value = []
  recognizeError.value = ''
}

async function handleRecognize() {
  if (!selectedFile.value) {
    message.warning('请先选择图纸文件')
    return
  }
  recognizeError.value = ''
  importResult.value = null
  recognizing.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    if (recognizeForm.fileVariable) formData.append('fileVariable', recognizeForm.fileVariable)
    if (recognizeForm.query) formData.append('query', recognizeForm.query)
    if (recognizeForm.inputs) formData.append('inputs', recognizeForm.inputs)
    const res = await mesBaseApi.recognizeBomImport(formData)
    currentDraft.value = res.data
    activeTab.value = 'items'
    message.success('已提交识别任务，正在后台处理')
    resetUpload()
    if (res.data?.id) {
      pollDraftUntilFinished(res.data.id)
    } else {
      recognizing.value = false
    }
  } catch (error) {
    recognizeError.value = error?.message || '识别失败'
    recognizing.value = false
  }
}

async function pollDraftUntilFinished(id) {
  clearPolling()
  recognizing.value = true
  try {
    const res = await mesBaseApi.getBomImport(id)
    currentDraft.value = res.data
    if (isTerminalStatus(res.data?.status)) {
      recognizing.value = false
      if (res.data?.status === 'failed') {
        recognizeError.value = res.data?.errorMessage || '识别失败，请稍后重试'
        message.error('识别失败')
      } else {
        message.success('识别完成，请确认明细')
      }
      return
    }
    pollingTimer = window.setTimeout(() => pollDraftUntilFinished(id), 3000)
  } catch (error) {
    recognizing.value = false
    recognizeError.value = error?.message || '查询识别任务失败'
  }
}

async function handleSave() {
  if (!currentDraft.value?.id) return
  saving.value = true
  try {
    const res = await mesBaseApi.updateBomImport(currentDraft.value.id, currentDraft.value)
    currentDraft.value = res.data
    message.success('草稿已保存')
  } finally {
    saving.value = false
  }
}

async function handleValidate() {
  if (!currentDraft.value?.id) return
  validating.value = true
  try {
    await mesBaseApi.updateBomImport(currentDraft.value.id, currentDraft.value)
    await mesBaseApi.validateBomImport(currentDraft.value.id)
    const res = await mesBaseApi.getBomImport(currentDraft.value.id)
    currentDraft.value = res.data
    activeTab.value = 'issues'
    message.success('校验完成')
  } finally {
    validating.value = false
  }
}

async function handleImport() {
  if (!currentDraft.value?.id || !targetBomVersionId.value) return
  importing.value = true
  try {
    await mesBaseApi.updateBomImport(currentDraft.value.id, currentDraft.value)
    const res = await mesBaseApi.importBomImport(currentDraft.value.id, { bomVersionId: targetBomVersionId.value })
    importResult.value = res.data
    message.success(`导入完成，成功 ${res.data?.importedCount || 0} 行`)
    emit('imported')
  } finally {
    importing.value = false
  }
}

function handleClose() {
  clearPolling()
}

function clearPolling() {
  if (pollingTimer) {
    window.clearTimeout(pollingTimer)
    pollingTimer = null
  }
}

function statusLabel(value) {
  return {
    processing: '识别中',
    draft: '草稿',
    recognized: '已识别',
    validated: '已校验',
    imported: '已导入',
    failed: '失败',
  }[value] || value || '-'
}

function statusColor(value) {
  return {
    processing: 'blue',
    draft: 'default',
    recognized: 'blue',
    validated: 'green',
    imported: 'purple',
    failed: 'red',
  }[value] || 'default'
}

function isProcessingStatus(value) {
  return value === 'processing'
}

function isTerminalStatus(value) {
  return ['recognized', 'validated', 'imported', 'failed'].includes(value)
}

function riskLabel(value) {
  return { ok: '正常', warning: '警告', error: '错误' }[value] || value || '-'
}

function riskColor(value) {
  return { ok: 'green', warning: 'orange', error: 'red' }[value] || 'default'
}

function issueColor(value) {
  return { info: 'blue', warning: 'orange', error: 'red' }[value] || 'orange'
}

defineExpose({ open })
</script>

<style lang="less" scoped>
.ocr-import-drawer {
  .mb-16 {
    margin-bottom: 16px;
  }

  .mt-12 {
    margin-top: 12px;
  }

  .mt-16 {
    margin-top: 16px;
  }

  .action-row {
    margin-top: 12px;
  }

  .advanced-options {
    margin-top: 12px;
  }

  :deep(.ant-upload-drag-icon) {
    color: #1677ff;
    font-size: 32px;
  }
}
</style>
