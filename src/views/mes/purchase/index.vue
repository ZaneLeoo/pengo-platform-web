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
      <a-button
        v-if="type !== 'inventory'"
        v-hasPermi="permAdd"
        type="primary"
        ghost
        @click="openAdd"
        >新增{{ title }}</a-button
      >
      <a-button
        v-if="type === 'receipt'"
        v-hasPermi="['mes:purchaseReceipt:reference']"
        type="primary"
        ghost
        @click="openReference"
        >参照采购订单</a-button
      >
      <a-button
        v-if="type === 'inbound'"
        v-hasPermi="['mes:purchaseInbound:reference']"
        type="primary"
        ghost
        @click="openReference"
        >参照送货单</a-button
      >
      <a-button
        v-if="type !== 'inventory'"
        v-hasPermi="permRemove"
        danger
        :disabled="!selected.length"
        @click="remove"
        >删除</a-button
      >
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
          <a
            v-if="type !== 'inventory' && record.status === 'DRAFT'"
            v-hasPermi="permEdit"
            @click="openEdit(record)"
            >编辑</a
          >
          <a
            v-if="record.status === 'DRAFT' && type !== 'inventory'"
            v-hasPermi="permApprove"
            @click="approve(record)"
            >审核</a
          >
          <a
            v-if="record.status === 'APPROVED' && type !== 'inventory'"
            v-hasPermi="permUnapprove"
            @click="unapprove(record)"
            >弃审</a
          >
          <a
            v-if="
              type === 'receipt' &&
              record.status === 'APPROVED' &&
              record.inspectionStatus === 'PENDING'
            "
            v-hasPermi="['mes:purchaseReceipt:inspect']"
            @click="openInspection(record)"
            >质检</a
          >
          <a
            v-if="
              type === 'receipt' &&
              record.status === 'APPROVED' &&
              record.inspectionStatus !== 'PENDING'
            "
            v-hasPermi="['mes:purchaseReceipt:uninspect']"
            @click="uninspect(record)"
            >反质检</a
          >
          <a v-hasPermi="permDetail" @click="openDetail(record)">详情</a>
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
                :disabled="field.readonly"
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
            <MaterialPicker
              v-if="column.key === 'material'"
              v-model="record.materialId"
              :label="materialLabel(record)"
              placeholder="请选择物料"
              @select="(material) => selectOrderMaterial(record, material)"
            />
            <span v-else-if="column.key === 'materialCode'">{{ record.materialCode || '-' }}</span>
            <span v-else-if="column.key === 'materialName'">{{ record.materialName || '-' }}</span>
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
      <template v-else-if="type === 'receipt'">
        <a-divider>送货明细</a-divider>
        <a-table
          :data-source="editLines"
          :columns="receiptLineColumns"
          row-key="_key"
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <a-input-number
              v-if="column.key === 'receivedQuantity'"
              v-model:value="record.receivedQuantity"
              :min="0.000001"
              :max="record.remainingQuantity"
              style="width: 100%"
            />
            <a-input
              v-else-if="column.key === 'warehouseCode'"
              v-model:value="record.warehouseCode"
              placeholder="请输入仓库编码"
            />
            <span v-else-if="column.key === 'remainingQuantity'">{{
              record.remainingQuantity
            }}</span>
          </template>
        </a-table>
      </template>
      <template v-else-if="type === 'inbound'">
        <a-divider>入库明细</a-divider>
        <a-table
          :data-source="editLines"
          :columns="inboundLineColumns"
          row-key="_key"
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <a-input-number
              v-if="column.key === 'inboundQuantity'"
              v-model:value="record.inboundQuantity"
              :min="0.000001"
              :max="record.remainingQuantity"
              style="width: 100%"
            />
            <span v-else-if="column.key === 'remainingQuantity'">{{
              record.remainingQuantity
            }}</span>
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

    <a-modal
      v-model:open="referenceOpen"
      :title="type === 'receipt' ? '参照采购订单' : '参照送货单'"
      width="1100px"
      @ok="confirmReference"
    >
      <a-space class="reference-search">
        <a-input
          v-if="type === 'receipt'"
          v-model:value="referenceQuery.orderCode"
          placeholder="采购订单号"
          allow-clear
          @pressEnter="loadReference"
        />
        <a-input
          v-if="type === 'receipt'"
          v-model:value="referenceQuery.supplierName"
          placeholder="供应商名称"
          allow-clear
          @pressEnter="loadReference"
        />
        <a-input
          v-if="type === 'inbound'"
          v-model:value="referenceQuery.receiptCode"
          placeholder="到货单号"
          allow-clear
          @pressEnter="loadReference"
        />
        <a-input
          v-if="type === 'inbound'"
          v-model:value="referenceQuery.warehouseCode"
          placeholder="仓库编码"
          allow-clear
          @pressEnter="loadReference"
        />
        <a-input
          v-model:value="referenceQuery.materialCode"
          placeholder="物料编码"
          allow-clear
          @pressEnter="loadReference"
        />
        <a-button type="primary" @click="loadReference">查询</a-button>
        <a-button @click="resetReferenceQuery">重置</a-button>
      </a-space>
      <a-table
        :data-source="referenceRows"
        :columns="referenceColumns"
        row-key="_referenceKey"
        :loading="referenceLoading"
        :pagination="false"
        :row-selection="{
          selectedRowKeys: referenceSelected,
          onChange: (keys) => (referenceSelected = keys),
        }"
      />
    </a-modal>

    <a-modal v-model:open="inspectionOpen" title="送货单质检" width="760px" @ok="submitInspection">
      <a-alert
        message="合格数量与不合格数量之和必须等于到货数量。"
        type="info"
        show-icon
        style="margin-bottom: 12px"
      />
      <a-table
        :data-source="inspectionLines"
        :columns="inspectionColumns"
        row-key="receiptLineId"
        :pagination="false"
      >
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
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  purchaseOrderApi,
  purchaseReceiptApi,
  purchaseInboundApi,
  inventoryBalanceApi,
  approvePurchaseOrder,
  unapprovePurchaseOrder,
  approvePurchaseReceipt,
  unapprovePurchaseReceipt,
  inspectPurchaseReceipt,
  uninspectPurchaseReceipt,
  listReceiptReferenceLines,
  approvePurchaseInbound,
  unapprovePurchaseInbound,
  listInboundReferenceLines,
} from '@/api/mes/purchase';
import MaterialPicker from '@/components/MaterialPicker.vue';

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
  { value: 'APPROVED', label: '已审核' },
];
const receiptStatuses = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'APPROVED', label: '已审核' },
];
const inboundStatuses = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'APPROVED', label: '已审核' },
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
      {
        key: 'status',
        label: '状态',
        type: 'status',
        options: orderStatuses,
        required: true,
        readonly: true,
      },
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
      { key: 'supplierName', label: '供应商', required: true },
      { key: 'receiptDate', label: '到货日期', type: 'date', required: true },
      {
        key: 'status',
        label: '状态',
        type: 'status',
        options: receiptStatuses,
        required: true,
        readonly: true,
      },
      {
        key: 'inspectionStatus',
        label: '检验状态',
        type: 'status',
        options: inspectionStatuses,
        required: true,
        readonly: true,
      },
      { key: 'totalQuantity', label: '到货总数量', type: 'number', required: true, readonly: true },
    ],
  },
  inbound: {
    title: '入库单',
    code: 'inboundCode',
    api: purchaseInboundApi,
    fields: [
      { key: 'inboundCode', label: '入库单号', required: true },
      { key: 'inboundDate', label: '入库日期', type: 'date', required: true },
      { key: 'warehouseCode', label: '入库仓库', required: true },
      {
        key: 'status',
        label: '状态',
        type: 'status',
        options: inboundStatuses,
        required: true,
        readonly: true,
      },
      { key: 'totalQuantity', label: '入库总数量', type: 'number', required: true, readonly: true },
    ],
  },
  inventory: {
    title: '库存余额',
    code: 'materialCode',
    api: inventoryBalanceApi,
    fields: [
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

// 按钮权限标志
const permAdd = computed(() => {
  const map = { order: 'mes:purchaseOrder:add', receipt: 'mes:purchaseReceipt:add', inbound: 'mes:purchaseInbound:add' };
  return [map[type.value]];
});
const permEdit = computed(() => {
  const map = { order: 'mes:purchaseOrder:edit', receipt: 'mes:purchaseReceipt:edit', inbound: 'mes:purchaseInbound:edit' };
  return [map[type.value]];
});
const permRemove = computed(() => {
  const map = { order: 'mes:purchaseOrder:remove', receipt: 'mes:purchaseReceipt:remove', inbound: 'mes:purchaseInbound:remove' };
  return [map[type.value]];
});
const permApprove = computed(() => {
  const map = { order: 'mes:purchaseOrder:approve', receipt: 'mes:purchaseReceipt:approve', inbound: 'mes:purchaseInbound:approve' };
  return [map[type.value]];
});
const permUnapprove = computed(() => {
  const map = { order: 'mes:purchaseOrder:unapprove', receipt: 'mes:purchaseReceipt:unapprove', inbound: 'mes:purchaseInbound:unapprove' };
  return [map[type.value]];
});
const permDetail = computed(() => {
  const map = { order: 'mes:purchaseOrder:query', receipt: 'mes:purchaseReceipt:query', inbound: 'mes:purchaseInbound:query', inventory: 'mes:inventoryBalance:query' };
  return [map[type.value]];
});
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
const lineColumns = computed(() => {
  if (type.value === 'receipt') {
    return [
      { title: '来源订单', dataIndex: 'sourceOrderCode' },
      { title: '物料编码', dataIndex: 'materialCode' },
      { title: '物料名称', dataIndex: 'materialName' },
      { title: '到货数量', dataIndex: 'receivedQuantity' },
      { title: '合格数量', dataIndex: 'qualifiedQuantity' },
      { title: '不合格数量', dataIndex: 'rejectedQuantity' },
      { title: '仓库', dataIndex: 'warehouseCode' },
      { title: '单位', dataIndex: 'unit' },
    ];
  }
  if (type.value === 'inbound') {
    return [
      { title: '来源到货单', dataIndex: 'sourceReceiptCode' },
      { title: '物料编码', dataIndex: 'materialCode' },
      { title: '物料名称', dataIndex: 'materialName' },
      { title: '入库数量', dataIndex: 'inboundQuantity' },
      { title: '仓库', dataIndex: 'warehouseCode' },
      { title: '单位', dataIndex: 'unit' },
    ];
  }
  return [
    { title: '物料编码', dataIndex: 'materialCode' },
    { title: '物料名称', dataIndex: 'materialName' },
    { title: '采购数量', dataIndex: 'orderQuantity' },
    { title: '已到货', dataIndex: 'receivedQuantity' },
    { title: '已合格', dataIndex: 'qualifiedQuantity' },
    { title: '已入库', dataIndex: 'inboundQuantity' },
    { title: '单位', dataIndex: 'unit' },
  ];
});
const editLineColumns = [
  { title: '物料', key: 'material', width: 220 },
  { title: '物料编码', key: 'materialCode' },
  { title: '物料名称', key: 'materialName' },
  { title: '单位', key: 'unit', width: 90 },
  { title: '采购数量', key: 'orderQuantity', width: 110 },
  { title: '含税单价', key: 'unitPrice', width: 110 },
  { title: '操作', key: 'action', width: 60 },
];
const receiptLineColumns = [
  { title: '来源订单', dataIndex: 'sourceOrderCode' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '可到货数量', key: 'remainingQuantity' },
  { title: '本次到货数量', key: 'receivedQuantity', width: 150 },
  { title: '入库仓库', key: 'warehouseCode', width: 150 },
  { title: '单位', dataIndex: 'unit' },
];
const inboundLineColumns = [
  { title: '来源送货单', dataIndex: 'sourceReceiptCode' },
  { title: '来源订单', dataIndex: 'sourceOrderCode' },
  { title: '物料编码', dataIndex: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName' },
  { title: '可入库数量', key: 'remainingQuantity' },
  { title: '本次入库数量', key: 'inboundQuantity', width: 150 },
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

const rows = ref([]);
const loading = ref(false);
const selected = ref([]);
const formOpen = ref(false);
const detailOpen = ref(false);
const referenceOpen = ref(false);
const referenceLoading = ref(false);
const referenceRows = ref([]);
const referenceSelected = ref([]);
const referenceQuery = reactive({
  orderCode: '',
  supplierName: '',
  receiptCode: '',
  warehouseCode: '',
  materialCode: '',
});
const inspectionOpen = ref(false);
const inspectionReceiptId = ref();
const inspectionLines = ref([]);
const editing = ref(false);
const detail = ref({});
const editLines = ref([]);
const form = reactive({});
const query = reactive({ code: '', warehouseCode: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: true });
const referenceColumns = computed(() =>
  type.value === 'receipt'
    ? [
        { title: '采购订单', dataIndex: 'sourceOrderCode' },
        { title: '供应商', dataIndex: 'supplierName' },
        { title: '物料编码', dataIndex: 'materialCode' },
        { title: '物料名称', dataIndex: 'materialName' },
        { title: '剩余可到货', dataIndex: 'remainingQuantity' },
        { title: '单位', dataIndex: 'unit' },
      ]
    : [
        { title: '送货单', dataIndex: 'sourceReceiptCode' },
        { title: '采购订单', dataIndex: 'sourceOrderCode' },
        { title: '物料编码', dataIndex: 'materialCode' },
        { title: '物料名称', dataIndex: 'materialName' },
        { title: '剩余可入库', dataIndex: 'remainingQuantity' },
        { title: '仓库', dataIndex: 'warehouseCode' },
        { title: '单位', dataIndex: 'unit' },
      ]
);

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
  const today = new Date().toISOString().slice(0, 10);
  form.orderDate = today;
  form.receiptDate = today;
  form.inboundDate = today;
  form.status = type.value === 'inventory' ? 'NORMAL' : 'DRAFT';
  form.inspectionStatus = 'PENDING';
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
    remainingQuantity:
      type.value === 'receipt'
        ? line.receivedQuantity
        : type.value === 'inbound'
          ? line.inboundQuantity
          : undefined,
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
function materialLabel(line) {
  return line.materialCode ? `${line.materialCode} ${line.materialName || ''}` : '';
}
function selectOrderMaterial(line, material) {
  if (!material) {
    line.materialCode = '';
    line.materialName = '';
    line.spec = '';
    line.unit = '';
    return;
  }
  line.materialCode = material.materialCode || '';
  line.materialName = material.materialName || '';
  line.spec = material.spec || '';
  line.unit = material.unit || '';
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
function validateReferenceLines() {
  if (!editLines.value.length) {
    message.error('请先通过参照功能选择来源明细');
    return false;
  }
  const quantityKey = type.value === 'receipt' ? 'receivedQuantity' : 'inboundQuantity';
  const invalid = editLines.value.find(
    (line) =>
      Number(line[quantityKey]) <= 0 ||
      Number(line[quantityKey]) > Number(line.remainingQuantity) ||
      (type.value === 'receipt' && !String(line.warehouseCode || '').trim())
  );
  if (invalid) {
    message.error(
      type.value === 'receipt'
        ? '到货数量必须大于0且不能超过来源订单剩余数量，并填写入库仓库'
        : '入库数量必须大于0且不能超过合格未入库数量'
    );
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
  if ((type.value === 'receipt' || type.value === 'inbound') && !validateReferenceLines()) return;
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
  if (type.value === 'receipt') {
    payload.lines = editLines.value.map(({ _key, remainingQuantity, ...line }, index) => ({
      ...line,
      lineNo: index + 1,
    }));
    payload.totalQuantity = payload.lines.reduce(
      (sum, line) => sum + Number(line.receivedQuantity || 0),
      0
    );
  }
  if (type.value === 'inbound') {
    payload.lines = editLines.value.map(({ _key, remainingQuantity, ...line }, index) => ({
      ...line,
      lineNo: index + 1,
    }));
    payload.totalQuantity = payload.lines.reduce(
      (sum, line) => sum + Number(line.inboundQuantity || 0),
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
async function approve(record) {
  const action =
    type.value === 'order'
      ? approvePurchaseOrder
      : type.value === 'receipt'
        ? approvePurchaseReceipt
        : approvePurchaseInbound;
  await action(record.id);
  message.success('审核成功');
  load();
}
async function unapprove(record) {
  const action =
    type.value === 'order'
      ? unapprovePurchaseOrder
      : type.value === 'receipt'
        ? unapprovePurchaseReceipt
        : unapprovePurchaseInbound;
  await action(record.id);
  message.success('弃审成功');
  load();
}
async function openReference() {
  Object.keys(referenceQuery).forEach((key) => (referenceQuery[key] = ''));
  referenceSelected.value = [];
  referenceOpen.value = true;
  await loadReference();
}
async function loadReference() {
  referenceLoading.value = true;
  try {
    const result =
      type.value === 'receipt'
        ? await listReceiptReferenceLines({
            orderCode: referenceQuery.orderCode,
            supplierName: referenceQuery.supplierName,
            materialCode: referenceQuery.materialCode,
          })
        : await listInboundReferenceLines({
            receiptCode: referenceQuery.receiptCode,
            warehouseCode: referenceQuery.warehouseCode,
            materialCode: referenceQuery.materialCode,
          });
    referenceRows.value = (result.data || []).map((row, index) => ({
      ...row,
      _referenceKey:
        type.value === 'receipt'
          ? `o-${row.sourceOrderLineId}`
          : `r-${row.sourceReceiptLineId}-${index}`,
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
  const selectedRows = referenceRows.value.filter((row) =>
    referenceSelected.value.includes(row._referenceKey)
  );
  if (!selectedRows.length) {
    message.error('请选择至少一条来源明细');
    return;
  }
  if (type.value === 'receipt') {
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
  } else {
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
  }
  referenceOpen.value = false;
}
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
      Number(line.qualifiedQuantity) + Number(line.rejectedQuantity) !==
        Number(line.receivedQuantity)
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
.search-bar {
  margin-bottom: 16px;
}
.reference-search {
  display: flex;
  margin-bottom: 16px;
}
</style>
