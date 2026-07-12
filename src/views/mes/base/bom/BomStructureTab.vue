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
        <a-button v-if="selectedVersionId" v-hasPermi="['base:bomItem:add']" type="primary" @click="handleAddItem">
          <BearJiaIcon icon="plus-outlined" />新增子件
        </a-button>
        <a-button v-if="selectedVersionId" @click="loadRootItems">
          <BearJiaIcon icon="reload-outlined" />刷新
        </a-button>
        <a-button v-if="selectedVersionId" :loading="expanding" @click="handleExpandBom">
          <BearJiaIcon icon="apartment-outlined" />BOM展开
        </a-button>
        <a-button v-if="selectedVersionId" v-hasPermi="['base:bomItem:add']" @click="handleImport">
          <BearJiaIcon icon="import-outlined" />AI识别导入
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
      class="bom-tree-table"
      :indent-size="20"
      :columns="columns"
      :data-source="treeData"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="middle"
      :expand-icon-column-index="1"
      :default-expand-all-rows="false"
      :expandedRowKeys="expandedRowKeys"
      @expand="handleExpand"
      @expandedRowsChange="handleExpandedRowsChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'component'">
          <span :class="getBomTreeNodeClass(record)" class="bom-tree-node-wrapper">
            <!-- 树枝连接线 -->
            <div v-if="getBomTreeLevel(record) > 1" class="bom-tree-lines">
              <!-- 绘制所有上级深度的垂直参考线 -->
              <span 
                v-for="i in (getBomTreeLevel(record) - 1)" 
                :key="i" 
                class="bom-line-v"
                :style="{ 
                  left: `${20 * (i - getBomTreeLevel(record)) - 15}px`,
                  bottom: i === (getBomTreeLevel(record) - 1) ? '50%' : '0'
                }"
              ></span>
              <!-- 当前节点的水平折线，连接垂直线和Lxx标签 -->
              <span class="bom-line-h"></span>
            </div>
            <span class="level-tag">L{{ getBomTreeLevel(record) }}</span>
            <span class="item-code-text">{{ record.componentItemCode }}</span>
          </span>
        </template>
        <template v-else-if="column.key === 'supplyType'">
          <a-tag :color="supplyColor[record.supplyType]">{{ supplyLabel[record.supplyType] || record.supplyType }}</a-tag>
        </template>
        <template v-else-if="column.key === 'operate'">
          <a-space>
            <a v-if="record.hasChildBom" @click.stop="handleExpandSingleBom(record)">展开</a>
            <a @click="handleEdit(record)" v-hasPermi="['base:bomItem:edit']">编辑</a>
            <a-popconfirm title="确认删除?" @confirm="handleDeleteSingle(record)">
              <a class="danger-text" v-hasPermi="['base:bomItem:remove']">删除</a>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <BomItemAddUpdateModal ref="itemModalRef" :bomVersionId="selectedVersionId" @refresh="loadRootItems" />
    <BomOcrImportDrawer ref="ocrImportDrawerRef" @imported="loadRootItems" />

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
import BomOcrImportDrawer from './BomOcrImportDrawer.vue'
import { BearJiaIcon } from '@/utils/BearJiaIcon.js'
import { buildBomCheckSummary } from './bomCheckSummary.js'
import {
  buildBomTreeNodes,
  getBomTreeLevel,
  getBomTreeNodeClass,
  getChildBomTreeLevel
} from './bomTreeVisual.js'

const props = defineProps({ bomMasterId: { type: Number, required: true } })

const loading = ref(false)
const expanding = ref(false)
const expandedRowKeys = ref([])
const selectedVersionId = ref(null)
const versionOptions = ref([])
const treeData = ref([])
const itemModalRef = ref()
const ocrImportDrawerRef = ref()
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
  expandedRowKeys.value = []
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
    const res = record.hasChildBom
      ? await listBomItemByComponent(record.componentItemCode, record.componentBomVersionId)
      : await listBomItemChildren(selectedVersionId.value, record.componentItemCode)
    const items = res.data || []
    if (items.length === 0) {
      message.info('该物料暂未维护BOM')
    }
    record.children = buildBomTreeNodes(items, getChildBomTreeLevel(record)).map(transform)
  } catch (e) {
    message.error('加载子件失败: ' + (e.msg || e.message))
  } finally { loading.value = false }
}

function handleExpandedRowsChange(keys) {
  expandedRowKeys.value = keys
}

function handleAddItem() {
  const maxLine = treeData.value.reduce((max, i) => Math.max(max, i.lineNo || 0), 0)
  itemModalRef.value?.openAddModal(maxLine + 10)
}

function handleEdit(record) { itemModalRef.value?.openUpdateModal(record) }

/** 工具栏：递归展开全部 BOM 节点 */
async function handleExpandBom() {
  expanding.value = true
  try {
    let count = 0
    for (const node of treeData.value) {
      count += await expandNodeRecursive(node)
    }
    if (count > 0) {
      message.success(`BOM展开完成，共加载 ${count} 个子件节点`)
    } else {
      message.info('当前 BOM 已是完全展开状态，未发现可展开的子件')
    }
  } catch (e) {
    message.error('BOM展开失败')
  } finally {
    expanding.value = false
  }
}

/** 操作列：展开单个节点的子 BOM */
async function handleExpandSingleBom(record) {
  expanding.value = true
  try {
    const count = await expandNodeRecursive(record)
    if (count > 0) {
      message.success(`展开完成，共加载 ${count} 个子件节点`)
    } else {
      message.info('该物料无子件可展开')
    }
  } catch (e) {
    message.error('展开失败')
  } finally {
    expanding.value = false
  }
}

/** 递归展开单个节点：只有 hasChildBom 的节点才去加载其子 BOM */
async function expandNodeRecursive(node) {
  let count = 0
  if (!node.hasChildBom) return count
  // 已加载过真实子件则跳过
  const loaded = Array.isArray(node.children) && node.children.length > 0
  if (!loaded) {
    const res = await listBomItemByComponent(node.componentItemCode, node.componentBomVersionId)
    const items = res.data || []
    if (items.length > 0) {
      node.children = buildBomTreeNodes(items, getChildBomTreeLevel(node)).map(transform)
      count += items.length
    } else {
      node.children = null
    }
  }
  if (Array.isArray(node.children)) {
    if (!expandedRowKeys.value.includes(node.id)) {
      expandedRowKeys.value.push(node.id)
    }
    for (const child of node.children) {
      count += await expandNodeRecursive(child)
    }
  }
  return count
}

async function handleDeleteSingle(record) {
  await delBomItem(record.id)
  message.success('删除成功')
  loadRootItems()
}

function handleImport() {
  ocrImportDrawerRef.value?.open(selectedVersionId.value)
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

.item-code-text { min-width: 0; }

.item-code-text { min-width: 0; }

/* 树枝连接线容器与定位 */
.bom-tree-node-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.bom-tree-lines {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  pointer-events: none;
}

.bom-line-v {
  position: absolute;
  top: -24px; /* 向上穿透单元格顶边以对接上一行 */
  width: 1px;
  background-color: rgba(0, 0, 0, 0.12);
}

.bom-line-h {
  position: absolute;
  top: 50%;
  left: -35px; /* 与倒数第一条垂直参考线（-35px）完全对接 */
  width: 31px; /* 缩短至31px，为Lxx标签左侧留出4px微量空白 */
  height: 1px;
  background-color: rgba(0, 0, 0, 0.12);
}
</style>
