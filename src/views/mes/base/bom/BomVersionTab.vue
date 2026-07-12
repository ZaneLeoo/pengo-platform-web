<template>
  <div>
    <div class="tab-actions">
      <a-space>
        <a-button v-hasPermi="['base:bomVersion:add']" type="primary" @click="openAddModal">
          <BearJiaIcon icon="plus-outlined" />新增版本
        </a-button>
        <a-button v-hasPermi="['base:bomVersion:add']" :disabled="!selectedRowKeys.length" @click="openCopyModal">复制版本</a-button>
        <a-button :disabled="tableData.length < 2" @click="openCompareModal">版本对比</a-button>
        <a-button v-hasPermi="['base:bomVersion:remove']" :disabled="!selectedRowKeys.length" danger @click="handleDelete">删除</a-button>
      </a-space>
      <span class="count-text">共 {{ tableData.length }} 个版本</span>
    </div>

    <a-table
      :columns="columns"
      :data-source="tableData"
      :loading="loading"
      :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
      row-key="id"
      :pagination="false"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'defaultFlag'">
          <a-tag v-if="record.defaultFlag === 1" color="gold">⭐ 默认</a-tag>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="statusColor[record.status]">{{ statusLabel[record.status] || record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'approveStatus'">
          <a-tag :color="approveColor[record.approveStatus]">{{ approveLabel[record.approveStatus] || record.approveStatus }}</a-tag>
        </template>
        <template v-else-if="column.key === 'operate'">
          <a-space>
            <a v-if="getVersionRowActions(record).includes('setDefault')" @click="handleSetDefault(record)">设为默认</a>
            <a-popconfirm v-if="getVersionRowActions(record).includes('activate')" title="确认生效该版本？" @confirm="handleLifecycle(record, 'activate')">
              <a>生效</a>
            </a-popconfirm>
            <a-popconfirm v-if="getVersionRowActions(record).includes('freeze')" title="确认冻结该版本？冻结后不能作为默认版本。" @confirm="handleLifecycle(record, 'freeze')">
              <a>冻结</a>
            </a-popconfirm>
            <a @click="openUpdateModal(record)" v-hasPermi="['base:bomVersion:edit']">编辑</a>
            <a-popconfirm v-if="getVersionRowActions(record).includes('delete')" title="确认删除?" @confirm="handleDeleteSingle(record)">
              <a class="danger-text">删除</a>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <BomVersionAddUpdateModal ref="versionModalRef" :bomMasterId="bomMasterId" @refresh="loadData" />

    <a-modal v-model:open="compareOpen" title="版本对比" width="900px" :footer="null" :destroyOnClose="true">
      <a-space style="margin-bottom:16px" wrap>
        <span>基准版本</span>
        <a-select v-model:value="compareForm.baseVersionId" style="width:220px" :options="compareVersionOptions" />
        <span>目标版本</span>
        <a-select v-model:value="compareForm.targetVersionId" style="width:220px" :options="compareVersionOptions" />
        <a-button type="primary" :loading="compareLoading" @click="handleCompare">对比</a-button>
      </a-space>
      <a-alert
        v-if="compareResult"
        :message="compareSummaryText"
        type="info"
        show-icon
        style="margin-bottom:16px"
      />
      <a-table
        :columns="compareColumns"
        :data-source="compareDifferences"
        :loading="compareLoading"
        row-key="rowKey"
        size="small"
        :pagination="{ pageSize: 8 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'diffType'">
            <a-tag :color="diffColor[record.diffType]">{{ diffLabel[record.diffType] }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { listBomVersion, updateBomVersion, delBomVersion, compareBomVersion } from '@/api/mes/base'
import BomVersionAddUpdateModal from './BomVersionAddUpdateModal.vue'
import { BearJiaIcon } from '@/utils/BearJiaIcon.js'
import { getVersionActionPayload, getVersionRowActions } from './bomVersionActions.js'
import { buildBomVersionCompareSummary } from './bomVersionCompareSummary.js'

const props = defineProps({ bomMasterId: { type: Number, required: true } })

const loading = ref(false)
const tableData = ref([])
const selectedRowKeys = ref([])
const versionModalRef = ref()
const compareOpen = ref(false)
const compareLoading = ref(false)
const compareResult = ref(null)
const compareForm = reactive({ baseVersionId: null, targetVersionId: null })

const statusLabel = { DRAFT: '草稿', EFFECTIVE: '生效', FROZEN: '冻结' }
const statusColor = { DRAFT: 'default', EFFECTIVE: 'green', FROZEN: 'orange' }
const approveLabel = { PENDING: '待审批', APPROVED: '已审批', REJECTED: '驳回' }
const approveColor = { PENDING: 'processing', APPROVED: 'green', REJECTED: 'red' }
const diffLabel = { ADD: '新增', DELETE: '删除', CHANGE: '变更' }
const diffColor = { ADD: 'green', DELETE: 'red', CHANGE: 'blue' }

const columns = [
  { title: '版本号', dataIndex: 'versionCode', key: 'versionCode', width: 100 },
  { title: '版本名称', dataIndex: 'versionName', key: 'versionName', width: 120 },
  { title: '基准数量', dataIndex: 'baseQty', key: 'baseQty', width: 90 },
  { title: '用途', dataIndex: 'usageType', key: 'usageType', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 70 },
  { title: '审批', dataIndex: 'approveStatus', key: 'approveStatus', width: 80 },
  { title: '默认', key: 'defaultFlag', width: 80 },
  { title: '操作', key: 'operate', width: 200, fixed: 'right' },
]

const compareColumns = [
  { title: '差异', key: 'diffType', width: 80 },
  { title: '父件编码', dataIndex: 'parentItemCode', width: 120 },
  { title: '子件编码', dataIndex: 'componentItemCode', width: 120 },
  { title: '子件名称', dataIndex: 'componentItemName', width: 140 },
  { title: '字段', dataIndex: 'fieldLabel', width: 100 },
  { title: '原值', dataIndex: 'baseValue', width: 120 },
  { title: '新值', dataIndex: 'targetValue', width: 120 },
]

const compareVersionOptions = computed(() => tableData.value.map(item => ({
  label: `${item.versionCode} ${item.versionName || ''}`,
  value: item.id
})))
const compareDifferences = computed(() => (compareResult.value?.differences || []).map((item, index) => ({
  ...item,
  rowKey: `${item.diffType}-${item.parentItemCode || ''}-${item.componentItemCode || ''}-${item.fieldName || ''}-${index}`
})))
const compareSummary = computed(() => buildBomVersionCompareSummary(compareResult.value || {}))
const compareSummaryText = computed(() => {
  const summary = compareSummary.value
  if (summary.total === 0) return '两个版本没有发现BOM明细差异'
  return `发现 ${summary.addCount} 个新增、${summary.deleteCount} 个删除、${summary.changeCount} 个字段变更`
})

function loadData() {
  loading.value = true
  listBomVersion({ bomMasterId: props.bomMasterId }).then(res => {
    tableData.value = res.rows || []
  }).finally(() => loading.value = false)
}
loadData()

function onSelectChange(keys) { selectedRowKeys.value = keys }

function openAddModal() { versionModalRef.value?.openAddModal() }
function openCopyModal() {
  versionModalRef.value?.openCopyModal(tableData.value.find(r => r.id === selectedRowKeys.value[0]))
}
function openUpdateModal(record) { versionModalRef.value?.openUpdateModal(record) }
function openCompareModal() {
  compareResult.value = null
  compareForm.baseVersionId = tableData.value[0]?.id || null
  compareForm.targetVersionId = tableData.value[1]?.id || null
  compareOpen.value = true
}

async function handleSetDefault(record) {
  await updateBomVersion({ ...record, defaultFlag: 1 })
  message.success(`已设置 ${record.versionCode} 为默认版本`)
  loadData()
}

async function handleLifecycle(record, action) {
  await updateBomVersion(getVersionActionPayload(record, action))
  message.success(action === 'activate' ? '版本已生效' : '版本已冻结')
  loadData()
}

function handleDeleteSingle(record) { handleDeleteByIds([record.id]) }
function handleDelete() { handleDeleteByIds(selectedRowKeys.value) }

async function handleCompare() {
  if (!compareForm.baseVersionId || !compareForm.targetVersionId) {
    message.warning('请选择两个版本')
    return
  }
  if (compareForm.baseVersionId === compareForm.targetVersionId) {
    message.warning('请选择两个不同版本')
    return
  }
  compareLoading.value = true
  try {
    const res = await compareBomVersion({ ...compareForm })
    compareResult.value = res.data || { differences: [] }
  } finally {
    compareLoading.value = false
  }
}

async function handleDeleteByIds(ids) {
  await delBomVersion(ids.join(','))
  message.success('删除成功')
  selectedRowKeys.value = []
  loadData()
}

defineExpose({ loadData })
</script>

<style lang="less" scoped>
.tab-actions {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.count-text { color: #999; font-size: 13px; }
.danger-text { color: #ff4d4f; }
</style>
