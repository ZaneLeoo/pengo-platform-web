<template>
  <a-modal v-model:open="visible" :title="title" width="560px" :destroyOnClose="true" @ok="handleOk" @cancel="handleCancel">
    <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
      <a-form-item label="行号" name="lineNo">
        <a-input-number v-model:value="form.lineNo" :min="1" style="width:100%" placeholder="自动分配" />
      </a-form-item>
      <a-divider>物料信息</a-divider>
      <a-form-item label="子件物料" name="componentItemId">
        <MaterialPicker
          v-model="form.componentItemId"
          :label="componentItemLabel"
          placeholder="请选择子件物料"
          @select="handleComponentItemSelected"
        />
      </a-form-item>
      <a-form-item v-if="versionOptions.length > 0" label="引用版本" name="componentBomVersionId">
        <a-select v-model:value="form.componentBomVersionId" placeholder="选择BOM版本（留空取默认）" allowClear :options="versionOptions" />
      </a-form-item>
      <a-divider>用量与发料</a-divider>
      <a-form-item label="用量" name="componentQty">
        <a-input-number v-model:value="form.componentQty" :min="0.001" :precision="3" style="width:100%" />
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
import { ref, reactive, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { getBomItem, addBomItem, updateBomItem, listBomMaster, listBomVersion } from '@/api/mes/base'
import MaterialPicker from '@/components/MaterialPicker.vue'
import { validatePositiveNumber } from './bomItemValidation.js'

const emit = defineEmits(['refresh'])
const props = defineProps({ bomVersionId: { type: Number, required: true }, parentItemCode: { type: String, default: null } })

const formRef = ref()
const visible = ref(false)
const title = ref('新增子件')
const isEdit = ref(false)
const componentItemLabel = ref('')
const versionOptions = ref([])

const form = reactive({
  lineNo: 10, componentItemId: null, componentItemCode: '', componentItemName: '',
  componentItemSpec: '', componentItemUnit: '', componentQty: 1,
  supplyType: 'PICK', fixedLossQty: 0, changeLossRate: 0,
  isVirtual: 0, mrpExpandFlag: 1, bomVersionId: props.bomVersionId,
  componentBomVersionId: null
})

const supplyTypeOptions = [
  { label: '领料', value: 'PICK' }, { label: '倒冲', value: 'BACKFLUSH' }, { label: '关键件', value: 'KEY' }
]

const rules = {
  lineNo: [{ required: true, message: '请输入行号', trigger: 'blur' }],
  componentItemId: [{ required: true, message: '请选择子件物料', trigger: 'change' }],
  componentQty: [
    { required: true, message: '请输入用量', trigger: 'blur' },
    { validator: validatePositiveNumber('用量必须大于0'), trigger: 'change' }
  ],
  supplyType: [{ required: true, message: '请选择发料方式', trigger: 'change' }],
}

function resetForm() {
  Object.assign(form, {
    lineNo: 10, componentItemId: null, componentItemCode: '', componentItemName: '',
    componentItemSpec: '', componentItemUnit: '', componentQty: 1,
    supplyType: 'PICK', fixedLossQty: 0, changeLossRate: 0,
    isVirtual: 0, mrpExpandFlag: 1, bomVersionId: props.bomVersionId,
    componentBomVersionId: null
  })
  componentItemLabel.value = ''
  versionOptions.value = []
}

function handleComponentItemSelected(m) {
  versionOptions.value = []
  form.componentBomVersionId = null
  if (!m) {
    form.componentItemCode = ''; form.componentItemName = ''
    form.componentItemSpec = ''; form.componentItemUnit = ''
    nextTick(() => formRef.value?.clearValidate(['componentItemId']))
    return
  }
  form.componentItemCode = m.materialCode || ''
  form.componentItemName = m.materialName || ''
  form.componentItemSpec = m.spec || ''
  form.componentItemUnit = m.unit || ''
  nextTick(() => formRef.value?.clearValidate(['componentItemId']))
  // 如果是自制/委外件，加载其BOM版本列表
  if (m.sourceType === 'MAKE' || m.sourceType === 'OUTSOURCE') {
    listBomMaster({ parentItemCode: m.materialCode }).then(res => {
      const masters = res.rows || []
      if (!masters.length) return
      listBomVersion({ bomMasterId: masters[0].id }).then(vRes => {
        const versions = vRes.rows || []
        versionOptions.value = versions.map(v => ({
          label: `${v.versionCode} ${v.versionName || ''}${v.defaultFlag === 1 ? ' (默认)' : ''}`,
          value: v.id
        }))
        // 自动选择默认版本
        const defaultVer = versions.find(v => v.defaultFlag === 1)
        if (defaultVer) {
          form.componentBomVersionId = defaultVer.id
        }
      })
    })
  }
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
  getBomItem(record.id).then(res => {
    const data = res.data
    Object.assign(form, data)
    if (data.componentItemCode) {
      componentItemLabel.value = `${data.componentItemCode} ${data.componentItemName || ''}`
      // 加载该物料可选的BOM版本
      listBomMaster({ parentItemCode: data.componentItemCode }).then(mRes => {
        const masters = mRes.rows || []
        if (!masters.length) return
        listBomVersion({ bomMasterId: masters[0].id }).then(vRes => {
          const versions = vRes.rows || []
          versionOptions.value = versions.map(v => ({
            label: `${v.versionCode} ${v.versionName || ''}${v.defaultFlag === 1 ? ' (默认)' : ''}`,
            value: v.id
          }))
        })
      })
    }
    visible.value = true
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
