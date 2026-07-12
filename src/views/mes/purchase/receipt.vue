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
        <a-button type="primary" @click="openAdd" v-hasPermi="['mes:purchaseReceipt:add']">新增到货单</a-button>
        <a-button type="primary" ghost @click="openReference" v-hasPermi="['mes:purchaseReceipt:reference']">参照采购订单</a-button>
        <a-button :disabled="selectedRowKeys.length !== 1" @click="openEditById(selectedRows[0])" v-hasPermi="['mes:purchaseReceipt:edit']">修改</a-button>
        <a-button danger :disabled="!selectedRowKeys.length" @click="handleDelete(selectedRowKeys)" v-hasPermi="['mes:purchaseReceipt:remove']">删除</a-button>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <dict-tag :options="statusDict" :value="record.status" />
        </template>
        <template v-else-if="column.key === 'inspectionStatus'">
          <dict-tag :options="inspectionStatusDict" :value="record.inspectionStatus" />
        </template>
        <template v-else-if="column.key === 'billType'">
          <dict-tag :options="billTypeDict" :value="record.billType" />
        </template>
        <a-space v-else-if="column.key === 'action'">
          <a v-if="record.status === 'DRAFT'" v-hasPermi="['mes:purchaseReceipt:edit']" @click="openEdit(record)">编辑</a>
          <a v-if="record.status === 'DRAFT'" v-hasPermi="['mes:purchaseReceipt:approve']" @click="approve(record)">审核</a>
          <a v-if="record.status === 'APPROVED'" v-hasPermi="['mes:purchaseReceipt:unapprove']" @click="unapprove(record)">弃审</a>
          <a v-if="record.status === 'APPROVED' && record.inspectionStatus === 'PENDING'" v-hasPermi="['mes:purchaseReceipt:inspect']" @click="openInspection(record)">质检</a>
          <a v-if="record.status === 'APPROVED' && record.inspectionStatus !== 'PENDING'" v-hasPermi="['mes:purchaseReceipt:uninspect']" @click="uninspect(record)">反质检</a>
          <a v-hasPermi="['mes:purchaseReceipt:query']" @click="openDetail(record)">详情</a>
        </a-space>
      </template>
    </ProTable>

    <!-- 新增/编辑弹窗 -->
    <a-modal v-model:open="formOpen" :title="editing ? '编辑到货单' : '新增到货单'" width="980px" @ok="save">
      <a-form ref="formRef" :model="form" :rules="formRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="到货单号" name="receiptCode">
              <a-input v-model:value="form.receiptCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="供应商" name="supplierCode">
              <SupplierPicker v-model="form.supplierId" :label="supplierLabel" @select="onSupplierSelect" :disabled="isReference" placeholder="请选择供应商" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="到货日期" name="receiptDate">
              <a-date-picker v-model:value="form.receiptDate" value-format="YYYY-MM-DD" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态" name="status">
              <a-select v-model:value="form.status" :options="statusOptions" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="检验状态" name="inspectionStatus">
              <a-select v-model:value="form.inspectionStatus" :options="inspectionStatusOptions" disabled />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <a-divider>送货明细</a-divider>
      <a-table :data-source="editLines" :columns="editLineColumns" row-key="_key" :pagination="false" size="small">
        <template #bodyCell="{ column, record }">
          <a-input-number v-if="column.key === 'receivedQuantity'" v-model:value="record.receivedQuantity" :min="0.000001" :max="record.remainingQuantity" style="width:100%" />
          <WarehousePicker v-else-if="column.key === 'warehouseCode'" v-model="record.warehouseId" :label="wareLabel(record)" @select="(w) => onLineWareSelect(record, w)" />
          <span v-else-if="column.key === 'remainingQuantity'">{{ record.remainingQuantity }}</span>
        </template>
      </a-table>
    </a-modal>

    <!-- 详情抽屉 -->
    <a-drawer v-model:open="detailOpen" title="到货单详情" width="760px">
      <a-descriptions bordered :column="1">
        <a-descriptions-item label="到货单号">{{ detail.receiptCode ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="供应商">{{ detail.supplierName ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="到货日期">{{ detail.receiptDate ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="状态"><dict-tag :options="statusDict" :value="detail.status" /></a-descriptions-item>
        <a-descriptions-item label="检验状态"><dict-tag :options="inspectionStatusDict" :value="detail.inspectionStatus" /></a-descriptions-item>
        <a-descriptions-item label="到货总数量">{{ detail.totalQuantity ?? '-' }}</a-descriptions-item>
      </a-descriptions>
      <a-divider v-if="detail.lines">明细</a-divider>
      <a-table v-if="detail.lines" :data-source="detail.lines" :columns="lineColumns" row-key="id" :pagination="false" size="small" />
    </a-drawer>

    <!-- 参照采购订单弹窗 -->
    <a-modal v-model:open="referenceOpen" title="参照采购订单" width="1100px" @ok="confirmReference">
      <a-space class="mb16">
        <a-input v-model:value="refQuery.orderCode" placeholder="采购订单号" allow-clear @pressEnter="loadReference" />
        <a-input v-model:value="refQuery.supplierName" placeholder="供应商名称" allow-clear @pressEnter="loadReference" />
        <a-input v-model:value="refQuery.materialCode" placeholder="物料编码" allow-clear @pressEnter="loadReference" />
        <a-button type="primary" @click="loadReference">查询</a-button>
        <a-button @click="resetRefQuery">重置</a-button>
      </a-space>
      <a-table :data-source="refRows" :columns="refColumns" row-key="_refKey" :loading="refLoading" :pagination="false"
        :row-selection="{ selectedRowKeys: refSelected, onChange: (keys) => (refSelected = keys) }" />
    </a-modal>

    <!-- 质检弹窗 -->
    <a-modal v-model:open="inspectionOpen" title="送货单质检" width="760px" @ok="submitInspection">
      <a-alert message="合格数量与不合格数量之和必须等于到货数量。" type="info" show-icon style="margin-bottom:12px" />
      <a-table :data-source="inspectionLines" :columns="inspectionColumns" row-key="receiptLineId" :pagination="false">
        <template #bodyCell="{ column, record }">
          <a-input-number v-if="column.key === 'qualifiedQuantity' || column.key === 'rejectedQuantity'"
            v-model:value="record[column.key]" :min="0" :max="record.receivedQuantity" style="width:100%" />
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import ProTable from '@/components/BearJiaProTable/index.vue'
import DictTag from '@/components/DictTag/index.vue'
import SupplierPicker from '@/components/SupplierPicker.vue'
import WarehousePicker from '@/components/WarehousePicker.vue'
import { useDict } from '@/composables/useDict'
import {
  purchaseReceiptApi, approvePurchaseReceipt, unapprovePurchaseReceipt,
  inspectPurchaseReceipt, uninspectPurchaseReceipt, listReceiptReferenceLines,
} from '@/api/mes/purchase/receipt'

const { mes_purchase_status: statusDict, mes_receipt_inspection_status: inspectionStatusDict, mes_purchase_receipt_bill_type: billTypeDict } = useDict('mes_purchase_status', 'mes_receipt_inspection_status', 'mes_purchase_receipt_bill_type')

const proTableRef = ref()
const formRef = ref()
const formOpen = ref(false)
const detailOpen = ref(false)
const referenceOpen = ref(false)
const refLoading = ref(false)
const refRows = ref([])
const refSelected = ref([])
const inspectionOpen = ref(false)
const inspectionReceiptId = ref()
const inspectionLines = ref([])
const editing = ref(false)
const isReference = ref(false)
const detail = ref({})
const editLines = ref([])
const form = reactive({})
const refQuery = reactive({ orderCode: '', supplierName: '', materialCode: '' })

const supplierLabel = computed(() =>
  form.supplierCode ? `${form.supplierCode} ${form.supplierName}` : ''
)

function onSupplierSelect(s) {
  if (s) { form.supplierCode = s.supplierCode; form.supplierName = s.supplierName }
  else { form.supplierCode = ''; form.supplierName = '' }
}

const tableApi = { list: purchaseReceiptApi.list, delete: purchaseReceiptApi.remove }

const searchFields = [
  { name: 'receiptCode', label: '到货单号', type: 'input' },
  { name: 'supplierName', label: '供应商', type: 'input' },
  { name: 'status', label: '状态', type: 'select', options: [
    { value: 'DRAFT', label: '草稿' }, { value: 'APPROVED', label: '已审核' },
  ]},
  { name: 'inspectionStatus', label: '检验状态', type: 'select', options: [
    { value: 'PENDING', label: '待检' }, { value: 'PASSED', label: '合格' },
    { value: 'PARTIAL', label: '部分合格' }, { value: 'FAILED', label: '不合格' },
  ]},
]

const statusOptions = [
  { value: 'DRAFT', label: '草稿' }, { value: 'APPROVED', label: '已审核' },
]
const inspectionStatusOptions = [
  { value: 'PENDING', label: '待检' }, { value: 'PASSED', label: '合格' },
  { value: 'PARTIAL', label: '部分合格' }, { value: 'FAILED', label: '不合格' },
]

const columns = [
  { title: '到货单号', dataIndex: 'receiptCode', key: 'receiptCode', width: 150 },
  { title: '供应商', dataIndex: 'supplierName', key: 'supplierName', width: 150 },
  { title: '到货日期', dataIndex: 'receiptDate', key: 'receiptDate', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '检验状态', dataIndex: 'inspectionStatus', key: 'inspectionStatus', width: 100 },
  { title: '到货总数量', dataIndex: 'totalQuantity', key: 'totalQuantity', width: 100 },
  { title: '单据类型', dataIndex: 'billType', key: 'billType', width: 90 },
  { title: '操作', key: 'action', width: 260, fixed: 'right' },
]

const lineColumns = [
  { title: '来源订单', dataIndex: 'sourceOrderCode' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '到货数量', dataIndex: 'receivedQuantity' },
  { title: '合格数量', dataIndex: 'qualifiedQuantity' },
  { title: '不合格数量', dataIndex: 'rejectedQuantity' },
  { title: '仓库', dataIndex: 'warehouseCode' },
  { title: '单位', dataIndex: 'unit' },
]

const editLineColumns = [
  { title: '来源订单', dataIndex: 'sourceOrderCode' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '可到货数量', key: 'remainingQuantity' },
  { title: '本次到货数量', key: 'receivedQuantity', width: 150 },
  { title: '入库仓库', key: 'warehouseCode', width: 150 },
  { title: '单位', dataIndex: 'unit' },
]

const refColumns = [
  { title: '采购订单', dataIndex: 'sourceOrderCode' },
  { title: '供应商', dataIndex: 'supplierName' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '剩余可到货', dataIndex: 'remainingQuantity' },
  { title: '单位', dataIndex: 'unit' },
]

const inspectionColumns = [
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '到货数量', dataIndex: 'receivedQuantity' },
  { title: '合格数量', key: 'qualifiedQuantity' },
  { title: '不合格数量', key: 'rejectedQuantity' },
  { title: '单位', dataIndex: 'unit' },
]

const formRules = {
  receiptCode: [{ required: true, message: '请输入到货单号', trigger: 'blur' }],
  supplierCode: [{ required: true, message: '请选择供应商', trigger: 'change', validator: (_r, v) => v ? Promise.resolve() : Promise.reject('请选择供应商') }],
  receiptDate: [{ required: true, message: '请选择到货日期', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  inspectionStatus: [{ required: true, message: '请选择检验状态', trigger: 'change' }],
}

// ==================== 新增/编辑 ====================
function openAdd() {
  editing.value = false
  isReference.value = false
  Object.keys(form).forEach(k => delete form[k])
  form.receiptCode = '';
  form.supplierId = null
  form.supplierCode = ''
  form.supplierName = ''
  form.receiptDate = new Date().toISOString().slice(0, 10)
  editLines.value = []
  form.status = 'DRAFT'; form.inspectionStatus = 'PENDING'
  form.billType = 'DIRECT'
  editLines.value = []
  formOpen.value = true
}

function openEditById(row) { openEdit(row) }

async function openEdit(row) {
  editing.value = true
  const result = await purchaseReceiptApi.get(row.id)
  Object.assign(form, result.data || row)
  editLines.value = (result.data?.lines || []).map((line, i) => ({
    ...line, _key: line.id || `new-${i}`, remainingQuantity: line.receivedQuantity,
  }))
  formOpen.value = true
}

function wareLabel(line) {
  return line.warehouseCode ? `${line.warehouseCode} ${line.warehouseName || ''}` : ''
}

function onLineWareSelect(line, w) {
  if (w) { line.warehouseCode = w.warehouseCode; line.warehouseName = w.warehouseName }
  else { line.warehouseCode = ''; line.warehouseName = '' }
}

async function save() {
  try { await formRef.value.validate() } catch { return }
  if (!editLines.value.length) { message.error('请先通过参照功能选择来源明细'); return }
  const invalid = editLines.value.find(l =>
    Number(l.receivedQuantity) <= 0 || Number(l.receivedQuantity) > Number(l.remainingQuantity)
  )
  if (invalid) { message.error('到货数量必须大于0且不能超过来源订单剩余数量'); return }

  const payload = { ...form }
  payload.lines = editLines.value.map(({ _key, remainingQuantity, ...l }, i) => ({ ...l, lineNo: i + 1 }))
  payload.totalQuantity = payload.lines.reduce((s, l) => s + Number(l.receivedQuantity || 0), 0)

  await (editing.value ? purchaseReceiptApi.update(payload) : purchaseReceiptApi.add(payload))
  message.success('保存成功')
  formOpen.value = false
  proTableRef.value?.refresh()
}

// ==================== 详情 ====================
async function openDetail(row) {
  const result = await purchaseReceiptApi.get(row.id)
  detail.value = result.data || row
  detailOpen.value = true
}

// ==================== 操作 ====================
async function handleDelete(ids) {
  await purchaseReceiptApi.remove(ids.join(','))
  message.success('删除成功')
  proTableRef.value?.refresh()
}

async function approve(r) { await approvePurchaseReceipt(r.id); message.success('审核成功'); proTableRef.value?.refresh() }
async function unapprove(r) { await unapprovePurchaseReceipt(r.id); message.success('弃审成功'); proTableRef.value?.refresh() }

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
    const result = await listReceiptReferenceLines(refQuery)
    refRows.value = (result.data || []).map(row => ({ ...row, _refKey: `o-${row.sourceOrderLineId}` }))
  } finally { refLoading.value = false }
}

function resetRefQuery() { Object.keys(refQuery).forEach(k => (refQuery[k] = '')); loadReference() }

function confirmReference() {
  const selected = refRows.value.filter(r => refSelected.value.includes(r._refKey))
  if (!selected.length) { message.error('请选择至少一条来源明细'); return }
  const suppliers = new Set(selected.map(r => r.supplierCode || r.supplierName))
  if (suppliers.size > 1) { message.error('一张送货单只能参照同一供应商的订单明细'); return }
  isReference.value = true
  openAdd()
  form.supplierCode = selected[0].supplierCode
  form.supplierName = selected[0].supplierName
  form.billType = 'PURCHASE_ORDER'
  editLines.value = selected.map((row, i) => ({
    ...row, _key: row._refKey, lineNo: i + 1, receivedQuantity: row.remainingQuantity,
    qualifiedQuantity: 0, rejectedQuantity: 0, pendingQuantity: 0, inboundQuantity: 0,
  }))
  referenceOpen.value = false
}

// ==================== 质检 ====================
async function openInspection(record) {
  const result = await purchaseReceiptApi.get(record.id)
  inspectionReceiptId.value = record.id
  inspectionLines.value = (result.data?.lines || []).map(line => ({
    receiptLineId: line.id, materialCode: line.materialCode, materialName: line.materialName,
    unit: line.unit, receivedQuantity: line.receivedQuantity,
    qualifiedQuantity: line.receivedQuantity, rejectedQuantity: 0,
  }))
  inspectionOpen.value = true
}

async function submitInspection() {
  const invalid = inspectionLines.value.find(l =>
    Number(l.qualifiedQuantity) < 0 || Number(l.rejectedQuantity) < 0 ||
    Number(l.qualifiedQuantity) + Number(l.rejectedQuantity) !== Number(l.receivedQuantity)
  )
  if (invalid) { message.error('每条明细的合格数量与不合格数量之和必须等于到货数量'); return }
  await inspectPurchaseReceipt(inspectionReceiptId.value, {
    lines: inspectionLines.value.map(l => ({
      receiptLineId: l.receiptLineId, qualifiedQuantity: l.qualifiedQuantity, rejectedQuantity: l.rejectedQuantity,
    })),
  })
  message.success('质检确认成功')
  inspectionOpen.value = false
  proTableRef.value?.refresh()
}

async function uninspect(record) { await uninspectPurchaseReceipt(record.id); message.success('反质检成功'); proTableRef.value?.refresh() }
</script>

<style scoped>
.mb16 { display: flex; margin-bottom: 16px; }
</style>
