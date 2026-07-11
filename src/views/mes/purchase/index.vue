<template>
  <a-card :bordered="false">
    <a-space class="search-bar">
      <a-input
        v-model:value="query.code"
        :placeholder="`${title}编号/物料编码`"
        allow-clear
        @pressEnter="load"
      />
      <a-input
        v-if="type === 'inventory'"
        v-model:value="query.warehouseCode"
        placeholder="仓库编码"
        allow-clear
      />
      <a-button type="primary" @click="load">查询</a-button>
      <a-button @click="reset">重置</a-button>
      <a-button type="primary" ghost @click="openAdd">新增{{ title }}</a-button>
      <a-button danger :disabled="!selected.length" @click="remove">删除</a-button>
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
          <a @click="openEdit(record)">编辑</a>
          <a @click="openDetail(record)">详情</a>
        </a-space>
      </template>
    </a-table>

    <a-modal
      v-model:open="formOpen"
      :title="editing ? `编辑${title}` : `新增${title}`"
      width="980px"
      @ok="save"
    >
      <a-form ref="formRef" :model="form" :rules="formRules" layout="vertical">
        <a-row :gutter="16">
          <a-col v-for="field in fields" :key="field.key" :span="12">
            <a-form-item :label="field.label" :name="field.key">
              <a-date-picker
                v-if="field.type === 'date'"
                v-model:value="form[field.key]"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
              <a-select
                v-else-if="field.type === 'status'"
                v-model:value="form[field.key]"
                :options="field.options"
              />
              <a-input-number
                v-else-if="field.type === 'number'"
                v-model:value="form[field.key]"
                :min="0"
                :disabled="field.readonly"
                style="width: 100%"
              />
              <a-input v-else v-model:value="form[field.key]" :disabled="field.readonly" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <template v-if="type === 'order'">
        <a-divider>采购明细</a-divider>
        <a-button type="dashed" block @click="addLine">+ 添加物料</a-button>
        <a-table
          :data-source="editLines"
          :columns="editLineColumns"
          row-key="_key"
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record, index }">
            <a-input-number
              v-if="column.key === 'materialId'"
              v-model:value="record.materialId"
              :min="1"
              style="width: 100%"
            />
            <a-input
              v-else-if="column.key === 'materialCode'"
              v-model:value="record.materialCode"
              placeholder="物料编码"
            />
            <a-input
              v-else-if="column.key === 'materialName'"
              v-model:value="record.materialName"
              placeholder="物料名称"
            />
            <a-input
              v-else-if="column.key === 'unit'"
              v-model:value="record.unit"
              placeholder="单位"
            />
            <a-input-number
              v-else-if="column.key === 'orderQuantity'"
              v-model:value="record.orderQuantity"
              :min="0"
              style="width: 100%"
            />
            <a-input-number
              v-else-if="column.key === 'unitPrice'"
              v-model:value="record.unitPrice"
              :min="0"
              style="width: 100%"
            />
            <a v-else-if="column.key === 'action'" @click="editLines.splice(index, 1)">删除</a>
          </template>
        </a-table>
      </template>
    </a-modal>

    <a-drawer v-model:open="detailOpen" :title="`${title}详情`" width="760px">
      <a-descriptions bordered :column="1">
        <a-descriptions-item v-for="field in fields" :key="field.key" :label="field.label">
          {{ detail[field.key] ?? '-' }}
        </a-descriptions-item>
      </a-descriptions>
      <a-divider v-if="detail.lines">明细</a-divider>
      <a-table
        v-if="detail.lines"
        :data-source="detail.lines"
        :columns="lineColumns"
        row-key="id"
      />
    </a-drawer>
  </a-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  purchaseOrderApi,
  purchaseReceiptApi,
  purchaseInboundApi,
  inventoryBalanceApi,
} from '@/api/mes/purchase';

const route = useRoute();
const formRef = ref();
const type = computed(() => {
  if (route.path.includes('purchaseReceipt')) return 'receipt';
  if (route.path.includes('purchaseInbound')) return 'inbound';
  if (route.path.includes('inventoryBalance')) return 'inventory';
  return 'order';
});

const orderStatuses = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'SUBMITTED', label: '已提交' },
  { value: 'APPROVED', label: '已审核' },
  { value: 'CANCELLED', label: '已取消' },
];
const receiptStatuses = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'CONFIRMED', label: '已确认' },
  { value: 'CANCELLED', label: '已取消' },
];
const inboundStatuses = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'CONFIRMED', label: '已确认' },
  { value: 'POSTED', label: '已过账' },
  { value: 'CANCELLED', label: '已取消' },
];
const inventoryStatuses = [
  { value: 'NORMAL', label: '正常' },
  { value: 'FROZEN', label: '冻结' },
  { value: 'LOCKED', label: '锁定' },
];
const inspectionStatuses = [
  { value: 'PENDING', label: '待检' },
  { value: 'PASSED', label: '合格' },
  { value: 'PARTIAL', label: '部分合格' },
  { value: 'FAILED', label: '不合格' },
];

const configs = {
  order: {
    title: '采购订单',
    code: 'orderCode',
    api: purchaseOrderApi,
    fields: [
      { key: 'orderCode', label: '订单编号', required: true },
      { key: 'supplierName', label: '供应商', required: true },
      { key: 'orderDate', label: '订单日期', type: 'date', required: true },
      { key: 'expectedDate', label: '预计到货日期', type: 'date' },
      { key: 'status', label: '状态', type: 'status', options: orderStatuses, required: true },
      { key: 'totalQuantity', label: '总数量', type: 'number', readonly: true },
      { key: 'totalAmount', label: '总金额', type: 'number', readonly: true },
    ],
  },
  receipt: {
    title: '到货单',
    code: 'receiptCode',
    api: purchaseReceiptApi,
    fields: [
      { key: 'receiptCode', label: '到货单号', required: true },
      { key: 'orderId', label: '采购订单ID', type: 'number', required: true },
      { key: 'orderCode', label: '采购订单号', required: true },
      { key: 'receiptDate', label: '到货日期', type: 'date', required: true },
      { key: 'status', label: '状态', type: 'status', options: receiptStatuses, required: true },
      {
        key: 'inspectionStatus',
        label: '检验状态',
        type: 'status',
        options: inspectionStatuses,
        required: true,
      },
      { key: 'totalQuantity', label: '到货总数量', type: 'number', required: true },
    ],
  },
  inbound: {
    title: '入库单',
    code: 'inboundCode',
    api: purchaseInboundApi,
    fields: [
      { key: 'inboundCode', label: '入库单号', required: true },
      { key: 'receiptId', label: '到货单ID', type: 'number', required: true },
      { key: 'receiptCode', label: '到货单号', required: true },
      { key: 'inboundDate', label: '入库日期', type: 'date', required: true },
      { key: 'warehouseCode', label: '入库仓库', required: true },
      { key: 'status', label: '状态', type: 'status', options: inboundStatuses, required: true },
      { key: 'totalQuantity', label: '入库总数量', type: 'number', required: true },
    ],
  },
  inventory: {
    title: '库存余额',
    code: 'materialCode',
    api: inventoryBalanceApi,
    fields: [
      { key: 'materialId', label: '物料ID', type: 'number', required: true },
      { key: 'materialCode', label: '物料编码', required: true },
      { key: 'materialName', label: '物料名称', required: true },
      { key: 'warehouseCode', label: '仓库编码', required: true },
      { key: 'locationCode', label: '库位编码' },
      { key: 'lotNo', label: '批次号' },
      { key: 'unit', label: '单位', required: true },
      { key: 'quantity', label: '库存数量', type: 'number', required: true },
      { key: 'availableQuantity', label: '可用数量', type: 'number', required: true },
      { key: 'lockedQuantity', label: '锁定数量', type: 'number', required: true },
      { key: 'status', label: '状态', type: 'status', options: inventoryStatuses, required: true },
    ],
  },
};

const config = computed(() => configs[type.value]);
const title = computed(() => config.value.title);
const fields = computed(() => config.value.fields);
const formRules = computed(() =>
  Object.fromEntries(
    fields.value
      .filter((field) => field.required)
      .map((field) => [
        field.key,
        [
          {
            required: true,
            message: `请输入${field.label}`,
            trigger: field.type === 'status' ? 'change' : 'blur',
          },
        ],
      ])
  )
);
const columns = computed(() =>
  fields.value
    .map((field) => ({ title: field.label, dataIndex: field.key, key: field.key }))
    .concat([{ title: '操作', key: 'action', fixed: 'right' }])
);
const lineColumns = [
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '数量', dataIndex: 'orderQuantity' },
  { title: '单位', dataIndex: 'unit' },
];
const editLineColumns = [
  { title: '物料ID', key: 'materialId', width: 90 },
  { title: '物料编码', key: 'materialCode' },
  { title: '物料名称', key: 'materialName' },
  { title: '单位', key: 'unit', width: 90 },
  { title: '采购数量', key: 'orderQuantity', width: 110 },
  { title: '含税单价', key: 'unitPrice', width: 110 },
  { title: '操作', key: 'action', width: 60 },
];

const rows = ref([]);
const loading = ref(false);
const selected = ref([]);
const formOpen = ref(false);
const detailOpen = ref(false);
const editing = ref(false);
const detail = ref({});
const editLines = ref([]);
const form = reactive({});
const query = reactive({ code: '', warehouseCode: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: true });

async function load() {
  loading.value = true;
  try {
    const params = {
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      [config.value.code]: query.code,
    };
    if (query.warehouseCode) params.warehouseCode = query.warehouseCode;
    const result = await config.value.api.list(params);
    rows.value = result.rows || [];
    pagination.total = result.total || 0;
  } finally {
    loading.value = false;
  }
}
function reset() {
  query.code = '';
  query.warehouseCode = '';
  pagination.current = 1;
  load();
}
function pageChange(page) {
  pagination.current = page.current;
  pagination.pageSize = page.pageSize;
  load();
}
function openAdd() {
  editing.value = false;
  Object.keys(form).forEach((key) => delete form[key]);
  fields.value.forEach((field) => {
    form[field.key] = field.type === 'number' ? 0 : '';
  });
  form.orderDate = new Date().toISOString().slice(0, 10);
  form.status = type.value === 'inventory' ? 'NORMAL' : 'DRAFT';
  form.currency = 'CNY';
  editLines.value = [];
  formOpen.value = true;
}
async function openEdit(row) {
  editing.value = true;
  const result = await config.value.api.get(row.id);
  Object.assign(form, result.data || row);
  editLines.value = (result.data?.lines || []).map((line, index) => ({
    ...line,
    _key: line.id || `new-${index}`,
  }));
  formOpen.value = true;
}
function addLine() {
  editLines.value.push({
    _key: `new-${Date.now()}`,
    materialId: null,
    materialCode: '',
    materialName: '',
    unit: '',
    orderQuantity: null,
    unitPrice: 0,
  });
}
function validateOrderLines() {
  if (!editLines.value.length) {
    message.error('采购订单至少需要一条明细');
    return false;
  }
  const invalid = editLines.value.find(
    (line) =>
      !line.materialId ||
      !String(line.materialCode || '').trim() ||
      !String(line.materialName || '').trim() ||
      !String(line.unit || '').trim() ||
      Number(line.orderQuantity) <= 0 ||
      Number(line.unitPrice) < 0
  );
  if (invalid) {
    message.error('请完整填写每条采购明细：物料、单位、采购数量和单价');
    return false;
  }
  return true;
}
async function save() {
  try {
    await formRef.value.validate();
  } catch {
    return;
  }
  if (type.value === 'order' && !validateOrderLines()) return;
  const payload = { ...form };
  if (type.value === 'order') {
    payload.lines = editLines.value.map(({ _key, ...line }, index) => ({
      ...line,
      lineNo: index + 1,
    }));
    payload.totalQuantity = payload.lines.reduce(
      (sum, line) => sum + Number(line.orderQuantity || 0),
      0
    );
    payload.totalAmount = payload.lines.reduce(
      (sum, line) => sum + Number(line.orderQuantity || 0) * Number(line.unitPrice || 0),
      0
    );
  }
  await (editing.value ? config.value.api.update(payload) : config.value.api.add(payload));
  message.success('保存成功');
  formOpen.value = false;
  load();
}
async function openDetail(row) {
  const result = await config.value.api.get(row.id);
  detail.value = result.data || row;
  detailOpen.value = true;
}
async function remove() {
  await config.value.api.remove(selected.value.join(','));
  message.success('删除成功');
  selected.value = [];
  load();
}
onMounted(load);
</script>

<style scoped>
.search-bar {
  margin-bottom: 16px;
}
</style>
