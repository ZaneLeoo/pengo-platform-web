<template>
  <div>
    <ProTable ref="proTableRef" :api="tableApi" :columns="columns" :searchFields="searchFields" rowKey="id">
      <template #actions="{ selectedRowKeys, selectedRows }">
        <a-button type="primary" @click="openAdd" v-hasPermi="['mes:supplier:add']">新增</a-button>
        <a-button :disabled="selectedRowKeys.length !== 1" @click="openEdit(selectedRows[0])" v-hasPermi="['mes:supplier:edit']">修改</a-button>
        <a-button danger :disabled="!selectedRowKeys.length" @click="handleDelete(selectedRowKeys)" v-hasPermi="['mes:supplier:remove']">删除</a-button>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <dict-tag :options="statusDict" :value="record.status" />
        </template>
      </template>
    </ProTable>

    <a-modal v-model:open="formOpen" :title="editing ? '修改供应商' : '新增供应商'" width="600px" @ok="save">
      <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="供应商编码" name="supplierCode">
          <a-input v-model:value="form.supplierCode" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="供应商名称" name="supplierName">
          <a-input v-model:value="form.supplierName" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="联系人">
          <a-input v-model:value="form.contactPerson" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="联系电话">
          <a-input v-model:value="form.contactPhone" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="地址">
          <a-input v-model:value="form.address" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="币种">
          <a-input v-model:value="form.currency" placeholder="如：CNY" />
        </a-form-item>
        <a-form-item label="税率(%)">
          <a-input-number v-model:value="form.taxRate" :min="0" :max="100" style="width:100%" placeholder="如：13" />
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
import { supplierApi } from '@/api/mes/base/supplier'

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

const tableApi = { list: supplierApi.list, delete: supplierApi.remove }

const searchFields = [
  { name: 'supplierCode', label: '供应商编码', type: 'input' },
  { name: 'supplierName', label: '供应商名称', type: 'input' },
  { name: 'status', label: '状态', type: 'select', options: statusOpts },
]

const columns = [
  { title: '供应商编码', dataIndex: 'supplierCode', key: 'supplierCode', width: 130 },
  { title: '供应商名称', dataIndex: 'supplierName', key: 'supplierName', width: 180 },
  { title: '联系人', dataIndex: 'contactPerson', key: 'contactPerson', width: 100 },
  { title: '联系电话', dataIndex: 'contactPhone', key: 'contactPhone', width: 130 },
  { title: '币种', dataIndex: 'currency', key: 'currency', width: 70 },
  { title: '税率(%)', dataIndex: 'taxRate', key: 'taxRate', width: 80 },
  { title: '状态', key: 'status', width: 80 },
]

const rules = {
  supplierCode: [{ required: true, message: '请输入供应商编码', trigger: 'blur' }],
  supplierName: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

function openAdd() {
  editing.value = false
  Object.keys(form).forEach(k => delete form[k])
  form.supplierCode = ''; form.supplierName = ''; form.status = 'NORMAL'
  form.currency = 'CNY'
  formOpen.value = true
}

async function openEdit(row) {
  editing.value = true
  const res = await supplierApi.get(row.id)
  Object.assign(form, res.data || row)
  formOpen.value = true
}

async function save() {
  try { await formRef.value.validate() } catch { return }
  await (editing.value ? supplierApi.update(form) : supplierApi.add(form))
  message.success('保存成功')
  formOpen.value = false
  proTableRef.value?.refresh()
}

async function handleDelete(ids) {
  await supplierApi.remove(ids.join(','))
  message.success('删除成功')
  proTableRef.value?.refresh()
}
</script>
