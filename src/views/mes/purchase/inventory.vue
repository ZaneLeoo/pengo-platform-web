<template>
  <div>
    <ProTable
      ref="proTableRef"
      :api="tableApi"
      :columns="columns"
      :searchFields="searchFields"
      rowKey="id"
    >
      <template #bodyCell="{ column, record }">
        <a-space v-if="column.key === 'action'">
          <a v-hasPermi="['mes:inventoryBalance:query']" @click="openDetail(record)">详情</a>
        </a-space>
      </template>
    </ProTable>

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
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ProTable from '@/components/BearJiaProTable/index.vue'
import { inventoryBalanceApi } from '@/api/mes/purchase/inventory'

const proTableRef = ref()
const detailOpen = ref(false)
const detail = ref({})

const tableApi = { list: inventoryBalanceApi.list }

const searchFields = [
  { name: 'materialCode', label: '物料编码', type: 'input' },
  { name: 'warehouseCode', label: '仓库编码', type: 'input' },
]

const columns = [
  { title: '物料编码', dataIndex: 'materialCode', key: 'materialCode', width: 120 },
  { title: '物料名称', dataIndex: 'materialName', key: 'materialName', width: 150 },
  { title: '仓库编码', dataIndex: 'warehouseCode', key: 'warehouseCode', width: 120 },
  { title: '库位编码', dataIndex: 'locationCode', key: 'locationCode', width: 120 },
  { title: '批次号', dataIndex: 'lotNo', key: 'lotNo', width: 100 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 70 },
  { title: '库存数量', dataIndex: 'quantity', key: 'quantity', width: 100 },
  { title: '可用数量', dataIndex: 'availableQuantity', key: 'availableQuantity', width: 100 },
  { title: '锁定数量', dataIndex: 'lockedQuantity', key: 'lockedQuantity', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

async function openDetail(row) {
  const result = await inventoryBalanceApi.get(row.id)
  detail.value = result.data || row
  detailOpen.value = true
}
</script>
