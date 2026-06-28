<template>
  <div>
    <div class="tab-actions">
      <a-space>
        <span>查看版本：</span>
        <a-select v-model:value="selectedVersionId" placeholder="请选择版本" style="width:240px" @change="loadRootItems">
          <a-select-option v-for="v in versionOptions" :key="v.value" :value="v.value">
            {{ v.label }}
          </a-select-option>
        </a-select>
        <a-button v-if="selectedVersionId" v-hasPermi="['mes:bomItem:add']" type="primary" @click="handleAddItem">
          <BearJiaIcon icon="plus-outlined" />新增子件
        </a-button>
        <a-button v-if="selectedVersionId" @click="loadRootItems">
          <BearJiaIcon icon="reload-outlined" />刷新
        </a-button>
        <a-button v-if="selectedVersionId" v-hasPermi="['mes:bomItem:import']" @click="handleImport">
          <BearJiaIcon icon="import-outlined" />导入子件
        </a-button>
        <a-button v-if="selectedVersionId" @click="handleCheckBom">
          <BearJiaIcon icon="check-circle-outlined" />检查BOM
        </a-button>
      </a-space>
      <span v-if="selectedVersionId" class="count-text">共 {{ flatCount }} 条子件（已展开）</span>
    </div>

    <a-empty v-if="!selectedVersionId" description="请先选择版本" />

    <a-table
      v-else
      :columns="columns"
      :data-source="treeData"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="middle"
      :expand-icon-column-index="1"
      :default-expand-all-rows="false"
      @expand="handleExpand"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'component'">
          <span :class="getBomTreeNodeClass(record)">
            <span class="level-tag">L{{ getBomTreeLevel(record) }}</span>
            <span v-if="shouldShowBomTreeElbow(record)" class="tree-line-elbow" aria-hidden="true"></span>
            <span class="item-code-text">{{ record.componentItemCode }}</span>
          </span>
        </template>
        <template v-else-if="column.key === 'supplyType'">
          <a-tag :color="supplyColor[record.supplyType]">{{ supplyLabel[record.supplyType] || record.supplyType }}</a-tag>
        </template>
        <template v-else-if="column.key === 'operate'">
          <a-space>
            <a @click="handleEdit(record)" v-hasPermi="['mes:bomItem:edit']">编辑</a>
            <a-popconfirm title="确认删除?" @confirm="handleDeleteSingle(record)">
              <a class="danger-text" v-hasPermi="['mes:bomItem:remove']">删除</a>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <BomItemAddUpdateModal ref="itemModalRef" :bomVersionId="selectedVersionId" @refresh="loadRootItems" />

    <a-drawer v-model:open="checkDrawerOpen" title="BOM完整性检查" width="520">
      <a-spin :spinning="checking">
        <a-alert
          v-if="checkResult"
          :type="checkSummary.status"
          :message="checkSummaryText"
          show-icon
          style="margin-bottom:16px"
        />
        <a-empty v-if="checkResult && checkSummary.total === 0" description="未发现完整性问题" />
        <a-list v-else :data-source="checkIssues" item-layout="horizontal">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #title>
                  <a-space>
                    <a-tag :color="issueColor[item.level]">{{ issueLabel[item.level] }}</a-tag>
                    <span>{{ item.message }}</span>
                  </a-space>
                </template>
                <template #description>
                  <span v-if="item.lineNo">行号：{{ item.lineNo }}</span>
                  <span v-if="item.componentItemCode">　物料：{{ item.componentItemCode }}</span>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </a-spin>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { listBomVersion, listBomItemChildren, listBomItemByComponent, delBomItem, checkBomVersion } from '@/api/mes/base'
import BomItemAddUpdateModal from './BomItemAddUpdateModal.vue'
import { BearJiaIcon } from '@/utils/BearJiaIcon.js'
import { buildBomCheckSummary } from './bomCheckSummary.js'
import {
  buildBomTreeNodes,
  getBomTreeLevel,
  getBomTreeNodeClass,
  getChildBomTreeLevel,
  shouldShowBomTreeElbow
} from './bomTreeVisual.js'

const props = defineProps({ bomMasterId: { type: Number, required: true } })

const loading = ref(false)
const selectedVersionId = ref(null)
const versionOptions = ref([])
const treeData = ref([])
const itemModalRef = ref()
const checkDrawerOpen = ref(false)
const checking = ref(false)
const checkResult = ref(null)

const supplyLabel = { PICK: '领料', BACKFLUSH: '倒冲', KEY: '关键件' }
const supplyColor = { PICK: 'default', BACKFLUSH: 'purple', KEY: 'red' }
const issueLabel = { ERROR: '阻断', WARN: '警告', INFO: '提示' }
const issueColor = { ERROR: 'red', WARN: 'orange', INFO: 'blue' }

const columns = [
  { title: '行号', dataIndex: 'lineNo', width: 70 },
  { title: '子件编码', key: 'component', width: 200, ellipsis: true },
  { title: '子件名称', dataIndex: 'componentItemName', width: 160, ellipsis: true },
  { title: '子件规格', dataIndex: 'componentItemSpec', width: 140, ellipsis: true },
  { title: '用量', dataIndex: 'componentQty', width: 90 },
  { title: '发料方式', key: 'supplyType', width: 90 },
  { title: '操作', key: 'operate', width: 120, fixed: 'right' },
]

// 扁平化已加载节点的数量
const flatCount = computed(() => {
  function count(list) {
    let n = 0
    list.forEach(item => {
      n++
      if (item.children && item.children.length) n += count(item.children)
    })
    return n
  }
  return count(treeData.value)
})

const checkIssues = computed(() => checkResult.value?.issues || [])
const checkSummary = computed(() => buildBomCheckSummary(checkResult.value || {}))
const checkSummaryText = computed(() => {
  const summary = checkSummary.value
  if (summary.total === 0) return '当前BOM版本完整性检查通过'
  return `发现 ${summary.errorCount} 个阻断、${summary.warnCount} 个警告、${summary.infoCount} 个提示`
})

function loadVersions() {
  listBomVersion({ bomMasterId: props.bomMasterId }).then(res => {
    const list = res.rows || []
    versionOptions.value = list.map(v => ({
      label: `${v.versionCode} ${v.versionName || ''}${v.defaultFlag === 1 ? ' (默认)' : ''}`,
      value: v.id
    }))
    const defaultVer = list.find(v => v.defaultFlag === 1)
    if (defaultVer && !selectedVersionId.value) {
      selectedVersionId.value = defaultVer.id
      loadRootItems()
    }
  })
}
loadVersions()

async function loadRootItems() {
  if (!selectedVersionId.value) return
  loading.value = true
  try {
    const res = await listBomItemChildren(selectedVersionId.value, null)
    treeData.value = buildBomTreeNodes(res.data || [], 1).map(transform)
  } finally { loading.value = false }
}

/** 将扁平 item 转为树节点，hasChildBom 时展示展开图标 */
function transform(item) {
  const node = { ...item, key: item.id }
  if (item.hasChildBom) {
    node.children = []  // 空数组显示展开图标，点击后懒加载
  }
  return node
}

/** 展开节点时懒加载子件 */
async function handleExpand(expanded, record) {
  if (!expanded) return
  // 已加载过（children 非空数组）
  if (Array.isArray(record.children) && record.children.length > 0) return

  loading.value = true
  try {
    // hasChildBom → 跨BOM查找该半成品默认版本的子件
    const api = record.hasChildBom ? listBomItemByComponent : (code => listBomItemChildren(selectedVersionId.value, code))
    const res = await api(record.componentItemCode)
    const items = res.data || []
    if (items.length === 0) {
      message.info('该物料暂未维护BOM')
    }
    record.children = buildBomTreeNodes(items, getChildBomTreeLevel(record)).map(transform)
  } catch (e) {
    message.error('加载子件失败: ' + (e.msg || e.message))
  } finally { loading.value = false }
}

function handleAddItem() {
  const maxLine = treeData.value.reduce((max, i) => Math.max(max, i.lineNo || 0), 0)
  itemModalRef.value?.openAddModal(maxLine + 10)
}

function handleEdit(record) { itemModalRef.value?.openUpdateModal(record) }

async function handleDeleteSingle(record) {
  await delBomItem(record.id)
  message.success('删除成功')
  loadRootItems()
}

function handleImport() {
  message.info('批量导入功能即将上线')
}

async function handleCheckBom() {
  checkDrawerOpen.value = true
  checking.value = true
  try {
    const res = await checkBomVersion(selectedVersionId.value)
    checkResult.value = res.data || { issues: [] }
  } finally {
    checking.value = false
  }
}

defineExpose({ loadData: loadVersions })
</script>

<style lang="less" scoped>
.tab-actions {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
}
.count-text { color: #999; font-size: 13px; }
.danger-text { color: #ff4d4f; }
.bom-tree-node {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}
.level-tag {
  flex: 0 0 auto;
  min-width: 28px;
  height: 20px;
  margin-right: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  color: #595959;
  background: #fafafa;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}
.bom-tree-node.is-expandable .item-code-text {
  font-weight: 600;
}
.tree-line-elbow {
  flex: 0 0 auto;
  width: 18px;
  height: 20px;
  margin-right: 8px;
  position: relative;
}
.tree-line-elbow::before,
.tree-line-elbow::after {
  position: absolute;
  background: #d9d9d9;
  content: '';
}
.tree-line-elbow::before {
  left: 0;
  top: 0;
  width: 1px;
  height: 10px;
}
.tree-line-elbow::after {
  left: 0;
  top: 9px;
  width: 18px;
  height: 1px;
}
.item-code-text { min-width: 0; }
</style>
