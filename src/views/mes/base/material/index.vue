<template>
  <div>
    <a-row :gutter="16">
      <!-- 左侧分类树 -->
      <a-col :span="6">
        <a-card title="物料分类">
          <a-tree
            v-if="categoryTree.length"
            :tree-data="categoryTree"
            :field-names="{ children: 'children', title: 'categoryName', key: 'categoryId' }"
            :default-expand-all="true"
            @select="handleTreeSelect"
          />
          <a-empty v-else description="暂无分类" />
        </a-card>
      </a-col>

      <!-- 右侧表格 -->
      <a-col :span="18">
        <ProTable
          ref="proTableRef"
          :api="tableApi"
          :columns="columns"
          :searchFields="searchFields"
          :initialSearchParams="initialSearchParams"
          :exportConfig="exportConfig"
          rowKey="materialId"
        >
          <template #actions="{ selectedRowKeys, selectedRows }">
            <a-button type="primary" @click="handleAdd" v-hasPermi="['mes:material:add']">新增物料</a-button>
            <a-button :disabled="selectedRowKeys.length !== 1" @click="handleEdit(selectedRows[0])" v-hasPermi="['mes:material:edit']">修改</a-button>
            <a-button danger :disabled="!selectedRowKeys.length" @click="handleDelete(selectedRowKeys)" v-hasPermi="['mes:material:remove']">删除</a-button>
            <a-button @click="handleExport" v-hasPermi="['mes:material:export']">导出</a-button>
          </template>
        </ProTable>
      </a-col>
    </a-row>

    <!-- 新增/编辑弹窗 -->
    <a-modal v-model:open="open" :title="title" width="800px" @ok="submitForm" @cancel="open = false" :confirmLoading="submitting">
      <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-divider>基本信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="物料编码" name="materialCode">
              <a-input v-model:value="form.materialCode" placeholder="请输入物料编码" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="物料名称" name="materialName">
              <a-input v-model:value="form.materialName" placeholder="请输入物料名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="物料类型" name="materialType">
              <a-select v-model:value="form.materialType" placeholder="请选择">
                <a-select-option value="RAW">原材料</a-select-option>
                <a-select-option value="SEMI">半成品</a-select-option>
                <a-select-option value="FINISHED">成品</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="来源类型" name="sourceType">
              <a-select v-model:value="form.sourceType" placeholder="请选择">
                <a-select-option value="MAKE">自制</a-select-option>
                <a-select-option value="PURCHASE">外购</a-select-option>
                <a-select-option value="OUTSOURCE">委外</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="分类" name="categoryId">
              <a-tree-select v-model:value="form.categoryId" :tree-data="categoryTree" :field-names="{ children: 'children', label: 'categoryName', value: 'categoryId' }" placeholder="请选择分类" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="主单位" name="unit">
              <a-input v-model:value="form.unit" placeholder="如：个、kg、m" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider>规格参数</a-divider>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="规格" name="spec"><a-input v-model:value="form.spec" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="型号" name="model"><a-input v-model:value="form.model" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="图号" name="drawingNo"><a-input v-model:value="form.drawingNo" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="物料版本" name="materialVersion"><a-input v-model:value="form.materialVersion" /></a-form-item>
          </a-col>
        </a-row>
        <a-divider>管控参数</a-divider>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="批次管理" name="lotControlFlag">
              <a-select v-model:value="form.lotControlFlag" placeholder="请选择">
                <a-select-option value="Y">是</a-select-option>
                <a-select-option value="N">否</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="序列号管理" name="snControlFlag">
              <a-select v-model:value="form.snControlFlag" placeholder="请选择">
                <a-select-option value="Y">是</a-select-option>
                <a-select-option value="N">否</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="需要检验" name="inspectionFlag">
              <a-select v-model:value="form.inspectionFlag" placeholder="请选择">
                <a-select-option value="Y">是</a-select-option>
                <a-select-option value="N">否</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="安全库存" name="safeStock">
              <a-input-number v-model:value="form.safeStock" :min="0" :precision="2" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态" name="status">
              <a-radio-group v-model:value="form.status">
                <a-radio value="0">正常</a-radio>
                <a-radio value="1">停用</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { message } from 'ant-design-vue'
import ProTable from '@/components/BearJiaProTable/index.vue'
import { listMaterial, getMaterial, addMaterial, updateMaterial, delMaterial, exportMaterial, treeSelect } from '@/api/mes/base'

const proTableRef = ref()
const formRef = ref()
const open = ref(false)
const title = ref('')
const submitting = ref(false)
const form = reactive({ materialCode: '', materialName: '', materialType: 'RAW', sourceType: 'MAKE', categoryId: null, spec: '', model: '', unit: '', drawingNo: '', materialVersion: '', lotControlFlag: 'N', snControlFlag: 'N', inspectionFlag: 'N', safeStock: null, status: '0' })
const categoryTree = ref([])
const currentCategoryId = ref(null)

const rules = {
  materialCode: [{ required: true, message: '请输入物料编码', trigger: 'blur' }],
  materialName: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
  sourceType: [{ required: true, message: '请选择来源类型', trigger: 'change' }],
  unit: [{ required: true, message: '请输入主单位', trigger: 'blur' }],
}

const tableApi = { list: listMaterial, delete: delMaterial }
const exportConfig = { url: 'mes/base/material/export', fileName: '物料数据' }
const initialSearchParams = { materialCode: null, materialName: null, categoryId: null }
const searchFields = computed(() => [
  { name: 'materialCode', label: '物料编码', type: 'input' },
  { name: 'materialName', label: '物料名称', type: 'input' },
  { name: 'categoryId', label: '分类', type: 'input', hidden: true },
])
const columns = [
  { title: '物料编码', dataIndex: 'materialCode', align: 'center', width: 120 },
  { title: '物料名称', dataIndex: 'materialName', align: 'center' },
  { title: '物料类型', dataIndex: 'materialType', align: 'center', width: 80 },
  { title: '来源类型', dataIndex: 'sourceType', align: 'center', width: 80 },
  { title: '规格', dataIndex: 'spec', align: 'center', width: 80 },
  { title: '型号', dataIndex: 'model', align: 'center', width: 80 },
  { title: '单位', dataIndex: 'unit', align: 'center', width: 60 },
  { title: '批次', dataIndex: 'lotControlFlag', align: 'center', width: 60 },
  { title: '状态', dataIndex: 'status', align: 'center', width: 60 },
  { title: '创建时间', dataIndex: 'createTime', align: 'center', width: 150 },
]

async function loadTree() { const res = await treeSelect(); categoryTree.value = res.data || [] }
loadTree()

function handleTreeSelect(keys) {
  currentCategoryId.value = keys[0] || null
  const ref = proTableRef.value
  if (ref) {
    ref.searchFormData.categoryId = currentCategoryId.value
    ref.refresh()
  }
}

function handleAdd() {
  Object.assign(form, { materialId: null, materialCode: '', materialName: '', materialType: 'RAW', sourceType: 'MAKE', categoryId: currentCategoryId.value || null, spec: '', model: '', unit: '', drawingNo: '', materialVersion: '', lotControlFlag: 'N', snControlFlag: 'N', inspectionFlag: 'N', safeStock: null, status: '0' })
  title.value = '新增物料'; open.value = true
}

function handleEdit(row) {
  getMaterial(row.materialId).then(res => {
    Object.assign(form, res.data); title.value = '修改物料'; open.value = true
  })
}

function handleDelete(ids) {
  delMaterial(ids.join(',')).then(() => { message.success('删除成功'); proTableRef.value?.refresh() })
}

function handleExport() {
  exportMaterial(proTableRef.value?.searchFormData || {}).then(() => message.success('导出成功'))
}

function submitForm() {
  formRef.value?.validate().then(() => {
    submitting.value = true
    const api = form.materialId ? updateMaterial : addMaterial
    api({ ...form }).then(() => {
      message.success('保存成功'); open.value = false; submitting.value = false; proTableRef.value?.refresh()
    }).catch(() => { submitting.value = false })
  }).catch(() => {})
}
</script>
