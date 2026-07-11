<template>
  <a-card :bordered="false">
    <a-space class="search-bar">
      <a-input v-model:value="query.code" :placeholder="`${title}编号/物料编码`" allow-clear @pressEnter="load" />
      <a-input v-if="type === 'inventory'" v-model:value="query.warehouseCode" placeholder="仓库编码" allow-clear />
      <a-button type="primary" @click="load">查询</a-button><a-button @click="reset">重置</a-button>
      <a-button type="primary" ghost @click="openAdd">新增{{ title }}</a-button>
      <a-button danger :disabled="!selected.length" @click="remove">删除</a-button>
    </a-space>
    <a-table :loading="loading" :data-source="rows" :columns="columns" row-key="id" :pagination="pagination" :row-selection="{ selectedRowKeys: selected, onChange: keys => selected = keys }" @change="pageChange">
      <template #bodyCell="{ column, record }"><template v-if="column.key === 'action'"><a-space><a @click="openEdit(record)">编辑</a><a @click="openDetail(record)">详情</a></a-space></template></template>
    </a-table>
    <a-modal v-model:open="formOpen" :title="editing ? `编辑${title}` : `新增${title}`" width="680px" @ok="save">
      <a-form :model="form" layout="vertical"><a-row :gutter="16"><a-col v-for="field in fields" :key="field.key" :span="12"><a-form-item :label="field.label"><a-input v-model:value="form[field.key]" /></a-form-item></a-col></a-row></a-form>
    </a-modal>
    <a-drawer v-model:open="detailOpen" :title="`${title}详情`" width="760px">
      <a-descriptions bordered :column="1"><a-descriptions-item v-for="field in fields" :key="field.key" :label="field.label">{{ detail[field.key] || '-' }}</a-descriptions-item></a-descriptions>
      <a-divider v-if="detail.lines">明细</a-divider><a-table v-if="detail.lines" :data-source="detail.lines" :columns="lineColumns" row-key="id" />
    </a-drawer>
  </a-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { purchaseOrderApi, purchaseReceiptApi, purchaseInboundApi, inventoryBalanceApi } from '@/api/mes/purchase'

const route = useRoute()
const type = computed(() => route.path.includes('purchaseReceipt') ? 'receipt' : route.path.includes('purchaseInbound') ? 'inbound' : route.path.includes('inventoryBalance') ? 'inventory' : 'order')
const configs = {
  order: { title: '采购订单', code: 'orderCode', api: purchaseOrderApi, fields: [['orderCode', '订单编号'], ['supplierName', '供应商'], ['orderDate', '订单日期'], ['expectedDate', '预计到货'], ['status', '状态'], ['totalQuantity', '总数量'], ['totalAmount', '总金额']] },
  receipt: { title: '到货单', code: 'receiptCode', api: purchaseReceiptApi, fields: [['receiptCode', '到货单号'], ['orderCode', '采购订单'], ['receiptDate', '到货日期'], ['status', '状态'], ['inspectionStatus', '检验状态'], ['totalQuantity', '到货数量']] },
  inbound: { title: '入库单', code: 'inboundCode', api: purchaseInboundApi, fields: [['inboundCode', '入库单号'], ['receiptCode', '到货单'], ['inboundDate', '入库日期'], ['warehouseCode', '仓库'], ['status', '状态'], ['totalQuantity', '入库数量']] },
  inventory: { title: '库存余额', code: 'materialCode', api: inventoryBalanceApi, fields: [['materialCode', '物料编码'], ['materialName', '物料名称'], ['warehouseCode', '仓库'], ['locationCode', '库位'], ['lotNo', '批次'], ['unit', '单位'], ['quantity', '库存数量'], ['availableQuantity', '可用数量'], ['lockedQuantity', '锁定数量'], ['status', '状态']] },
}
const config = computed(() => configs[type.value]); const title = computed(() => config.value.title); const fields = computed(() => config.value.fields.map(([key, label]) => ({ key, label })))
const columns = computed(() => fields.value.map(f => ({ title: f.label, dataIndex: f.key, key: f.key })).concat([{ title: '操作', key: 'action', fixed: 'right' }]))
const lineColumns = [{ title: '物料编码', dataIndex: 'materialCode' }, { title: '物料名称', dataIndex: 'materialName' }, { title: '数量', dataIndex: 'orderQuantity' }, { title: '单位', dataIndex: 'unit' }]
const rows = ref([]); const loading = ref(false); const selected = ref([]); const formOpen = ref(false); const detailOpen = ref(false); const editing = ref(false); const detail = ref({}); const form = reactive({}); const query = reactive({ code: '', warehouseCode: '' }); const pagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: true })
async function load() { loading.value = true; const params = { pageNum: pagination.current, pageSize: pagination.pageSize, [config.value.code]: query.code }; if (query.warehouseCode) params.warehouseCode = query.warehouseCode; const result = await config.value.api.list(params); rows.value = result.rows || []; pagination.total = result.total || 0; loading.value = false }
function reset() { query.code = ''; query.warehouseCode = ''; pagination.current = 1; load() }
function pageChange(page) { pagination.current = page.current; pagination.pageSize = page.pageSize; load() }
function openAdd() { editing.value = false; Object.keys(form).forEach(k => delete form[k]); fields.value.forEach(f => { form[f.key] = '' }); formOpen.value = true }
function openEdit(row) { editing.value = true; Object.assign(form, row); formOpen.value = true }
async function save() { await (editing.value ? config.value.api.update(form) : config.value.api.add(form)); message.success('保存成功'); formOpen.value = false; load() }
async function openDetail(row) { const result = await config.value.api.get(row.id); detail.value = result.data || row; detailOpen.value = true }
async function remove() { await config.value.api.remove(selected.value.join(',')); message.success('删除成功'); selected.value = []; load() }
onMounted(load)
</script>
