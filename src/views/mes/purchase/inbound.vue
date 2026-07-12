<template>
  <a-card :bordered="false">
    <a-space class="search-bar">
      <a-input v-model:value="query.code" placeholder="入库单号/物料编码" allow-clear @pressEnter="load" />
      <a-button type="primary" @click="load">查询</a-button>
      <a-button @click="reset">重置</a-button>
      <a-button v-hasPermi="['mes:purchaseInbound:add']" type="primary" ghost @click="openAdd">新增入库单</a-button>
      <a-button v-hasPermi="['mes:purchaseInbound:reference']" type="primary" ghost @click="openReference">参照送货单</a-button>
      <a-button v-hasPermi="['mes:purchaseInbound:remove']" danger :disabled="!selected.length" @click="remove">删除</a-button>
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
          <a v-if="record.status === 'DRAFT'" v-hasPermi="['mes:purchaseInbound:edit']" @click="openEdit(record)">编辑</a>
          <a v-if="record.status === 'DRAFT'" v-hasPermi="['mes:purchaseInbound:approve']" @click="approve(record)">审核</a>
          <a v-if="record.status === 'APPROVED'" v-hasPermi="['mes:purchaseInbound:unapprove']" @click="unapprove(record)">弃审</a>
          <a v-hasPermi="['mes:purchaseInbound:query']" @click="openDetail(record)">详情</a>
        </a-space>
      </template>
    </a-table>

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
              <a-date-picker v-model:value="form.inboundDate" value-format="YYYY-MM-DD" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="入库仓库" name="warehouseCode">
              <a-input v-model:value="form.warehouseCode" />
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
          <a-input-number
            v-if="column.key === 'inboundQuantity'"
            v-model:value="record.inboundQuantity"
            :min="0.000001"
            :max="record.remainingQuantity"
            style="width: 100%"
          />
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
        <a-descriptions-item label="状态">{{ detail.status ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="入库总数量">{{ detail.totalQuantity ?? '-' }}</a-descriptions-item>
      </a-descriptions>
      <a-divider v-if="detail.lines">明细</a-divider>
      <a-table v-if="detail.lines" :data-source="detail.lines" :columns="lineColumns" row-key="id" :pagination="false" size="small" />
    </a-drawer>

    <!-- 参照送货单弹窗 -->
    <a-modal v-model:open="referenceOpen" title="参照送货单" width="1100px" @ok="confirmReference">
      <a-space class="reference-search">
        <a-input v-model:value="referenceQuery.receiptCode" placeholder="到货单号" allow-clear @pressEnter="loadReference" />
        <a-input v-model:value="referenceQuery.warehouseCode" placeholder="仓库编码" allow-clear @pressEnter="loadReference" />
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
  </a-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import {
  purchaseInboundApi,
  approvePurchaseInbound,
  unapprovePurchaseInbound,
  listInboundReferenceLines,
} from '@/api/mes/purchase/inbound';

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
const editing = ref(false);
const detail = ref({});
const editLines = ref([]);
const form = reactive({});
const query = reactive({ code: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: true });
const referenceQuery = reactive({ receiptCode: '', warehouseCode: '', materialCode: '' });

const statusOptions = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'APPROVED', label: '已审核' },
];

const columns = [
  { title: '入库单号', dataIndex: 'inboundCode', key: 'inboundCode' },
  { title: '入库日期', dataIndex: 'inboundDate', key: 'inboundDate' },
  { title: '入库仓库', dataIndex: 'warehouseCode', key: 'warehouseCode' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '入库总数量', dataIndex: 'totalQuantity', key: 'totalQuantity' },
  { title: '操作', key: 'action', fixed: 'right' },
];

const lineColumns = [
  { title: '来源到货单', dataIndex: 'sourceReceiptCode' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '入库数量', dataIndex: 'inboundQuantity' },
  { title: '仓库', dataIndex: 'warehouseCode' },
  { title: '单位', dataIndex: 'unit' },
];

const editLineColumns = [
  { title: '来源送货单', dataIndex: 'sourceReceiptCode' },
  { title: '来源订单', dataIndex: 'sourceOrderCode' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '可入库数量', key: 'remainingQuantity' },
  { title: '本次入库数量', key: 'inboundQuantity', width: 150 },
  { title: '单位', dataIndex: 'unit' },
];

const referenceColumns = [
  { title: '送货单', dataIndex: 'sourceReceiptCode' },
  { title: '采购订单', dataIndex: 'sourceOrderCode' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '剩余可入库', dataIndex: 'remainingQuantity' },
  { title: '仓库', dataIndex: 'warehouseCode' },
  { title: '单位', dataIndex: 'unit' },
];

const formRules = {
  inboundCode: [{ required: true, message: '请输入入库单号', trigger: 'blur' }],
  inboundDate: [{ required: true, message: '请选择入库日期', trigger: 'change' }],
  warehouseCode: [{ required: true, message: '请输入入库仓库', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

// ==================== 列表 ====================
async function load() {
  loading.value = true;
  try {
    const params = { pageNum: pagination.current, pageSize: pagination.pageSize, inboundCode: query.code };
    const result = await purchaseInboundApi.list(params);
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
  form.inboundCode = '';
  form.inboundDate = new Date().toISOString().slice(0, 10);
  form.warehouseCode = '';
  form.status = 'DRAFT';
  editLines.value = [];
  formOpen.value = true;
}

async function openEdit(row) {
  editing.value = true;
  const result = await purchaseInboundApi.get(row.id);
  Object.assign(form, result.data || row);
  editLines.value = (result.data?.lines || []).map((line, index) => ({
    ...line,
    _key: line.id || `new-${index}`,
    remainingQuantity: line.inboundQuantity,
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
    (line) => Number(line.inboundQuantity) <= 0 || Number(line.inboundQuantity) > Number(line.remainingQuantity)
  );
  if (invalid) {
    message.error('入库数量必须大于0且不能超过合格未入库数量');
    return;
  }

  const payload = { ...form };
  payload.lines = editLines.value.map(({ _key, remainingQuantity, ...line }, index) => ({ ...line, lineNo: index + 1 }));
  payload.totalQuantity = payload.lines.reduce((sum, line) => sum + Number(line.inboundQuantity || 0), 0);

  await (editing.value ? purchaseInboundApi.update(payload) : purchaseInboundApi.add(payload));
  message.success('保存成功');
  formOpen.value = false;
  load();
}

// ==================== 详情 ====================
async function openDetail(row) {
  const result = await purchaseInboundApi.get(row.id);
  detail.value = result.data || row;
  detailOpen.value = true;
}

// ==================== 操作 ====================
async function remove() {
  await purchaseInboundApi.remove(selected.value.join(','));
  message.success('删除成功');
  selected.value = [];
  load();
}

async function approve(record) {
  await approvePurchaseInbound(record.id);
  message.success('审核成功');
  load();
}

async function unapprove(record) {
  await unapprovePurchaseInbound(record.id);
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
    const result = await listInboundReferenceLines({
      receiptCode: referenceQuery.receiptCode,
      warehouseCode: referenceQuery.warehouseCode,
      materialCode: referenceQuery.materialCode,
    });
    referenceRows.value = (result.data || []).map((row, index) => ({
      ...row,
      _referenceKey: `r-${row.sourceReceiptLineId}-${index}`,
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
  const warehouses = new Set(selectedRows.map((row) => row.warehouseCode));
  if (warehouses.size > 1) {
    message.error('一张入库单只能参照同一仓库的送货明细');
    return;
  }
  openAdd();
  form.warehouseCode = selectedRows[0].warehouseCode;
  form.warehouseName = selectedRows[0].warehouseName;
  editLines.value = selectedRows.map((row, index) => ({
    ...row,
    _key: row._referenceKey,
    lineNo: index + 1,
    inboundQuantity: row.remainingQuantity,
  }));
  referenceOpen.value = false;
}

onMounted(load);
</script>

<style scoped>
.search-bar { margin-bottom: 16px; }
.reference-search { display: flex; margin-bottom: 16px; }
</style>
