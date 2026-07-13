<template>
  <div>
    <ProTable ref="proTableRef" :api="tableApi" :columns="columns" :searchFields="searchFields" rowKey="id">
      <template #actions="{ selectedRowKeys, selectedRows }">
        <a-button type="primary" @click="openAdd" v-hasPermi="['mes:purchaseQuote:add']">新增报价</a-button>
        <a-button :disabled="selectedRowKeys.length !== 1" @click="openEdit(selectedRows[0])" v-hasPermi="['mes:purchaseQuote:edit']">修改</a-button>
        <a-button danger :disabled="!selectedRowKeys.length" @click="handleDelete(selectedRowKeys)" v-hasPermi="['mes:purchaseQuote:remove']">删除</a-button>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
        </template>
        <a-space v-else-if="column.key === 'action'">
          <a v-if="record.status === 'DRAFT'" v-hasPermi="['mes:purchaseQuote:edit']" @click="openEdit(record)">编辑</a>
          <a v-if="record.status === 'DRAFT'" v-hasPermi="['mes:purchaseQuote:approve']" @click="approve(record)">审核</a>
          <a v-if="record.status === 'APPROVED'" v-hasPermi="['mes:purchaseQuote:unapprove']" @click="unapprove(record)">弃审</a>
          <a v-hasPermi="['mes:purchaseQuote:query']" @click="openDetail(record)">详情</a>
        </a-space>
      </template>
    </ProTable>

    <a-modal v-model:open="formOpen" :title="editing ? '编辑供应商报价' : '新增供应商报价'" width="1120px" @ok="save">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="8"><a-form-item label="报价单号" name="quoteCode"><a-input v-model:value="form.quoteCode" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="供应商" name="supplierId"><SupplierPicker v-model="form.supplierId" :label="supplierLabel" @select="onSupplierSelect" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="报价日期" name="quoteDate"><a-date-picker v-model:value="form.quoteDate" value-format="YYYY-MM-DD" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="生效日期" name="effectiveDate"><a-date-picker v-model:value="form.effectiveDate" value-format="YYYY-MM-DD" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="失效日期"><a-date-picker v-model:value="form.expireDate" value-format="YYYY-MM-DD" style="width:100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="币种" name="currency"><a-input v-model:value="form.currency" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="价格是否含税" name="taxIncluded"><a-select v-model:value="form.taxIncluded" :options="taxOptions" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="来源" name="sourceType"><a-select v-model:value="form.sourceType" :options="sourceOptions" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="来源说明"><a-input v-model:value="form.sourceReference" /></a-form-item></a-col>
        </a-row>
      </a-form>

      <a-divider>报价明细</a-divider>
      <a-button type="dashed" block @click="addLine">+ 添加报价物料</a-button>
      <a-table class="mt-3" :data-source="editLines" :columns="lineEditColumns" row-key="_key" :pagination="false" size="small" :scroll="{ x: 1060 }">
        <template #bodyCell="{ column, record, index }">
          <MaterialPicker v-if="column.key === 'material'" v-model="record.materialId" :label="materialLabel(record)" @select="(m) => selectMaterial(record, m)" />
          <span v-else-if="column.key === 'materialCode'">{{ record.materialCode || '-' }}</span>
          <span v-else-if="column.key === 'materialName'">{{ record.materialName || '-' }}</span>
          <a-input v-else-if="column.key === 'unit'" v-model:value="record.unit" />
          <a-input-number v-else-if="column.key === 'minOrderQuantity'" v-model:value="record.minOrderQuantity" :min="0.000001" style="width:100%" />
          <a-input-number v-else-if="column.key === 'minQuantity'" v-model:value="record.minQuantity" :min="0" style="width:100%" />
          <a-input-number v-else-if="column.key === 'maxQuantity'" v-model:value="record.maxQuantity" :min="0" style="width:100%" />
          <a-input-number v-else-if="column.key === 'unitPrice'" v-model:value="record.unitPrice" :min="0.000001" :precision="6" style="width:100%" />
          <a-input-number v-else-if="column.key === 'taxRate'" v-model:value="record.taxRate" :min="0" :max="100" :precision="4" style="width:100%" />
          <a-input-number v-else-if="column.key === 'leadTimeDays'" v-model:value="record.leadTimeDays" :min="0" style="width:100%" />
          <a v-else-if="column.key === 'action'" @click="editLines.splice(index, 1)">删除</a>
        </template>
      </a-table>
    </a-modal>

    <a-drawer v-model:open="detailOpen" title="供应商报价详情" width="900px">
      <a-descriptions bordered :column="2">
        <a-descriptions-item label="报价单号">{{ detail.quoteCode || '-' }}</a-descriptions-item>
        <a-descriptions-item label="供应商">{{ detail.supplierName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="报价日期">{{ detail.quoteDate || '-' }}</a-descriptions-item>
        <a-descriptions-item label="有效期">{{ detail.effectiveDate || '-' }} ~ {{ detail.expireDate || '长期有效' }}</a-descriptions-item>
        <a-descriptions-item label="币种">{{ detail.currency || '-' }}</a-descriptions-item>
        <a-descriptions-item label="状态"><a-tag :color="statusColor(detail.status)">{{ statusLabel(detail.status) }}</a-tag></a-descriptions-item>
      </a-descriptions>
      <a-divider>报价明细</a-divider>
      <a-table :data-source="detail.lines || []" :columns="detailColumns" row-key="id" :pagination="false" size="small" />
    </a-drawer>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import ProTable from '@/components/BearJiaProTable/index.vue'
import MaterialPicker from '@/components/MaterialPicker.vue'
import SupplierPicker from '@/components/SupplierPicker.vue'
import { purchaseQuoteApi } from '@/api/mes/purchase/quote'

const proTableRef = ref()
const formRef = ref()
const formOpen = ref(false)
const detailOpen = ref(false)
const editing = ref(false)
const detail = ref({})
const editLines = ref([])
const form = reactive({})
const tableApi = { list: purchaseQuoteApi.list, delete: purchaseQuoteApi.remove }

const searchFields = [
  { name: 'quoteCode', label: '报价单号', type: 'input' },
  { name: 'supplierName', label: '供应商', type: 'input' },
  { name: 'status', label: '状态', type: 'select', options: [{ value: 'DRAFT', label: '草稿' }, { value: 'APPROVED', label: '已审核' }] },
]
const columns = [
  { title: '报价单号', dataIndex: 'quoteCode', key: 'quoteCode', width: 160 },
  { title: '供应商', dataIndex: 'supplierName', key: 'supplierName', width: 220 },
  { title: '报价日期', dataIndex: 'quoteDate', key: 'quoteDate', width: 120 },
  { title: '生效日期', dataIndex: 'effectiveDate', key: 'effectiveDate', width: 120 },
  { title: '失效日期', dataIndex: 'expireDate', key: 'expireDate', width: 120 },
  { title: '币种', dataIndex: 'currency', key: 'currency', width: 80 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
]
const lineEditColumns = [
  { title: '物料', key: 'material', width: 220 },
  { title: '编码', key: 'materialCode', width: 110 },
  { title: '名称', key: 'materialName', width: 130 },
  { title: '单位', key: 'unit', width: 75 },
  { title: '起订量', key: 'minOrderQuantity', width: 100 },
  { title: '阶梯起始', key: 'minQuantity', width: 100 },
  { title: '阶梯结束', key: 'maxQuantity', width: 100 },
  { title: '单价', key: 'unitPrice', width: 110 },
  { title: '税率%', key: 'taxRate', width: 90 },
  { title: '交期天数', key: 'leadTimeDays', width: 100 },
  { title: '操作', key: 'action', width: 60 },
]
const detailColumns = [
  { title: '物料编码', dataIndex: 'materialCode' }, { title: '物料名称', dataIndex: 'materialName' },
  { title: '单位', dataIndex: 'unit' }, { title: '起订量', dataIndex: 'minOrderQuantity' },
  { title: '数量区间', key: 'range', customRender: ({ record }) => `${record.minQuantity ?? 0} ~ ${record.maxQuantity ?? '∞'}` },
  { title: '单价', dataIndex: 'unitPrice' }, { title: '税率%', dataIndex: 'taxRate' }, { title: '交期天数', dataIndex: 'leadTimeDays' },
]
const rules = {
  quoteCode: [{ required: true, message: '请输入报价单号' }], supplierId: [{ required: true, message: '请选择供应商' }],
  quoteDate: [{ required: true, message: '请选择报价日期' }], effectiveDate: [{ required: true, message: '请选择生效日期' }],
  currency: [{ required: true, message: '请输入币种' }], taxIncluded: [{ required: true, message: '请选择含税标识' }],
  sourceType: [{ required: true, message: '请选择报价来源' }],
}
const taxOptions = [{ value: 'Y', label: '含税' }, { value: 'N', label: '未税' }]
const sourceOptions = [{ value: 'MANUAL', label: '手工录入' }, { value: 'EXCEL', label: 'Excel导入' }, { value: 'API', label: '接口同步' }]
const supplierLabel = computed(() => form.supplierCode ? `${form.supplierCode} ${form.supplierName}` : '')

function statusLabel(v) { return ({ DRAFT: '草稿', APPROVED: '已审核', EXPIRED: '已过期', CANCELLED: '已作废' })[v] || v || '-' }
function statusColor(v) { return ({ DRAFT: 'default', APPROVED: 'green', EXPIRED: 'orange', CANCELLED: 'red' })[v] || 'default' }
function onSupplierSelect(s) { form.supplierId = s?.id || null; form.supplierCode = s?.supplierCode || ''; form.supplierName = s?.supplierName || '' }
function materialLabel(line) { return line.materialCode ? `${line.materialCode} ${line.materialName || ''}` : '' }
function selectMaterial(line, m) { line.materialId = m?.materialId || null; line.materialCode = m?.materialCode || ''; line.materialName = m?.materialName || ''; line.spec = m?.spec || ''; line.unit = m?.unit || '' }
function emptyLine() { return { _key: `new-${Date.now()}-${Math.random()}`, materialId: null, materialCode: '', materialName: '', unit: '', minOrderQuantity: 1, minQuantity: 0, maxQuantity: null, unitPrice: null, taxRate: 0, leadTimeDays: 0 } }
function addLine() { editLines.value.push(emptyLine()) }
function openAdd() { editing.value = false; Object.keys(form).forEach(k => delete form[k]); Object.assign(form, { quoteCode: '', supplierId: null, supplierCode: '', supplierName: '', quoteDate: new Date().toISOString().slice(0, 10), effectiveDate: new Date().toISOString().slice(0, 10), expireDate: null, currency: 'CNY', taxIncluded: 'Y', sourceType: 'MANUAL' }); editLines.value = [emptyLine()]; formOpen.value = true }
async function openEdit(row) { editing.value = true; const res = await purchaseQuoteApi.get(row.id); Object.assign(form, res.data || row); editLines.value = (res.data?.lines || []).map((line, i) => ({ ...line, _key: line.id || `line-${i}` })); formOpen.value = true }
async function openDetail(row) { const res = await purchaseQuoteApi.get(row.id); detail.value = res.data || row; detailOpen.value = true }
async function save() {
  try { await formRef.value.validate() } catch { return }
  if (!editLines.value.length) return message.error('报价单至少需要一条明细')
  const invalid = editLines.value.find(l => !l.materialId || !l.unit || Number(l.minOrderQuantity) <= 0 || Number(l.unitPrice) <= 0 || Number(l.leadTimeDays) < 0 || (l.maxQuantity != null && Number(l.maxQuantity) < Number(l.minQuantity || 0)))
  if (invalid) return message.error('请完整填写报价明细，阶梯结束数量不能小于起始数量')
  const payload = { ...form, lines: editLines.value.map(({ _key, ...line }, i) => ({ ...line, lineNo: i + 1 })) }
  await (editing.value ? purchaseQuoteApi.update(payload) : purchaseQuoteApi.add(payload))
  message.success('保存成功'); formOpen.value = false; proTableRef.value?.refresh()
}
async function handleDelete(ids) { await purchaseQuoteApi.remove(ids.join(',')); message.success('删除成功'); proTableRef.value?.refresh() }
async function approve(row) { await purchaseQuoteApi.approve(row.id); message.success('审核成功'); proTableRef.value?.refresh() }
async function unapprove(row) { await purchaseQuoteApi.unapprove(row.id); message.success('弃审成功'); proTableRef.value?.refresh() }
</script>
