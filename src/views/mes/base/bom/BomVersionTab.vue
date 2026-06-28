<template>
  <div>
    <div class="tab-actions">
      <a-space>
        <a-button v-hasPermi="['mes:bomVersion:add']" type="primary" @click="openAddModal">
          <BearJiaIcon icon="plus-outlined" />新增版本
        </a-button>
        <a-button v-hasPermi="['mes:bomVersion:add']" :disabled="!selectedRowKeys.length" @click="openCopyModal">复制版本</a-button>
        <a-button v-hasPermi="['mes:bomVersion:remove']" :disabled="!selectedRowKeys.length" danger @click="handleDelete">删除</a-button>
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
            <a @click="openUpdateModal(record)" v-hasPermi="['mes:bomVersion:edit']">编辑</a>
            <a-popconfirm v-if="getVersionRowActions(record).includes('delete')" title="确认删除?" @confirm="handleDeleteSingle(record)">
              <a class="danger-text">删除</a>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <BomVersionAddUpdateModal ref="versionModalRef" :bomMasterId="bomMasterId" @refresh="loadData" />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { listBomVersion, updateBomVersion, delBomVersion } from '@/api/mes/base'
import BomVersionAddUpdateModal from './BomVersionAddUpdateModal.vue'
import { BearJiaIcon } from '@/utils/BearJiaIcon.js'
import { getVersionActionPayload, getVersionRowActions } from './bomVersionActions.js'

const props = defineProps({ bomMasterId: { type: Number, required: true } })

const loading = ref(false)
const tableData = ref([])
const selectedRowKeys = ref([])
const versionModalRef = ref()

const statusLabel = { DRAFT: '草稿', EFFECTIVE: '生效', FROZEN: '冻结' }
const statusColor = { DRAFT: 'default', EFFECTIVE: 'green', FROZEN: 'orange' }
const approveLabel = { PENDING: '待审批', APPROVED: '已审批', REJECTED: '驳回' }
const approveColor = { PENDING: 'processing', APPROVED: 'green', REJECTED: 'red' }

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
