<template>
  <a-modal v-model:open="visible" :title="title" width="560px" :destroyOnClose="true" @ok="handleOk" @cancel="handleCancel">
    <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
      <a-form-item label="行号" name="lineNo">
        <a-input-number v-model:value="form.lineNo" :min="1" style="width:100%" placeholder="自动分配" />
      </a-form-item>
      <a-divider>物料信息</a-divider>
      <a-form-item label="子件物料" name="componentItemId">
        <a-select
          v-model:value="form.componentItemId"
          placeholder="请选择子件物料"
          show-search
          :filter-option="false"
          :options="materialOptions"
          @search="handleMaterialSearch"
          @change="handleMaterialChange"
        />
      </a-form-item>
      <a-form-item label="子件编码">
        <a-input v-model:value="form.componentItemCode" disabled />
      </a-form-item>
      <a-form-item label="子件名称">
        <a-input v-model:value="form.componentItemName" disabled />
      </a-form-item>
      <a-form-item label="子件规格">
        <a-input v-model:value="form.componentItemSpec" disabled />
      </a-form-item>
      <a-form-item label="子件单位">
        <a-input v-model:value="form.componentItemUnit" disabled />
      </a-form-item>
      <a-divider>用量与发料</a-divider>
      <a-form-item label="用量" name="componentQty">
        <a-input-number v-model:value="form.componentQty" :min="0" :precision="3" style="width:100%" />
      </a-form-item>
      <a-form-item label="发料方式" name="supplyType">
        <a-select v-model:value="form.supplyType" :options="supplyTypeOptions" placeholder="请选择发料方式" />
      </a-form-item>
      <a-form-item label="固定损耗">
        <a-input-number v-model:value="form.fixedLossQty" :min="0" :precision="3" style="width:100%" />
      </a-form-item>
      <a-form-item label="变动损耗率(%)">
        <a-input-number v-model:value="form.changeLossRate" :min="0" :max="100" :precision="2" style="width:100%" />
      </a-form-item>
      <a-form-item label="是否虚拟件">
        <a-switch v-model:checked="form.isVirtual" :checked-value="1" :un-checked-value="0" />
      </a-form-item>
      <a-form-item label="MRP展开">
        <a-switch v-model:checked="form.mrpExpandFlag" :checked-value="1" :un-checked-value="0" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { getBomItem, addBomItem, updateBomItem } from '@/api/mes/base'
import { listMaterial, getMaterial } from '@/api/mes/base'
import { resolveBomItemMaterial } from './bomItemMaterialResolve.js'

const emit = defineEmits(['refresh'])
const props = defineProps({ bomVersionId: { type: Number, required: true }, parentItemCode: { type: String, default: null } })

const formRef = ref()
const visible = ref(false)
const title = ref('新增子件')
const isEdit = ref(false)
const materialOptions = ref([])

const form = reactive({
  lineNo: 10, componentItemId: null, componentItemCode: '', componentItemName: '',
  componentItemSpec: '', componentItemUnit: '', componentQty: 1,
  supplyType: 'PICK', fixedLossQty: 0, changeLossRate: 0,
  isVirtual: 0, mrpExpandFlag: 1, bomVersionId: props.bomVersionId
})

const supplyTypeOptions = [
  { label: '领料', value: 'PICK' }, { label: '倒冲', value: 'BACKFLUSH' }, { label: '关键件', value: 'KEY' }
]

const rules = {
  lineNo: [{ required: true, message: '请输入行号', trigger: 'blur' }],
  componentItemId: [{ required: true, message: '请选择子件物料', trigger: 'change' }],
  componentQty: [{ required: true, message: '请输入用量', trigger: 'blur' }],
  supplyType: [{ required: true, message: '请选择发料方式', trigger: 'change' }],
}

function resetForm() {
  Object.assign(form, {
    lineNo: 10, componentItemId: null, componentItemCode: '', componentItemName: '',
    componentItemSpec: '', componentItemUnit: '', componentQty: 1,
    supplyType: 'PICK', fixedLossQty: 0, changeLossRate: 0,
    isVirtual: 0, mrpExpandFlag: 1, bomVersionId: props.bomVersionId
  })
  materialOptions.value = []
}

async function handleMaterialSearch(keyword) {
  if (!keyword) { materialOptions.value = []; return }
  const query = { pageNum: 1, pageSize: 20 }
  if (/^[A-Za-z0-9_-]+$/.test(keyword)) {
    query.materialCode = keyword
  } else {
    query.materialName = keyword
  }
  const res = await listMaterial(query)
  materialOptions.value = (res.rows || []).map(m => ({
    label: `${m.materialCode} ${m.materialName}`, value: m.materialId
  }))
}

async function handleMaterialChange(val) {
  try {
    const res = await getMaterial(val)
    const m = res.data
    if (m) {
      form.componentItemCode = m.materialCode || ''
      form.componentItemName = m.materialName || ''
      form.componentItemSpec = m.spec || ''
      form.componentItemUnit = m.unit || ''
    }
  } catch (e) { /* ignore */ }
}

function openAddModal(lineNo, parentItemCode) {
  isEdit.value = false; title.value = parentItemCode ? `新增子件（父件: ${parentItemCode}）` : '新增子件'
  resetForm(); form.lineNo = lineNo || 10
  form.parentItemCode = parentItemCode || null
  visible.value = true
}

function openUpdateModal(record) {
  isEdit.value = true; title.value = '修改子件'
  resetForm()
  getBomItem(record.id).then(async res => {
    Object.assign(form, res.data)
    await resolveBomItemMaterial({ form, materialOptions: materialOptions.value, listMaterial })
    visible.value = true
    setTimeout(() => formRef.value?.clearValidate?.(['componentItemId']), 0)
  })
}

function handleOk() {
  formRef.value?.validate().then(() => {
    const api = isEdit.value ? updateBomItem : addBomItem
    api({ ...form }).then(() => {
      message.success(isEdit.value ? '修改成功' : '新增成功')
      visible.value = false
      emit('refresh')
    })
  }).catch(() => {})
}

function handleCancel() { resetForm() }

defineExpose({ openAddModal, openUpdateModal })
</script>
