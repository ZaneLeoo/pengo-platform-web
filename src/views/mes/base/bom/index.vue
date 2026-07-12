<template>
  <div>
    <ProTable
      ref="proTableRef"
      :api="tableApi"
      :columns="columns"
      :initialSearchParams="initialSearchParams"
      :searchFields="searchFields"
      rowKey="id"
    >
      <template #actions="{ selectedRowKeys, delete: deleteRows }">
        <a-button v-hasPermi="['base:bomMaster:add']" type="primary" @click="openAddModal">
          <BearJiaIcon icon="plus-outlined" />新增
        </a-button>
        <a-button v-hasPermi="['base:bomMaster:remove']" :disabled="selectedRowKeys.length <= 0" danger type="primary" @click="() => deleteRows()">
          <BearJiaIcon icon="delete-outlined" />删除
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'bomType'">
          <a-tag :color="bomTypeMap[record.bomType]?.color">{{ bomTypeMap[record.bomType]?.label || record.bomType }}</a-tag>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.status === 'ACTIVE' ? 'green' : 'default'">{{ record.status === 'ACTIVE' ? '启用' : '停用' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'operate'">
          <a-space>
            <a @click="openVersion(record)" v-hasPermi="['base:bomVersion:list']">版本</a>
            <a @click="openUpdateModal(record)" v-hasPermi="['base:bomMaster:edit']">编辑</a>
            <a-popconfirm title="确认删除?" @confirm="handleDeleteSingle(record)">
              <a class="danger-text" v-hasPermi="['base:bomMaster:remove']">删除</a>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </ProTable>

    <BomAddUpdateModal ref="addUpdateModalRef" @refresh="handleRefresh" />
  </div>
</template>

<script setup name="BomMaster">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { listBomMaster, delBomMaster } from '@/api/mes/base'
import ProTable from '@/components/BearJiaProTable/index.vue'
import BomAddUpdateModal from './BomAddUpdateModal.vue'
import { BearJiaIcon } from '@/utils/BearJiaIcon.js'

const router = useRouter()
const proTableRef = ref()
const addUpdateModalRef = ref()

const bomTypeMap = {
  MAKE: { label: '制造', color: 'blue' },
  OUTSOURCE: { label: '委外', color: 'orange' },
  BUY: { label: '采购', color: 'purple' },
}

const tableApi = { list: listBomMaster, delete: (ids) => delBomMaster(ids.join(',')) }
const initialSearchParams = { parentItemCode: null, bomCode: null, bomType: null, status: null }

const searchFields = computed(() => [
  { name: 'parentItemCode', label: '母件编码', type: 'input' },
  { name: 'bomCode', label: 'BOM编码', type: 'input' },
  { name: 'bomType', label: 'BOM类型', type: 'select', options: [
    { label: '制造', value: 'MAKE' }, { label: '委外', value: 'OUTSOURCE' }, { label: '采购', value: 'BUY' }
  ]},
  { name: 'status', label: '状态', type: 'select', options: [
    { label: '启用', value: 'ACTIVE' }, { label: '停用', value: 'INACTIVE' }
  ]},
])

const columns = [
  { title: 'BOM编码', dataIndex: 'bomCode', key: 'bomCode', width: 140 },
  { title: '母件编码', dataIndex: 'parentItemCode', key: 'parentItemCode', width: 140 },
  { title: '母件名称', dataIndex: 'parentItemName', key: 'parentItemName', width: 160 },
  { title: '母件规格', dataIndex: 'parentItemSpec', key: 'parentItemSpec', width: 140 },
  { title: 'BOM类型', dataIndex: 'bomType', key: 'bomType', width: 90 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 70 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
  { title: '操作', key: 'operate', width: 160, fixed: 'right' },
]

function openAddModal() { addUpdateModalRef.value?.openAddModal() }
function openUpdateModal(record) { addUpdateModalRef.value?.openUpdateModal(record) }
function openVersion(record) { router.push({ name: 'BomDetail', params: { id: record.id } }) }
function handleRefresh() { proTableRef.value?.refresh() }

async function handleDeleteSingle(record) {
  await delBomMaster(record.id)
  message.success('删除成功')
  handleRefresh()
}
</script>

<style lang="less" scoped>
.danger-text { color: #ff4d4f; }
</style>
