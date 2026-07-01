<template>
  <a-modal v-model:open="visible" :title="title" width="600px" :destroyOnClose="true" @ok="handleOk" @cancel="handleCancel">
    <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
      <a-form-item label="BOM编码" name="bomCode">
        <a-input v-model:value="form.bomCode" placeholder="请输入BOM编码" :maxlength="64" />
      </a-form-item>
      <a-form-item label="母件物料" name="parentItemId">
        <MaterialPicker
          v-model="form.parentItemId"
          :label="parentItemLabel"
          placeholder="请选择母件物料"
          @select="handleParentItemSelected"
        />
      </a-form-item>
      <a-form-item label="BOM类型" name="bomType">
        <a-select v-model:value="form.bomType" placeholder="请选择BOM类型" :options="bomTypeOptions" />
      </a-form-item>
      <a-form-item label="状态" name="status">
        <a-select v-model:value="form.status" placeholder="请选择状态" :options="masterStatusOptions" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { getBomMaster, addBomMaster, updateBomMaster } from '@/api/mes/base'
import MaterialPicker from '@/components/MaterialPicker.vue'

const emit = defineEmits(['refresh'])
const formRef = ref()
const visible = ref(false)
const title = ref('新增BOM')
const isEdit = ref(false)
const parentItemLabel = ref('')

const form = reactive({
  bomCode: '', parentItemId: null, parentItemCode: '', parentItemName: '',
  parentItemSpec: '', parentItemUnit: '', bomType: 'MAKE', status: 'ACTIVE'
})

const bomTypeOptions = [
  { label: '制造BOM', value: 'MAKE' },
  { label: '委外BOM', value: 'OUTSOURCE' },
  { label: '采购BOM', value: 'BUY' },
]
const masterStatusOptions = [
  { label: '启用', value: 'ACTIVE' },
  { label: '停用', value: 'INACTIVE' },
]

const rules = {
  bomCode: [{ required: true, message: '请输入BOM编码', trigger: 'blur' }],
  parentItemId: [{ required: true, message: '请选择母件物料', trigger: 'change' }],
  bomType: [{ required: true, message: '请选择BOM类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

function resetForm() {
  Object.assign(form, {
    bomCode: '', parentItemId: null, parentItemCode: '', parentItemName: '',
    parentItemSpec: '', parentItemUnit: '', bomType: 'MAKE', status: 'ACTIVE'
  })
  parentItemLabel.value = ''
}

function handleParentItemSelected(m) {
  if (!m) {
    form.parentItemCode = ''; form.parentItemName = ''
    form.parentItemSpec = ''; form.parentItemUnit = ''
    nextTick(() => formRef.value?.clearValidate(['parentItemId']))
    return
  }
  form.parentItemCode = m.materialCode || ''
  form.parentItemName = m.materialName || ''
  form.parentItemSpec = m.spec || ''
  form.parentItemUnit = m.unit || ''
  nextTick(() => formRef.value?.clearValidate(['parentItemId']))
}

function openAddModal() {
  isEdit.value = false
  title.value = '新增BOM'
  resetForm()
  visible.value = true
}

function openUpdateModal(record) {
  isEdit.value = true
  title.value = '修改BOM'
  resetForm()
  getBomMaster(record.id).then(res => {
    const data = res.data
    Object.assign(form, data)
    if (data.parentItemCode) {
      parentItemLabel.value = `${data.parentItemCode} ${data.parentItemName || ''}`
    }
    visible.value = true
  })
}

function handleOk() {
  formRef.value?.validate().then(() => {
    const api = isEdit.value ? updateBomMaster : addBomMaster
    const data = { ...form }
    api(data).then(() => {
      message.success(isEdit.value ? '修改成功' : '新增成功')
      visible.value = false
      emit('refresh')
    })
  }).catch(() => {})
}

function handleCancel() { resetForm() }

defineExpose({ openAddModal, openUpdateModal })
</script>
