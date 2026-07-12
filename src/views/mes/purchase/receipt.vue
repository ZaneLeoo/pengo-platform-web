<template>
  <a-card :bordered="false">
    <a-space class="search-bar">
      <a-input v-model:value="query.code" placeholder="到货单号/物料编码" allow-clear @pressEnter="load" />
      <a-button type="primary" @click="load">查询</a-button>
      <a-button @click="reset">重置</a-button>
      <a-button v-hasPermi="['mes:purchaseReceipt:add']" type="primary" ghost @click="openAdd">新增到货单</a-button>
      <a-button v-hasPermi="['mes:purchaseReceipt:reference']" type="primary" ghost @click="openReference">参照采购订单</a-button>
      <a-button v-hasPermi="['mes:purchaseReceipt:remove']" danger :disabled="!selected.length" @click="remove">删除</a-button>
    </a-space>

    <a-table
      :loading="loading"
      :data-source="rows"
      :columns="columns"
      row-key="id"
      :pagination="pagination"
      :row-selection="{ selectedRowKeys: selected, onChange: (keys) => (selected = keys) }"
      @change="pageChange"
    >
      <template #bodyCell="{ column, record }">
        <a-space v-if="column.key === 'action'">
          <a v-if="record.status === 'DRAFT'" v-hasPermi="['mes:purchaseReceipt:edit']" @click="openEdit(record)">编辑</a>
          <a v-if="record.status === 'DRAFT'" v-hasPermi="['mes:purchaseReceipt:approve']" @click="approve(record)">审核</a>
          <a v-if="record.status === 'APPROVED'" v-hasPermi="['mes:purchaseReceipt:unapprove']" @click="unapprove(record)">弃审</a>
          <a
            v-if="record.status === 'APPROVED' && record.inspectionStatus === 'PENDING'"
            v-hasPermi="['mes:purchaseReceipt:inspect']"
            @click="openInspection(record)"
          >质检</a>
          <a
            v-if="record.status === 'APPROVED' && record.inspectionStatus !== 'PENDING'"
            v-hasPermi="['mes:purchaseReceipt:uninspect']"
            @click="uninspect(record)"
          >反质检</a>
          <a v-hasPermi="['mes:purchaseReceipt:query']" @click="openDetail(record)">详情</a>
        </a-space>
      </template>
    </a-table>

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
            <a-form-item label="供应商" name="supplierName">
              <a-input v-model:value="form.supplierName" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="到货日期" name="receiptDate">
              <a-date-picker v-model:value="form.receiptDate" value-format="YYYY-MM-DD" style="width: 100%" />
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
          <a-input-number
            v-if="column.key === 'receivedQuantity'"
            v-model:value="record.receivedQuantity"
            :min="0.000001"
            :max="record.remainingQuantity"
            style="width: 100%"
          />
          <a-input v-else-if="column.key === 'warehouseCode'" v-model:value="record.warehouseCode" placeholder="请输入仓库编码" />
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
        <a-descriptions-item label="状态">{{ detail.status ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="检验状态">{{ detail.inspectionStatus ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="到货总数量">{{ detail.totalQuantity ?? '-' }}</a-descriptions-item>
      </a-descriptions>
      <a-divider v-if="detail.lines">明细</a-divider>
      <a-table v-if="detail.lines" :data-source="detail.lines" :columns="lineColumns" row-key="id" :pagination="false" size="small" />
    </a-drawer>

    <!-- 参照采购订单弹窗 -->
    <a-modal v-model:open="referenceOpen" title="参照采购订单" width="1100px" @ok="confirmReference">
      <a-space class="reference-search">
        <a-input v-model:value="referenceQuery.orderCode" placeholder="采购订单号" allow-clear @pressEnter="loadReference" />
        <a-input v-model:value="referenceQuery.supplierName" placeholder="供应商名称" allow-clear @pressEnter="loadReference" />
        <a-input v-model:value="referenceQuery.materialCode" placeholder="物料编码" allow-clear @pressEnter="loadReference" />
        <a-button type="primary" @click="loadReference">查询</a-button>
        <a-button @click="resetReferenceQuery">重置</a-button>
      </a-space>
      <a-table
        :data-source="referenceRows"
        :columns="referenceColumns"
        row-key="_referenceKey"
        :loading="referenceLoading"
        :pagination="false"
        :row-selection="{ selectedRowKeys: referenceSelected, onChange: (keys) => (referenceSelected = keys) }"
      />
    </a-modal>

    <!-- 质检弹窗 -->
    <a-modal v-model:open="inspectionOpen" title="送货单质检" width="760px" @ok="submitInspection">
      <a-alert message="合格数量与不合格数量之和必须等于到货数量。" type="info" show-icon style="margin-bottom: 12px" />
      <a-table :data-source="inspectionLines" :columns="inspectionColumns" row-key="receiptLineId" :pagination="false">
        <template #bodyCell="{ column, record }">
          <a-input-number
            v-if="column.key === 'qualifiedQuantity' || column.key === 'rejectedQuantity'"
            v-model:value="record[column.key]"
            :min="0"
            :max="record.receivedQuantity"
            style="width: 100%"
          />
        </template>
      </a-table>
    </a-modal>
  </a-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import {
  purchaseReceiptApi,
  approvePurchaseReceipt,
  unapprovePurchaseReceipt,
  inspectPurchaseReceipt,
  uninspectPurchaseReceipt,
  listReceiptReferenceLines,
} from '@/api/mes/purchase/receipt';

const formRef = ref();
const rows = ref([]);
const loading = ref(false);
const selected = ref([]);
const formOpen = ref(false);
const detailOpen = ref(false);
const referenceOpen = ref(false);
const referenceLoading = ref(false);
const referenceRows = ref([]);
const referenceSelected = ref([]);
const inspectionOpen = ref(false);
const inspectionReceiptId = ref();
const inspectionLines = ref([]);
const editing = ref(false);
const detail = ref({});
const editLines = ref([]);
const form = reactive({});
const query = reactive({ code: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: true });
const referenceQuery = reactive({ orderCode: '', supplierName: '', materialCode: '' });

const statusOptions = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'APPROVED', label: '已审核' },
];
const inspectionStatusOptions = [
  { value: 'PENDING', label: '待检' },
  { value: 'PASSED', label: '合格' },
  { value: 'PARTIAL', label: '部分合格' },
  { value: 'FAILED', label: '不合格' },
];

const columns = [
  { title: '到货单号', dataIndex: 'receiptCode', key: 'receiptCode' },
  { title: '供应商', dataIndex: 'supplierName', key: 'supplierName' },
  { title: '到货日期', dataIndex: 'receiptDate', key: 'receiptDate' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '检验状态', dataIndex: 'inspectionStatus', key: 'inspectionStatus' },
  { title: '到货总数量', dataIndex: 'totalQuantity', key: 'totalQuantity' },
  { title: '操作', key: 'action', fixed: 'right' },
];

const lineColumns = [
  { title: '来源订单', dataIndex: 'sourceOrderCode' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '到货数量', dataIndex: 'receivedQuantity' },
  { title: '合格数量', dataIndex: 'qualifiedQuantity' },
  { title: '不合格数量', dataIndex: 'rejectedQuantity' },
  { title: '仓库', dataIndex: 'warehouseCode' },
  { title: '单位', dataIndex: 'unit' },
];

const editLineColumns = [
  { title: '来源订单', dataIndex: 'sourceOrderCode' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '可到货数量', key: 'remainingQuantity' },
  { title: '本次到货数量', key: 'receivedQuantity', width: 150 },
  { title: '入库仓库', key: 'warehouseCode', width: 150 },
  { title: '单位', dataIndex: 'unit' },
];

const referenceColumns = [
  { title: '采购订单', dataIndex: 'sourceOrderCode' },
  { title: '供应商', dataIndex: 'supplierName' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '剩余可到货', dataIndex: 'remainingQuantity' },
  { title: '单位', dataIndex: 'unit' },
];

const inspectionColumns = [
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '到货数量', dataIndex: 'receivedQuantity' },
  { title: '合格数量', key: 'qualifiedQuantity' },
  { title: '不合格数量', key: 'rejectedQuantity' },
  { title: '单位', dataIndex: 'unit' },
];

const formRules = {
  receiptCode: [{ required: true, message: '请输入到货单号', trigger: 'blur' }],
  supplierName: [{ required: true, message: '请输入供应商', trigger: 'blur' }],
  receiptDate: [{ required: true, message: '请选择到货日期', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  inspectionStatus: [{ required: true, message: '请选择检验状态', trigger: 'change' }],
};

// ==================== 列表 ====================
async function load() {
  loading.value = true;
  try {
    const params = { pageNum: pagination.current, pageSize: pagination.pageSize, receiptCode: query.code };
    const result = await purchaseReceiptApi.list(params);
    rows.value = result.rows || [];
    pagination.total = result.total || 0;
  } finally {
    loading.value = false;
  }
}

function reset() {
  query.code = '';
  pagination.current = 1;
  load();
}

function pageChange(page) {
  pagination.current = page.current;
  pagination.pageSize = page.pageSize;
  load();
}

// ==================== 新增/编辑 ====================
function openAdd() {
  editing.value = false;
  Object.keys(form).forEach((key) => delete form[key]);
  form.receiptCode = '';
  form.supplierName = '';
  form.receiptDate = new Date().toISOString().slice(0, 10);
  form.status = 'DRAFT';
  form.inspectionStatus = 'PENDING';
  editLines.value = [];
  formOpen.value = true;
}

async function openEdit(row) {
  editing.value = true;
  const result = await purchaseReceiptApi.get(row.id);
  Object.assign(form, result.data || row);
  editLines.value = (result.data?.lines || []).map((line, index) => ({
    ...line,
    _key: line.id || `new-${index}`,
    remainingQuantity: line.receivedQuantity,
  }));
  formOpen.value = true;
}

async function save() {
  try {
    await formRef.value.validate();
  } catch {
    return;
  }
  if (!editLines.value.length) {
    message.error('请先通过参照功能选择来源明细');
    return;
  }
  const invalid = editLines.value.find(
    (line) =>
      Number(line.receivedQuantity) <= 0 ||
      Number(line.receivedQuantity) > Number(line.remainingQuantity) ||
      !String(line.warehouseCode || '').trim()
  );
  if (invalid) {
    message.error('到货数量必须大于0且不能超过来源订单剩余数量，并填写入库仓库');
    return;
  }

  const payload = { ...form };
  payload.lines = editLines.value.map(({ _key, remainingQuantity, ...line }, index) => ({ ...line, lineNo: index + 1 }));
  payload.totalQuantity = payload.lines.reduce((sum, line) => sum + Number(line.receivedQuantity || 0), 0);

  await (editing.value ? purchaseReceiptApi.update(payload) : purchaseReceiptApi.add(payload));
  message.success('保存成功');
  formOpen.value = false;
  load();
}

// ==================== 详情 ====================
async function openDetail(row) {
  const result = await purchaseReceiptApi.get(row.id);
  detail.value = result.data || row;
  detailOpen.value = true;
}

// ==================== 操作 ====================
async function remove() {
  await purchaseReceiptApi.remove(selected.value.join(','));
  message.success('删除成功');
  selected.value = [];
  load();
}

async function approve(record) {
  await approvePurchaseReceipt(record.id);
  message.success('审核成功');
  load();
}

async function unapprove(record) {
  await unapprovePurchaseReceipt(record.id);
  message.success('弃审成功');
  load();
}

// ==================== 参照 ====================
async function openReference() {
  Object.keys(referenceQuery).forEach((key) => (referenceQuery[key] = ''));
  referenceSelected.value = [];
  referenceOpen.value = true;
  await loadReference();
}

async function loadReference() {
  referenceLoading.value = true;
  try {
    const result = await listReceiptReferenceLines({
      orderCode: referenceQuery.orderCode,
      supplierName: referenceQuery.supplierName,
      materialCode: referenceQuery.materialCode,
    });
    referenceRows.value = (result.data || []).map((row) => ({
      ...row,
      _referenceKey: `o-${row.sourceOrderLineId}`,
    }));
  } finally {
    referenceLoading.value = false;
  }
}

function resetReferenceQuery() {
  Object.keys(referenceQuery).forEach((key) => (referenceQuery[key] = ''));
  loadReference();
}

function confirmReference() {
  const selectedRows = referenceRows.value.filter((row) => referenceSelected.value.includes(row._referenceKey));
  if (!selectedRows.length) {
    message.error('请选择至少一条来源明细');
    return;
  }
  const suppliers = new Set(selectedRows.map((row) => row.supplierCode || row.supplierName));
  if (suppliers.size > 1) {
    message.error('一张送货单只能参照同一供应商的订单明细');
    return;
  }
  openAdd();
  form.supplierCode = selectedRows[0].supplierCode;
  form.supplierName = selectedRows[0].supplierName;
  editLines.value = selectedRows.map((row, index) => ({
    ...row,
    _key: row._referenceKey,
    lineNo: index + 1,
    receivedQuantity: row.remainingQuantity,
    qualifiedQuantity: 0,
    rejectedQuantity: 0,
    pendingQuantity: 0,
    inboundQuantity: 0,
  }));
  referenceOpen.value = false;
}

// ==================== 质检 ====================
async function openInspection(record) {
  const result = await purchaseReceiptApi.get(record.id);
  inspectionReceiptId.value = record.id;
  inspectionLines.value = (result.data?.lines || []).map((line) => ({
    receiptLineId: line.id,
    materialCode: line.materialCode,
    materialName: line.materialName,
    unit: line.unit,
    receivedQuantity: line.receivedQuantity,
    qualifiedQuantity: line.receivedQuantity,
    rejectedQuantity: 0,
  }));
  inspectionOpen.value = true;
}

async function submitInspection() {
  const invalid = inspectionLines.value.find(
    (line) =>
      Number(line.qualifiedQuantity) < 0 ||
      Number(line.rejectedQuantity) < 0 ||
      Number(line.qualifiedQuantity) + Number(line.rejectedQuantity) !== Number(line.receivedQuantity)
  );
  if (invalid) {
    message.error('每条明细的合格数量与不合格数量之和必须等于到货数量');
    return;
  }
  await inspectPurchaseReceipt(inspectionReceiptId.value, {
    lines: inspectionLines.value.map((line) => ({
      receiptLineId: line.receiptLineId,
      qualifiedQuantity: line.qualifiedQuantity,
      rejectedQuantity: line.rejectedQuantity,
    })),
  });
  message.success('质检确认成功');
  inspectionOpen.value = false;
  load();
}

async function uninspect(record) {
  await uninspectPurchaseReceipt(record.id);
  message.success('反质检成功');
  load();
}

onMounted(load);
</script>

<style scoped>
.search-bar { margin-bottom: 16px; }
.reference-search { display: flex; margin-bottom: 16px; }
</style>
