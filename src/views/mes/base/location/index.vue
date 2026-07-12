<template>
  <div>
    <ProTable ref="proTableRef" :api="tableApi" :columns="columns" :searchFields="searchFields" rowKey="id">
      <template #actions="{ selectedRowKeys, selectedRows }">
        <a-button type="primary" @click="openAdd" v-hasPermi="['base:location:add']">新增</a-button>
        <a-button :disabled="selectedRowKeys.length !== 1" @click="openEdit(selectedRows[0])" v-hasPermi="['base:location:edit']">修改</a-button>
        <a-button danger :disabled="!selectedRowKeys.length" @click="handleDelete(selectedRowKeys)" v-hasPermi="['base:location:remove']">删除</a-button>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <dict-tag :options="statusDict" :value="record.status" />
        </template>
      </template>
    </ProTable>

    <a-modal v-model:open="formOpen" :title="editing ? '修改库位' : '新增库位'" width="600px" @ok="save">
      <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="库位编码" name="locationCode">
          <a-input v-model:value="form.locationCode" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="库位名称" name="locationName">
          <a-input v-model:value="form.locationName" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="所属仓库" name="warehouseId">
          <WarehousePicker v-model="form.warehouseId" :label="form.warehouseName" @select="onWarehouseSelect" placeholder="请选择仓库" />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-select v-model:value="form.status" :options="statusOpts" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import ProTable from '@/components/BearJiaProTable/index.vue'
import DictTag from '@/components/DictTag/index.vue'
import WarehousePicker from '@/components/WarehousePicker.vue'
import { useDict } from '@/composables/useDict'
import { locationApi } from '@/api/mes/base/location'

const proTableRef = ref()
const formRef = ref()
const formOpen = ref(false)
const editing = ref(false)
const form = reactive({})

const { mes_archive_status: statusDict } = useDict('mes_archive_status')
const statusOpts = [
  { value: 'NORMAL', label: '正常' },
  { value: 'DISABLED', label: '停用' },
]

const tableApi = { list: locationApi.list, delete: locationApi.remove }

const searchFields = [
  { name: 'locationCode', label: '库位编码', type: 'input' },
  { name: 'locationName', label: '库位名称', type: 'input' },
  { name: 'status', label: '状态', type: 'select', options: statusOpts },
]

const columns = [
  { title: '库位编码', dataIndex: 'locationCode', key: 'locationCode', width: 130 },
  { title: '库位名称', dataIndex: 'locationName', key: 'locationName', width: 150 },
  { title: '所属仓库', dataIndex: 'warehouseName', key: 'warehouseName', width: 150 },
  { title: '状态', key: 'status', width: 80 },
]

const rules = {
  locationCode: [{ required: true, message: '请输入库位编码', trigger: 'blur' }],
  locationName: [{ required: true, message: '请输入库位名称', trigger: 'blur' }],
  warehouseId: [{ required: true, message: '请选择所属仓库', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

function onWarehouseSelect(w) {
  if (w) {
    form.warehouseCode = w.warehouseCode
    form.warehouseName = w.warehouseName
  }
}

function openAdd() {
  editing.value = false
  Object.keys(form).forEach(k => delete form[k])
  form.locationCode = ''; form.locationName = ''; form.status = 'NORMAL'
  form.warehouseId = null
  formOpen.value = true
}

async function openEdit(row) {
  editing.value = true
  const res = await locationApi.get(row.id)
  Object.assign(form, res.data || row)
  formOpen.value = true
}

async function save() {
  try { await formRef.value.validate() } catch { return }
  await (editing.value ? locationApi.update(form) : locationApi.add(form))
  message.success('保存成功')
  formOpen.value = false
  proTableRef.value?.refresh()
}

async function handleDelete(ids) {
  await locationApi.remove(ids.join(','))
  message.success('删除成功')
  proTableRef.value?.refresh()
}
</script>
