<template>
  <div>
    <ProTable
      ref="proTableRef"
      :api="tableApi"
      :columns="columns"
      :searchFields="searchFields"
      rowKey="id"
    >
      <template #actions="{ selectedRowKeys, selectedRows }">
        <a-button type="primary" @click="openAdd" v-hasPermi="['mes:purchaseInbound:add']">新增入库单</a-button>
        <a-button type="primary" ghost @click="openReference" v-hasPermi="['mes:purchaseInbound:reference']">参照送货单</a-button>
        <a-button :disabled="selectedRowKeys.length !== 1" @click="openEditById(selectedRows[0])" v-hasPermi="['mes:purchaseInbound:edit']">修改</a-button>
        <a-button danger :disabled="!selectedRowKeys.length" @click="handleDelete(selectedRowKeys)" v-hasPermi="['mes:purchaseInbound:remove']">删除</a-button>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <dict-tag :options="statusDict" :value="record.status" />
        </template>
        <template v-else-if="column.key === 'billType'">
          <dict-tag :options="billTypeDict" :value="record.billType" />
        </template>
        <a-space v-else-if="column.key === 'action'">
          <a v-if="record.status === 'DRAFT'" v-hasPermi="['mes:purchaseInbound:edit']" @click="openEdit(record)">编辑</a>
          <a v-if="record.status === 'DRAFT'" v-hasPermi="['mes:purchaseInbound:approve']" @click="approve(record)">审核</a>
          <a v-if="record.status === 'APPROVED'" v-hasPermi="['mes:purchaseInbound:unapprove']" @click="unapprove(record)">弃审</a>
          <a v-hasPermi="['mes:purchaseInbound:query']" @click="openDetail(record)">详情</a>
        </a-space>
      </template>
    </ProTable>

    <!-- 新增/编辑弹窗 -->
    <a-modal v-model:open="formOpen" :title="editing ? '编辑入库单' : '新增入库单'" width="980px" @ok="save">
      <a-form ref="formRef" :model="form" :rules="formRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="入库单号" name="inboundCode">
              <a-input v-model:value="form.inboundCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="入库日期" name="inboundDate">
              <a-date-picker v-model:value="form.inboundDate" value-format="YYYY-MM-DD" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="入库仓库" name="warehouseId">
              <WarehousePicker v-model="form.warehouseId" :label="warehouseLabel" @select="onWarehouseSelect" placeholder="请选择仓库" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态" name="status">
              <a-select v-model:value="form.status" :options="statusOptions" disabled />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <a-divider>入库明细</a-divider>
      <a-table :data-source="editLines" :columns="editLineColumns" row-key="_key" :pagination="false" size="small">
        <template #bodyCell="{ column, record }">
          <a-input-number v-if="column.key === 'inboundQuantity'" v-model:value="record.inboundQuantity" :min="0.000001" :max="record.remainingQuantity" style="width:100%" />
          <span v-else-if="column.key === 'remainingQuantity'">{{ record.remainingQuantity }}</span>
        </template>
      </a-table>
    </a-modal>

    <!-- 详情抽屉 -->
    <a-drawer v-model:open="detailOpen" title="入库单详情" width="760px">
      <a-descriptions bordered :column="1">
        <a-descriptions-item label="入库单号">{{ detail.inboundCode ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="入库日期">{{ detail.inboundDate ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="入库仓库">{{ detail.warehouseCode ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="状态"><dict-tag :options="statusDict" :value="detail.status" /></a-descriptions-item>
        <a-descriptions-item label="入库总数量">{{ detail.totalQuantity ?? '-' }}</a-descriptions-item>
      </a-descriptions>
      <a-divider v-if="detail.lines">明细</a-divider>
      <a-table v-if="detail.lines" :data-source="detail.lines" :columns="lineColumns" row-key="id" :pagination="false" size="small" />
    </a-drawer>

    <!-- 参照送货单弹窗 -->
    <a-modal v-model:open="referenceOpen" title="参照送货单" width="1100px" @ok="confirmReference">
      <a-space class="mb16">
        <a-input v-model:value="refQuery.receiptCode" placeholder="到货单号" allow-clear @pressEnter="loadReference" />
        <a-input v-model:value="refQuery.warehouseCode" placeholder="仓库编码" allow-clear @pressEnter="loadReference" />
        <a-input v-model:value="refQuery.materialCode" placeholder="物料编码" allow-clear @pressEnter="loadReference" />
        <a-button type="primary" @click="loadReference">查询</a-button>
        <a-button @click="resetRefQuery">重置</a-button>
      </a-space>
      <a-table :data-source="refRows" :columns="refColumns" row-key="_refKey" :loading="refLoading" :pagination="false"
        :row-selection="{ selectedRowKeys: refSelected, onChange: (keys) => (refSelected = keys) }" />
    </a-modal>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import ProTable from '@/components/BearJiaProTable/index.vue'
import DictTag from '@/components/DictTag/index.vue'
import WarehousePicker from '@/components/WarehousePicker.vue'
import { useDict } from '@/composables/useDict'
import { purchaseInboundApi, approvePurchaseInbound, unapprovePurchaseInbound, listInboundReferenceLines } from '@/api/mes/purchase/inbound'

const { mes_purchase_status: statusDict, mes_purchase_inbound_bill_type: billTypeDict } = useDict('mes_purchase_status', 'mes_purchase_inbound_bill_type')

const proTableRef = ref()
const formRef = ref()
const formOpen = ref(false)
const detailOpen = ref(false)
const referenceOpen = ref(false)
const refLoading = ref(false)
const refRows = ref([])
const refSelected = ref([])
const editing = ref(false)
const detail = ref({})
const editLines = ref([])
const form = reactive({})
const refQuery = reactive({ receiptCode: '', warehouseCode: '', materialCode: '' })

const warehouseLabel = computed(() =>
  form.warehouseCode ? `${form.warehouseCode} ${form.warehouseName || ''}` : ''
)

function onWarehouseSelect(w) {
  if (w) { form.warehouseCode = w.warehouseCode; form.warehouseName = w.warehouseName }
  else { form.warehouseCode = ''; form.warehouseName = '' }
}

const tableApi = { list: purchaseInboundApi.list, delete: purchaseInboundApi.remove }

const searchFields = [
  { name: 'inboundCode', label: '入库单号', type: 'input' },
  { name: 'warehouseCode', label: '仓库编码', type: 'input' },
  { name: 'status', label: '状态', type: 'select', options: [
    { value: 'DRAFT', label: '草稿' }, { value: 'APPROVED', label: '已审核' },
  ]},
]

const statusOptions = [
  { value: 'DRAFT', label: '草稿' }, { value: 'APPROVED', label: '已审核' },
]

const columns = [
  { title: '入库单号', dataIndex: 'inboundCode', key: 'inboundCode', width: 150 },
  { title: '入库日期', dataIndex: 'inboundDate', key: 'inboundDate', width: 120 },
  { title: '入库仓库', dataIndex: 'warehouseCode', key: 'warehouseCode', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '入库总数量', dataIndex: 'totalQuantity', key: 'totalQuantity', width: 100 },
  { title: '单据类型', dataIndex: 'billType', key: 'billType', width: 90 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
]

const lineColumns = [
  { title: '来源到货单', dataIndex: 'sourceReceiptCode' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '入库数量', dataIndex: 'inboundQuantity' },
  { title: '仓库', dataIndex: 'warehouseCode' },
  { title: '单位', dataIndex: 'unit' },
]

const editLineColumns = [
  { title: '来源送货单', dataIndex: 'sourceReceiptCode' },
  { title: '来源订单', dataIndex: 'sourceOrderCode' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '可入库数量', key: 'remainingQuantity' },
  { title: '本次入库数量', key: 'inboundQuantity', width: 150 },
  { title: '单位', dataIndex: 'unit' },
]

const refColumns = [
  { title: '送货单', dataIndex: 'sourceReceiptCode' },
  { title: '采购订单', dataIndex: 'sourceOrderCode' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '剩余可入库', dataIndex: 'remainingQuantity' },
  { title: '仓库', dataIndex: 'warehouseCode' },
  { title: '单位', dataIndex: 'unit' },
]

const formRules = {
  inboundCode: [{ required: true, message: '请输入入库单号', trigger: 'blur' }],
  inboundDate: [{ required: true, message: '请选择入库日期', trigger: 'change' }],
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

// ==================== 新增/编辑 ====================
function openAdd() {
  editing.value = false
  Object.keys(form).forEach(k => delete form[k])
  form.inboundCode = ''; form.inboundDate = new Date().toISOString().slice(0, 10)
  form.warehouseId = null
  form.warehouseCode = ''
  form.warehouseName = ''
  form.status = 'DRAFT'
  form.billType = 'DIRECT'
  editLines.value = []
  formOpen.value = true
}

function openEditById(row) { openEdit(row) }

async function openEdit(row) {
  editing.value = true
  const result = await purchaseInboundApi.get(row.id)
  Object.assign(form, result.data || row)
  editLines.value = (result.data?.lines || []).map((line, i) => ({
    ...line, _key: line.id || `new-${i}`, remainingQuantity: line.inboundQuantity,
  }))
  formOpen.value = true
}

async function save() {
  try { await formRef.value.validate() } catch { return }
  if (!editLines.value.length) { message.error('请先通过参照功能选择来源明细'); return }
  const invalid = editLines.value.find(l =>
    Number(l.inboundQuantity) <= 0 || Number(l.inboundQuantity) > Number(l.remainingQuantity)
  )
  if (invalid) { message.error('入库数量必须大于0且不能超过合格未入库数量'); return }

  const payload = { ...form }
  payload.lines = editLines.value.map(({ _key, remainingQuantity, ...l }, i) => ({ ...l, lineNo: i + 1 }))
  payload.totalQuantity = payload.lines.reduce((s, l) => s + Number(l.inboundQuantity || 0), 0)

  await (editing.value ? purchaseInboundApi.update(payload) : purchaseInboundApi.add(payload))
  message.success('保存成功')
  formOpen.value = false
  proTableRef.value?.refresh()
}

// ==================== 详情 ====================
async function openDetail(row) {
  const result = await purchaseInboundApi.get(row.id)
  detail.value = result.data || row
  detailOpen.value = true
}

// ==================== 操作 ====================
async function handleDelete(ids) {
  await purchaseInboundApi.remove(ids.join(','))
  message.success('删除成功')
  proTableRef.value?.refresh()
}

async function approve(r) { await approvePurchaseInbound(r.id); message.success('审核成功'); proTableRef.value?.refresh() }
async function unapprove(r) { await unapprovePurchaseInbound(r.id); message.success('弃审成功'); proTableRef.value?.refresh() }

// ==================== 参照 ====================
async function openReference() {
  Object.keys(refQuery).forEach(k => (refQuery[k] = ''))
  refSelected.value = []
  referenceOpen.value = true
  await loadReference()
}

async function loadReference() {
  refLoading.value = true
  try {
    const result = await listInboundReferenceLines(refQuery)
    refRows.value = (result.data || []).map((row, i) => ({ ...row, _refKey: `r-${row.sourceReceiptLineId}-${i}` }))
  } finally { refLoading.value = false }
}

function resetRefQuery() { Object.keys(refQuery).forEach(k => (refQuery[k] = '')); loadReference() }

function confirmReference() {
  const selected = refRows.value.filter(r => refSelected.value.includes(r._refKey))
  if (!selected.length) { message.error('请选择至少一条来源明细'); return }
  const warehouses = new Set(selected.map(r => r.warehouseCode))
  if (warehouses.size > 1) { message.error('一张入库单只能参照同一仓库的送货明细'); return }
  openAdd()
  form.warehouseCode = selected[0].warehouseCode
  form.warehouseName = selected[0].warehouseName
  form.billType = 'RECEIPT'
  editLines.value = selected.map((row, i) => ({
    ...row, _key: row._refKey, lineNo: i + 1, inboundQuantity: row.remainingQuantity,
  }))
  referenceOpen.value = false
}
</script>

<style scoped>
.mb16 { display: flex; margin-bottom: 16px; }
</style>
