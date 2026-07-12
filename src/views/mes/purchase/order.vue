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
        <a-button type="primary" @click="openAdd" v-hasPermi="['mes:purchaseOrder:add']">新增采购订单</a-button>
        <a-button :disabled="selectedRowKeys.length !== 1" @click="openEditById(selectedRows[0])" v-hasPermi="['mes:purchaseOrder:edit']">修改</a-button>
        <a-button danger :disabled="!selectedRowKeys.length" @click="handleDelete(selectedRowKeys)" v-hasPermi="['mes:purchaseOrder:remove']">删除</a-button>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <dict-tag :options="statusDict" :value="record.status" />
        </template>
        <template v-else-if="column.key === 'billType'">
          <dict-tag :options="billTypeDict" :value="record.billType" />
        </template>
        <a-space v-else-if="column.key === 'action'">
          <a v-if="record.status === 'DRAFT'" v-hasPermi="['mes:purchaseOrder:edit']" @click="openEdit(record)">编辑</a>
          <a v-if="record.status === 'DRAFT'" v-hasPermi="['mes:purchaseOrder:approve']" @click="approve(record)">审核</a>
          <a v-if="record.status === 'APPROVED'" v-hasPermi="['mes:purchaseOrder:unapprove']" @click="unapprove(record)">弃审</a>
          <a v-hasPermi="['mes:purchaseOrder:query']" @click="openDetail(record)">详情</a>
        </a-space>
      </template>
    </ProTable>

    <!-- 新增/编辑弹窗 -->
    <a-modal v-model:open="formOpen" :title="editing ? '编辑采购订单' : '新增采购订单'" width="980px" @ok="save">
      <a-form ref="formRef" :model="form" :rules="formRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="订单编号" name="orderCode">
              <a-input v-model:value="form.orderCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="供应商" name="supplierId">
              <SupplierPicker v-model="form.supplierId" :label="supplierLabel" @select="onSupplierSelect" placeholder="请选择供应商" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="订单日期" name="orderDate">
              <a-date-picker v-model:value="form.orderDate" value-format="YYYY-MM-DD" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="预计到货日期">
              <a-date-picker v-model:value="form.expectedDate" value-format="YYYY-MM-DD" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态" name="status">
              <a-select v-model:value="form.status" :options="statusOptions" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="币种">
              <a-input v-model:value="form.currency" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <a-divider>采购明细</a-divider>
      <a-button type="dashed" block @click="addLine">+ 添加物料</a-button>
      <a-table :data-source="editLines" :columns="editLineColumns" row-key="_key" :pagination="false" size="small">
        <template #bodyCell="{ column, record, index }">
          <MaterialPicker
            v-if="column.key === 'material'"
            v-model="record.materialId"
            :label="materialLabel(record)"
            placeholder="请选择物料"
            @select="(m) => selectMaterial(record, m)"
          />
          <span v-else-if="column.key === 'materialCode'">{{ record.materialCode || '-' }}</span>
          <span v-else-if="column.key === 'materialName'">{{ record.materialName || '-' }}</span>
          <a-input v-else-if="column.key === 'unit'" v-model:value="record.unit" placeholder="单位" />
          <a-input-number v-else-if="column.key === 'orderQuantity'" v-model:value="record.orderQuantity" :min="0" style="width:100%" />
          <a-input-number v-else-if="column.key === 'unitPrice'" v-model:value="record.unitPrice" :min="0" style="width:100%" />
          <a v-else-if="column.key === 'action'" @click="editLines.splice(index, 1)">删除</a>
        </template>
      </a-table>
    </a-modal>

    <!-- 详情抽屉 -->
    <a-drawer v-model:open="detailOpen" title="采购订单详情" width="760px">
      <a-descriptions bordered :column="1">
        <a-descriptions-item label="订单编号">{{ detail.orderCode ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="供应商">{{ detail.supplierName ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="订单日期">{{ detail.orderDate ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="预计到货日期">{{ detail.expectedDate ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="状态"><dict-tag :options="statusDict" :value="detail.status" /></a-descriptions-item>
        <a-descriptions-item label="总数量">{{ detail.totalQuantity ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="总金额">{{ detail.totalAmount ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="币种">{{ detail.currency ?? '-' }}</a-descriptions-item>
      </a-descriptions>
      <a-divider v-if="detail.lines">明细</a-divider>
      <a-table v-if="detail.lines" :data-source="detail.lines" :columns="lineColumns" row-key="id" :pagination="false" size="small" />
    </a-drawer>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import ProTable from '@/components/BearJiaProTable/index.vue'
import DictTag from '@/components/DictTag/index.vue'
import MaterialPicker from '@/components/MaterialPicker.vue'
import SupplierPicker from '@/components/SupplierPicker.vue'
import { useDict } from '@/composables/useDict'
import { purchaseOrderApi, approvePurchaseOrder, unapprovePurchaseOrder } from '@/api/mes/purchase/order'

const { mes_purchase_status: statusDict, mes_purchase_order_bill_type: billTypeDict } = useDict('mes_purchase_status', 'mes_purchase_order_bill_type')

const proTableRef = ref()
const formRef = ref()
const formOpen = ref(false)
const detailOpen = ref(false)
const editing = ref(false)
const detail = ref({})
const editLines = ref([])
const form = reactive({})

const tableApi = { list: purchaseOrderApi.list, delete: purchaseOrderApi.remove }

const searchFields = [
  { name: 'orderCode', label: '订单编号', type: 'input' },
  { name: 'supplierName', label: '供应商', type: 'input' },
  { name: 'status', label: '状态', type: 'select', options: [
    { value: 'DRAFT', label: '草稿' },
    { value: 'APPROVED', label: '已审核' },
  ]},
]

const statusOptions = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'APPROVED', label: '已审核' },
]

const columns = [
  { title: '订单编号', dataIndex: 'orderCode', key: 'orderCode', width: 150 },
  { title: '供应商', dataIndex: 'supplierName', key: 'supplierName', width: 150 },
  { title: '订单日期', dataIndex: 'orderDate', key: 'orderDate', width: 120 },
  { title: '预计到货日期', dataIndex: 'expectedDate', key: 'expectedDate', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '总数量', dataIndex: 'totalQuantity', key: 'totalQuantity', width: 100 },
  { title: '总金额', dataIndex: 'totalAmount', key: 'totalAmount', width: 120 },
  { title: '单据类型', dataIndex: 'billType', key: 'billType', width: 90 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
]

const lineColumns = [
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '采购数量', dataIndex: 'orderQuantity' },
  { title: '已到货', dataIndex: 'receivedQuantity' },
  { title: '已合格', dataIndex: 'qualifiedQuantity' },
  { title: '已入库', dataIndex: 'inboundQuantity' },
  { title: '单位', dataIndex: 'unit' },
]

const editLineColumns = [
  { title: '物料', key: 'material', width: 220 },
  { title: '物料编码', key: 'materialCode' },
  { title: '物料名称', key: 'materialName' },
  { title: '单位', key: 'unit', width: 90 },
  { title: '采购数量', key: 'orderQuantity', width: 110 },
  { title: '含税单价', key: 'unitPrice', width: 110 },
  { title: '操作', key: 'action', width: 60 },
]

const formRules = {
  orderCode: [{ required: true, message: '请输入订单编号', trigger: 'blur' }],
  supplierId: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  orderDate: [{ required: true, message: '请选择订单日期', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

// ==================== 新增/编辑 ====================
function openAdd() {
  editing.value = false
  Object.keys(form).forEach(k => delete form[k])
  form.orderCode = ''
  form.supplierId = null
  form.supplierCode = ''
  form.supplierName = ''
  form.orderDate = new Date().toISOString().slice(0, 10)
  form.expectedDate = ''
  form.status = 'DRAFT'
  form.currency = 'CNY'
  form.billType = 'NORMAL'
  editLines.value = []
  formOpen.value = true
}

function openEditById(row) {
  openEdit(row)
}

const supplierLabel = computed(() =>
  form.supplierCode ? `${form.supplierCode} ${form.supplierName}` : ''
)

function onSupplierSelect(s) {
  if (s) { form.supplierCode = s.supplierCode; form.supplierName = s.supplierName }
  else { form.supplierCode = ''; form.supplierName = '' }
}

async function openEdit(row) {
  editing.value = true
  const result = await purchaseOrderApi.get(row.id)
  Object.assign(form, result.data || row)
  editLines.value = (result.data?.lines || []).map((line, i) => ({ ...line, _key: line.id || `new-${i}` }))
  formOpen.value = true
}

function addLine() {
  editLines.value.push({
    _key: `new-${Date.now()}`,
    materialId: null, materialCode: '', materialName: '', unit: '',
    orderQuantity: null, unitPrice: 0,
  })
}

function materialLabel(line) {
  return line.materialCode ? `${line.materialCode} ${line.materialName || ''}` : ''
}

function selectMaterial(line, material) {
  if (!material) { line.materialCode = ''; line.materialName = ''; line.spec = ''; line.unit = ''; return }
  line.materialCode = material.materialCode || ''
  line.materialName = material.materialName || ''
  line.spec = material.spec || ''
  line.unit = material.unit || ''
}

async function save() {
  try { await formRef.value.validate() } catch { return }
  if (!editLines.value.length) { message.error('采购订单至少需要一条明细'); return }
  const invalid = editLines.value.find(l =>
    !l.materialId || !String(l.materialCode || '').trim() || !String(l.materialName || '').trim() ||
    !String(l.unit || '').trim() || Number(l.orderQuantity) <= 0 || Number(l.unitPrice) < 0
  )
  if (invalid) { message.error('请完整填写每条采购明细：物料、单位、采购数量和单价'); return }

  const payload = { ...form }
  payload.lines = editLines.value.map(({ _key, ...l }, i) => ({ ...l, lineNo: i + 1 }))
  payload.totalQuantity = payload.lines.reduce((s, l) => s + Number(l.orderQuantity || 0), 0)
  payload.totalAmount = payload.lines.reduce((s, l) => s + Number(l.orderQuantity || 0) * Number(l.unitPrice || 0), 0)

  await (editing.value ? purchaseOrderApi.update(payload) : purchaseOrderApi.add(payload))
  message.success('保存成功')
  formOpen.value = false
  proTableRef.value?.refresh()
}

// ==================== 详情 ====================
async function openDetail(row) {
  const result = await purchaseOrderApi.get(row.id)
  detail.value = result.data || row
  detailOpen.value = true
}

// ==================== 操作 ====================
async function handleDelete(ids) {
  await purchaseOrderApi.remove(ids.join(','))
  message.success('删除成功')
  proTableRef.value?.refresh()
}

async function approve(record) {
  await approvePurchaseOrder(record.id)
  message.success('审核成功')
  proTableRef.value?.refresh()
}

async function unapprove(record) {
  await unapprovePurchaseOrder(record.id)
  message.success('弃审成功')
  proTableRef.value?.refresh()
}
</script>
