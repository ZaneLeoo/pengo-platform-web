<template>
  <div class="picker">
    <div class="picker-trigger" :class="{ 'has-value': label, disabled }" @click="open">
      <span v-if="label" class="picker-text">{{ label }}</span>
      <span v-else class="picker-placeholder">{{ placeholder }}</span>
      <span v-if="label && !disabled" class="picker-clear" @click.stop="clear"><CloseCircleFilled /></span>
      <span class="picker-arrow"><SearchOutlined /></span>
    </div>
    <a-modal v-model:open="visible" title="选择库位" width="700px" @ok="confirm" @cancel="visible = false">
      <a-input v-model:value="keyword" placeholder="搜索编码/名称..." allow-clear @change="search" style="margin-bottom:12px">
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <a-table :columns="cols" :data-source="data" :loading="loading" row-key="id" size="small"
        :pagination="{ current, pageSize: 10, total, showSizeChanger: false }"
        :customRow="r => ({ onClick: () => selected = r })"
        @change="p => { current = p.current; load() }">
        <template #bodyCell="{ column, record }">
          <a-radio v-if="column.key === 'radio'" :checked="selected?.id === record.id" />
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { SearchOutlined, CloseCircleFilled } from '@ant-design/icons-vue'
import { locationApi } from '@/api/mes/base/location'

const props = defineProps({
  modelValue: { type: [Number, String], default: null },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '请选择库位' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'select'])

const visible = ref(false)
const keyword = ref('')
const data = ref([])
const loading = ref(false)
const selected = ref(null)
const current = ref(1)
const total = ref(0)

const cols = [
  { key: 'radio', width: 36 },
  { title: '库位编码', dataIndex: 'locationCode', width: 130 },
  { title: '库位名称', dataIndex: 'locationName', width: 150 },
  { title: '所属仓库', dataIndex: 'warehouseName', width: 150 },
]

let timer = null
function search() { clearTimeout(timer); timer = setTimeout(() => { current.value = 1; load() }, 300) }
function open() { if (props.disabled) return; visible.value = true; keyword.value = ''; selected.value = null; load() }
function clear() { emit('update:modelValue', null); emit('select', null) }
function confirm() {
  if (!selected.value) return
  emit('update:modelValue', selected.value.id)
  emit('select', { ...selected.value })
  visible.value = false
}

async function load() {
  loading.value = true
  try {
    const params = { pageNum: current.value, pageSize: 10 }
    if (keyword.value) params.locationCode = keyword.value
    const res = await locationApi.list(params)
    data.value = res.rows || []; total.value = res.total || 0
  } finally { loading.value = false }
}
</script>

<style lang="less" scoped>
@import './picker.less';
</style>
