<template>
  <a-modal v-model:open="visible" :title="title" width="560px" :destroyOnClose="true" @ok="handleOk" @cancel="handleCancel">
    <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
      <a-form-item label="版本号" name="versionCode">
        <a-input v-model:value="form.versionCode" placeholder="请输入版本号" :maxlength="64" />
      </a-form-item>
      <a-form-item label="版本名称" name="versionName">
        <a-input v-model:value="form.versionName" placeholder="请输入版本名称" :maxlength="64" />
      </a-form-item>
      <a-form-item label="版本说明">
        <a-textarea v-model:value="form.versionDesc" placeholder="请输入版本说明" :rows="2" :maxlength="200" />
      </a-form-item>
      <a-form-item label="基准数量" name="baseQty">
        <a-input-number v-model:value="form.baseQty" :min="0" :precision="2" style="width:100%" />
      </a-form-item>
      <a-form-item label="用途" name="usageType">
        <a-select v-model:value="form.usageType" placeholder="请选择用途" :options="usageTypeOptions" />
      </a-form-item>
      <a-form-item label="生效日期">
        <a-date-picker v-model:value="form.effectiveDate" value-format="YYYY-MM-DD" style="width:100%" />
      </a-form-item>
      <a-form-item label="失效日期">
        <a-date-picker v-model:value="form.expireDate" value-format="YYYY-MM-DD" style="width:100%" />
      </a-form-item>
      <a-form-item label="版本状态" name="status">
        <a-select v-model:value="form.status" placeholder="请选择版本状态" :options="statusOptions" />
      </a-form-item>
      <a-form-item label="审批状态" name="approveStatus">
        <a-select v-model:value="form.approveStatus" placeholder="请选择审批状态" :options="approveStatusOptions" />
      </a-form-item>
      <a-form-item label="设为默认">
        <a-switch v-model:checked="form.defaultFlag" :checked-value="1" :un-checked-value="0" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { getBomVersion, addBomVersion, updateBomVersion, copyBomVersion } from '@/api/mes/base'
import { submitBomVersionForm } from './bomVersionSubmit.js'

const emit = defineEmits(['refresh'])
const props = defineProps({ bomMasterId: { type: Number, required: true } })

const formRef = ref()
const visible = ref(false)
const title = ref('新增版本')
const isEdit = ref(false)
const isCopy = ref(false)

const form = reactive({
  versionCode: '', versionName: '', versionDesc: '', baseQty: 1,
  usageType: 'PRODUCTION', effectiveDate: null, expireDate: null,
  status: 'DRAFT', approveStatus: 'PENDING', defaultFlag: 0, bomMasterId: props.bomMasterId,
  sourceVersionId: null
})

const usageTypeOptions = [
  { label: '生产', value: 'PRODUCTION' }, { label: '试制', value: 'TRIAL' }, { label: '维修', value: 'REPAIR' }
]
const statusOptions = [
  { label: '草稿', value: 'DRAFT' }, { label: '生效', value: 'EFFECTIVE' }, { label: '冻结', value: 'FROZEN' }
]
const approveStatusOptions = [
  { label: '待审批', value: 'PENDING' }, { label: '已审批', value: 'APPROVED' }, { label: '驳回', value: 'REJECTED' }
]

const rules = {
  versionCode: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  baseQty: [{ required: true, message: '请输入基准数量', trigger: 'blur' }],
  usageType: [{ required: true, message: '请选择用途', trigger: 'change' }],
  status: [{ required: true, message: '请选择版本状态', trigger: 'change' }],
  approveStatus: [{ required: true, message: '请选择审批状态', trigger: 'change' }],
}

function resetForm() {
  Object.assign(form, {
    versionCode: '', versionName: '', versionDesc: '', baseQty: 1,
    usageType: 'PRODUCTION', effectiveDate: null, expireDate: null,
    status: 'DRAFT', approveStatus: 'PENDING', defaultFlag: 0, bomMasterId: props.bomMasterId,
    sourceVersionId: null
  })
}

function openAddModal() {
  isEdit.value = false; isCopy.value = false
  title.value = '新增版本'
  resetForm(); visible.value = true
}

function openCopyModal(sourceRecord) {
  isEdit.value = false; isCopy.value = true
  title.value = '复制版本'
  resetForm()
  Object.assign(form, {
    ...sourceRecord,
    sourceVersionId: sourceRecord.id,
    versionCode: '', versionName: '', id: undefined, createTime: undefined, updateTime: undefined,
    versionDesc: sourceRecord.versionDesc || '',
    defaultFlag: 0, bomMasterId: props.bomMasterId
  })
  visible.value = true
}

function openUpdateModal(record) {
  isEdit.value = true; isCopy.value = false
  title.value = '修改版本'
  resetForm()
  getBomVersion(record.id).then(res => {
    Object.assign(form, res.data)
    visible.value = true
  })
}

function handleOk() {
  formRef.value?.validate().then(() => {
    submitBomVersionForm({
      isEdit: isEdit.value,
      isCopy: isCopy.value,
      form: { ...form },
      addBomVersion,
      updateBomVersion,
      copyBomVersion
    }).then(() => {
      message.success(isEdit.value ? '修改成功' : (isCopy.value ? '复制成功' : '新增成功'))
      visible.value = false
      emit('refresh')
    })
  }).catch(() => {})
}

function handleCancel() { resetForm() }

defineExpose({ openAddModal, openCopyModal, openUpdateModal })
</script>
