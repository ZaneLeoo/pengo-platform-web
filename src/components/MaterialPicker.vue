<template>
  <div class="material-picker">
    <div class="picker-trigger" :class="{ 'has-value': selectedLabel, disabled }" @click="openPicker">
      <span v-if="selectedLabel" class="picker-text">{{ selectedLabel }}</span>
      <span v-else class="picker-placeholder">{{ placeholder }}</span>
      <span v-if="selectedLabel && !disabled" class="picker-clear" @click.stop="clearSelection">
        <CloseCircleFilled />
      </span>
      <span class="picker-arrow"><SearchOutlined /></span>
    </div>

    <a-form-item-rest>
      <a-modal
        v-model:open="visible"
        title="选择物料"
        width="75%"
        :destroyOnClose="false"
        :confirmLoading="false"
        :getContainer="getPopupContainer"
        @ok="handleConfirm"
        @cancel="handleCancel"
      >
      <a-row :gutter="16">
        <!-- 左侧分类树 -->
        <a-col :span="7">
          <div class="tree-panel">
            <div class="tree-title">物料分类</div>
            <a-tree
              v-if="categoryTree.length"
              :tree-data="categoryTree"
              :field-names="{ children: 'children', title: 'categoryName', key: 'categoryId' }"
              :default-expand-all="true"
              :selected-keys="selectedCategoryKeys"
              @select="handleTreeSelect"
            />
            <a-empty v-else description="暂无分类" :image="false" style="margin-top:24px" />
          </div>
        </a-col>

        <!-- 右侧搜索 + 表格 -->
        <a-col :span="17">
          <a-input
            v-model:value="searchKeyword"
            placeholder="搜索物料编码 / 名称..."
            allow-clear
            @change="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-table
            :columns="displayColumns"
            :data-source="tableData"
            :loading="tableLoading"
            :pagination="pagination"
            row-key="materialId"
            size="small"
            :scroll="{ y: '42vh' }"
            style="margin-top:12px"
            @change="handleTableChange"
            @resizeColumn="handleResizeColumn"
            :customRow="rowEvents"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'radio'">
                <a-radio
                  :checked="selectedMaterial?.materialId === record.materialId"
                  @click="selectRow(record)"
                />
              </template>
              <template v-else-if="column.key === 'materialType'">
                <a-tag>{{ materialTypeLabel[record.materialType] || record.materialType }}</a-tag>
              </template>
            </template>
          </a-table>
          <div v-if="selectedMaterial" class="selected-bar">
            已选：<strong>{{ selectedMaterial.materialCode }}</strong> {{ selectedMaterial.materialName }}
          </div>
        </a-col>
      </a-row>
    </a-modal>
    </a-form-item-rest>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick, computed } from 'vue'
import { SearchOutlined, CloseCircleFilled } from '@ant-design/icons-vue'
import { listMaterial, treeSelect } from '@/api/mes/base'

const props = defineProps({
  modelValue: { type: [Number, String], default: null },
  label: { type: String, default: '' },
  materialType: { type: String, default: null },
  excludeIds: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择物料' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'select', 'change'])

const visible = ref(false)
const searchKeyword = ref('')
const categoryTree = ref([])
const tableData = ref([])
const tableLoading = ref(false)
const selectedMaterial = ref(null)
const selectedLabel = ref('')
const selectedCategoryKeys = ref([])

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: false,
})

const materialTypeLabel = { RAW: '原材料', SEMI: '半成品', FINISHED: '成品' }

const columnWidths = ref({})

const baseColumns = [
  { key: 'radio', width: 36, resizable: false },
  { title: '物料编码', dataIndex: 'materialCode', ellipsis: true, width: 120, resizable: true },
  { title: '物料名称', dataIndex: 'materialName', ellipsis: true, width: 160, resizable: true },
  { title: '类型', key: 'materialType', width: 72, resizable: true },
  { title: '规格', dataIndex: 'spec', ellipsis: true, width: 80, resizable: true },
  { title: '单位', dataIndex: 'unit', width: 56, resizable: true },
]

const displayColumns = computed(() =>
  baseColumns.map(col => ({
    ...col,
    width: columnWidths.value[col.dataIndex || col.key] ?? col.width
  }))
)

function handleResizeColumn(w, col) {
  const key = col.dataIndex || col.key
  if (key) columnWidths.value[key] = w
}

let searchTimer = null

function getPopupContainer() {
  return document.body
}

function loadTree() {
  treeSelect().then(res => {
    categoryTree.value = res.data || []
  })
}
loadTree()

function openPicker() {
  if (props.disabled) return
  visible.value = true
  // 如果有已选值，回显到弹窗中
  if (props.modelValue) {
    selectedMaterial.value = { materialId: props.modelValue }
  }
  loadTable()
}

function handleCancel() {
  visible.value = false
  searchKeyword.value = ''
  selectedCategoryKeys.value = []
  selectedMaterial.value = props.modelValue ? { ...selectedMaterial.value } : null
}

function handleConfirm() {
  if (!selectedMaterial.value?.materialId) return
  const m = selectedMaterial.value
  selectedLabel.value = `${m.materialCode} ${m.materialName}`
  emit('update:modelValue', m.materialId)
  emit('select', { ...m })
  emit('change', m.materialId)
  visible.value = false
  searchKeyword.value = ''
  selectedCategoryKeys.value = []
}

function clearSelection() {
  selectedMaterial.value = null
  selectedLabel.value = ''
  emit('update:modelValue', null)
  emit('select', null)
  emit('change', null)
}

function selectRow(record) {
  selectedMaterial.value = { ...record }
}

const rowEvents = (record) => ({
  onClick: () => selectRow(record)
})

function handleTreeSelect(keys) {
  selectedCategoryKeys.value = keys
  pagination.current = 1
  loadTable()
}

function handleSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.current = 1
    loadTable()
  }, 300)
}

function handleTableChange(pag) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadTable()
}

async function loadTable() {
  tableLoading.value = true
  try {
    const query = {
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    }
    if (searchKeyword.value) {
      // 按编码或名称搜索
      if (/^[A-Za-z0-9_-]+$/.test(searchKeyword.value)) {
        query.materialCode = searchKeyword.value
      } else {
        query.materialName = searchKeyword.value
      }
    }
    if (selectedCategoryKeys.value.length) {
      query.categoryId = selectedCategoryKeys.value[0]
    }
    if (props.materialType) {
      query.materialType = props.materialType
    }
    const res = await listMaterial(query)
    tableData.value = res.rows || []
    pagination.total = res.total || 0
  } finally {
    tableLoading.value = false
  }
}

/** 外部设置 modelValue 时同步显示文本（编辑回显场景） */
watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.label) {
      selectedLabel.value = props.label
      selectedMaterial.value = { materialId: val }
    } else {
      const found = tableData.value.find(r => r.materialId === val)
      if (found) {
        selectedLabel.value = `${found.materialCode} ${found.materialName}`
        selectedMaterial.value = { ...found }
      }
    }
  } else {
    selectedLabel.value = ''
    selectedMaterial.value = null
  }
}, { immediate: true })
</script>

<style lang="less" scoped>
.material-picker {
  width: 100%;
}
.picker-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s;
  box-sizing: border-box;
  &:hover { border-color: #4086ff; }
  &.has-value { border-color: #d9d9d9; }
  &.disabled {
    background: #f5f5f5;
    cursor: not-allowed;
    .picker-arrow { color: #bfbfbf; }
  }
}
.picker-placeholder {
  flex:1; color:#bfbfbf; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.picker-text {
  flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px;
}
.picker-clear {
  flex:0 0 auto; margin-right:4px; color:#bfbfbf; font-size:12px; line-height:1;
  &:hover { color:#999; }
}
.picker-arrow {
  flex:0 0 auto; color:#bfbfbf; font-size:14px;
}

.tree-panel {
  border:1px solid #f0f0f0; border-radius:6px; padding:8px; height:55vh; overflow:auto;
}
.tree-title {
  font-weight:600; font-size:14px; margin-bottom:8px; padding-left:4px; color:#333;
}

.selected-bar {
  margin-top:8px; padding:4px 8px; background:#f6ffed; border:1px solid #b7eb8f;
  border-radius:4px; font-size:13px; color:#333;
}

:deep(.ant-table-row) {
  cursor: pointer;
}
</style>
