<template>
  <a-card :bordered="false">
    <a-space class="search-bar">
      <a-input v-model:value="query.code" placeholder="物料编码" allow-clear @pressEnter="load" />
      <a-input v-model:value="query.warehouseCode" placeholder="仓库编码" allow-clear @pressEnter="load" />
      <a-button type="primary" @click="load">查询</a-button>
      <a-button @click="reset">重置</a-button>
    </a-space>

    <a-table
      :loading="loading"
      :data-source="rows"
      :columns="columns"
      row-key="id"
      :pagination="pagination"
      @change="pageChange"
    >
      <template #bodyCell="{ column, record }">
        <a-space v-if="column.key === 'action'">
          <a v-hasPermi="['mes:inventoryBalance:query']" @click="openDetail(record)">详情</a>
        </a-space>
      </template>
    </a-table>

    <!-- 详情抽屉 -->
    <a-drawer v-model:open="detailOpen" title="库存详情" width="760px">
      <a-descriptions bordered :column="1">
        <a-descriptions-item label="物料编码">{{ detail.materialCode ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="物料名称">{{ detail.materialName ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="仓库编码">{{ detail.warehouseCode ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="库位编码">{{ detail.locationCode ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="批次号">{{ detail.lotNo ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="单位">{{ detail.unit ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="库存数量">{{ detail.quantity ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="可用数量">{{ detail.availableQuantity ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="锁定数量">{{ detail.lockedQuantity ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="状态">{{ detail.status ?? '-' }}</a-descriptions-item>
      </a-descriptions>
    </a-drawer>
  </a-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { inventoryBalanceApi } from '@/api/mes/purchase/inventory';

const rows = ref([]);
const loading = ref(false);
const detailOpen = ref(false);
const detail = ref({});
const query = reactive({ code: '', warehouseCode: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: true });

const columns = [
  { title: '物料编码', dataIndex: 'materialCode', key: 'materialCode' },
  { title: '物料名称', dataIndex: 'materialName', key: 'materialName' },
  { title: '仓库编码', dataIndex: 'warehouseCode', key: 'warehouseCode' },
  { title: '库位编码', dataIndex: 'locationCode', key: 'locationCode' },
  { title: '批次号', dataIndex: 'lotNo', key: 'lotNo' },
  { title: '单位', dataIndex: 'unit', key: 'unit' },
  { title: '库存数量', dataIndex: 'quantity', key: 'quantity' },
  { title: '可用数量', dataIndex: 'availableQuantity', key: 'availableQuantity' },
  { title: '锁定数量', dataIndex: 'lockedQuantity', key: 'lockedQuantity' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '操作', key: 'action', fixed: 'right' },
];

async function load() {
  loading.value = true;
  try {
    const params = {
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      materialCode: query.code,
    };
    if (query.warehouseCode) params.warehouseCode = query.warehouseCode;
    const result = await inventoryBalanceApi.list(params);
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

async function openDetail(row) {
  const result = await inventoryBalanceApi.get(row.id);
  detail.value = result.data || row;
  detailOpen.value = true;
}

onMounted(load);
</script>

<style scoped>
.search-bar { margin-bottom: 16px; }
</style>
