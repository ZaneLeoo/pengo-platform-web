<template>
  <div>
    <ProTable ref="proTableRef" :api="tableApi" :columns="columns" :searchFields="searchFields" rowKey="id">
      <template #actions="{ selectedRowKeys, selectedRows }">
        <a-button type="primary" @click="openAdd" v-hasPermi="['base:warehouse:add']">新增</a-button>
        <a-button :disabled="selectedRowKeys.length !== 1" @click="openEdit(selectedRows[0])" v-hasPermi="['base:warehouse:edit']">修改</a-button>
        <a-button danger :disabled="!selectedRowKeys.length" @click="handleDelete(selectedRowKeys)" v-hasPermi="['base:warehouse:remove']">删除</a-button>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <dict-tag :options="statusDict" :value="record.status" />
        </template>
      </template>
    </ProTable>

    <a-modal v-model:open="formOpen" :title="editing ? '修改仓库' : '新增仓库'" width="600px" @ok="save">
      <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="仓库编码" name="warehouseCode">
          <a-input v-model:value="form.warehouseCode" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="仓库名称" name="warehouseName">
          <a-input v-model:value="form.warehouseName" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="仓库地址">
          <a-input v-model:value="form.address" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="负责人">
          <a-input v-model:value="form.manager" placeholder="请输入" />
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
import { useDict } from '@/composables/useDict'
import { warehouseApi } from '@/api/mes/base/warehouse'

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

const tableApi = { list: warehouseApi.list, delete: warehouseApi.remove }

const searchFields = [
  { name: 'warehouseCode', label: '仓库编码', type: 'input' },
  { name: 'warehouseName', label: '仓库名称', type: 'input' },
  { name: 'status', label: '状态', type: 'select', options: statusOpts },
]

const columns = [
  { title: '仓库编码', dataIndex: 'warehouseCode', key: 'warehouseCode', width: 130 },
  { title: '仓库名称', dataIndex: 'warehouseName', key: 'warehouseName', width: 180 },
  { title: '仓库地址', dataIndex: 'address', key: 'address', width: 200 },
  { title: '负责人', dataIndex: 'manager', key: 'manager', width: 100 },
  { title: '状态', key: 'status', width: 80 },
]

const rules = {
  warehouseCode: [{ required: true, message: '请输入仓库编码', trigger: 'blur' }],
  warehouseName: [{ required: true, message: '请输入仓库名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

function openAdd() {
  editing.value = false
  Object.keys(form).forEach(k => delete form[k])
  form.warehouseCode = ''; form.warehouseName = ''; form.status = 'NORMAL'
  formOpen.value = true
}

async function openEdit(row) {
  editing.value = true
  const res = await warehouseApi.get(row.id)
  Object.assign(form, res.data || row)
  formOpen.value = true
}

async function save() {
  try { await formRef.value.validate() } catch { return }
  await (editing.value ? warehouseApi.update(form) : warehouseApi.add(form))
  message.success('保存成功')
  formOpen.value = false
  proTableRef.value?.refresh()
}

async function handleDelete(ids) {
  await warehouseApi.remove(ids.join(','))
  message.success('删除成功')
  proTableRef.value?.refresh()
}
</script>
