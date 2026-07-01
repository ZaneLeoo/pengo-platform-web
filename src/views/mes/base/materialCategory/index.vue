<template>
  <div>
    <a-row :gutter="16">
      <!-- 左侧分类树 -->
      <a-col :span="6">
        <a-card title="物料分类">
          <template #extra>
            <a-button type="link" size="small" @click="handleAdd(null)">新增</a-button>
          </template>
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
          rowKey="categoryId"
        >
          <template #actions="{ selectedRowKeys, selectedRows }">
            <a-button type="primary" @click="handleAdd(selectedRows[0])" v-hasPermi="['mes:materialCategory:add']">
              新增
            </a-button>
            <a-button :disabled="selectedRowKeys.length !== 1" @click="handleEdit(selectedRows[0])" v-hasPermi="['mes:materialCategory:edit']">
              修改
            </a-button>
            <a-button danger :disabled="!selectedRowKeys.length" @click="handleDelete(selectedRowKeys)" v-hasPermi="['mes:materialCategory:remove']">
              删除
            </a-button>
          </template>
        </ProTable>
      </a-col>
    </a-row>

    <!-- 新增/编辑弹窗 -->
    <a-modal v-model:open="open" :title="title" @ok="submitForm" @cancel="open = false" :confirmLoading="submitting">
      <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ span: 4 }">
        <a-form-item label="上级分类" name="parentId">
          <a-tree-select v-model:value="form.parentId" :tree-data="categoryTree" :field-names="{ children: 'children', label: 'categoryName', value: 'categoryId' }" placeholder="请选择上级分类" allowClear />
        </a-form-item>
        <a-form-item label="分类编码" name="categoryCode">
          <a-input v-model:value="form.categoryCode" placeholder="请输入分类编码" />
        </a-form-item>
        <a-form-item label="分类名称" name="categoryName">
          <a-input v-model:value="form.categoryName" placeholder="请输入分类名称" />
        </a-form-item>
        <a-form-item label="排序" name="orderNum">
          <a-input-number v-model:value="form.orderNum" :min="0" />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group v-model:value="form.status">
            <a-radio value="0">正常</a-radio>
            <a-radio value="1">停用</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { message } from 'ant-design-vue'
import ProTable from '@/components/BearJiaProTable/index.vue'
import { listCategory, getCategory, addCategory, updateCategory, delCategory, treeSelect } from '@/api/mes/base'

const proTableRef = ref()
const formRef = ref()
const open = ref(false)
const title = ref('')
const submitting = ref(false)
const form = reactive({ parentId: null, categoryCode: '', categoryName: '', orderNum: 0, status: '0' })
const categoryTree = ref([])
const currentParentId = ref(null)

const rules = {
  categoryCode: [{ required: true, message: '请输入分类编码', trigger: 'blur' }],
  categoryName: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
}

const tableApi = { list: listCategory, delete: delCategory }
const initialSearchParams = { categoryName: null, status: null }
const searchFields = computed(() => [
  { name: 'categoryName', label: '分类名称', type: 'input' },
  { name: 'status', label: '状态', type: 'select', options: [{ label: '正常', value: '0' }, { label: '停用', value: '1' }] },
])
const columns = [
  { title: '分类编码', dataIndex: 'categoryCode', align: 'center' },
  { title: '分类名称', dataIndex: 'categoryName', align: 'center' },
  { title: '排序', dataIndex: 'orderNum', align: 'center', width: 80 },
  { title: '状态', dataIndex: 'status', align: 'center', width: 80 },
  { title: '创建时间', dataIndex: 'createTime', align: 'center', width: 160 },
]

async function loadTree() { const res = await treeSelect(); categoryTree.value = res.data || [] }
loadTree()

function handleTreeSelect(keys) {
  currentParentId.value = keys[0] || null
  const ref = proTableRef.value
  if (ref) {
    ref.searchFormData.parentId = currentParentId.value
    ref.refresh()
  }
}

function handleAdd(row) {
  form.parentId = row?.categoryId || currentParentId.value || null
  form.categoryCode = ''; form.categoryName = ''; form.orderNum = 0; form.status = '0'
  title.value = '新增物料分类'; open.value = true
}

function handleEdit(row) {
  getCategory(row.categoryId).then(res => {
    Object.assign(form, res.data)
    title.value = '修改物料分类'; open.value = true
  })
}

function handleDelete(ids) {
  delCategory(ids.join(',')).then(() => { message.success('删除成功'); proTableRef.value?.reload(); loadTree() })
}

function submitForm() {
  formRef.value?.validate().then(() => {
    submitting.value = true
    const api = form.categoryId ? updateCategory : addCategory
    api({ ...form }).then(() => {
      message.success('保存成功'); open.value = false; submitting.value = false
      proTableRef.value?.reload(); loadTree()
    }).catch(() => { submitting.value = false })
  }).catch(() => {})
}
</script>
