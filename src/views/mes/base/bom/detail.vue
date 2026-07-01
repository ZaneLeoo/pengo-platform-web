<template>
  <div class="bom-detail">
    <div class="page-header">
      <a-space>
        <a-button type="link" @click="goBack">
          <ArrowLeftOutlined /> 返回
        </a-button>
        <a-divider type="vertical" />
        <span class="header-title">BOM详情</span>
        <span class="header-info" v-if="master.bomCode">— {{ master.bomCode }} / {{ master.parentItemName }}</span>
        <a-tag v-if="master.bomType" :color="typeColor[master.bomType]">{{ typeLabel[master.bomType] }}</a-tag>
        <a-tag v-if="master.status" :color="master.status === 'ACTIVE' ? 'green' : 'default'">{{ master.status === 'ACTIVE' ? '启用' : '停用' }}</a-tag>
      </a-space>
    </div>

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="info" tab="基本信息">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="BOM编码">{{ master.bomCode || '-' }}</a-descriptions-item>
          <a-descriptions-item label="母件物料编码">{{ master.parentItemCode || '-' }}</a-descriptions-item>
          <a-descriptions-item label="母件名称">{{ master.parentItemName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="母件规格">{{ master.parentItemSpec || '-' }}</a-descriptions-item>
          <a-descriptions-item label="母件单位">{{ master.parentItemUnit || '-' }}</a-descriptions-item>
          <a-descriptions-item label="BOM类型">
            <a-tag :color="typeColor[master.bomType]">{{ typeLabel[master.bomType] || master.bomType }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="master.status === 'ACTIVE' ? 'green' : 'default'">{{ master.status === 'ACTIVE' ? '启用' : '停用' }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="来源系统">{{ master.sourceSystem || '-' }}</a-descriptions-item>
          <a-descriptions-item label="创建人">{{ master.createBy || '-' }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ master.createTime || '-' }}</a-descriptions-item>
          <a-descriptions-item label="更新人">{{ master.updateBy || '-' }}</a-descriptions-item>
          <a-descriptions-item label="更新时间">{{ master.updateTime || '-' }}</a-descriptions-item>
        </a-descriptions>
        <div style="margin-top:16px">
          <a-button type="link" @click="activeTab = 'version'">查看版本管理 →</a-button>
          <a-button type="link" @click="activeTab = 'structure'">查看BOM结构 →</a-button>
        </div>
      </a-tab-pane>

      <a-tab-pane key="version" tab="版本管理">
        <BomVersionTab ref="versionTabRef" :bomMasterId="bomMasterId" />
      </a-tab-pane>

      <a-tab-pane key="structure" tab="BOM结构">
        <BomStructureTab ref="structureTabRef" :bomMasterId="bomMasterId" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup name="BomDetail">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { getBomMaster } from '@/api/mes/base'
import BomVersionTab from './BomVersionTab.vue'
import BomStructureTab from './BomStructureTab.vue'

const route = useRoute()
const router = useRouter()

const bomMasterId = ref(Number(route.params.id))
const activeTab = ref('info')
const master = reactive({})
const versionTabRef = ref()
const structureTabRef = ref()

const typeLabel = { MAKE: '制造', OUTSOURCE: '委外', BUY: '采购' }
const typeColor = { MAKE: 'blue', OUTSOURCE: 'orange', BUY: 'purple' }

onMounted(() => {
  getBomMaster(bomMasterId.value).then(res => {
    Object.assign(master, res.data)
  })
})

function goBack() { router.push({ name: 'BomMaster' }) }
</script>

<style lang="less" scoped>
.bom-detail {
  background: #fff; padding: 16px 24px; border-radius: 8px;
}
.page-header {
  margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0;
}
.header-title { font-size: 18px; font-weight: 600; }
.header-info { color: #666; font-size: 14px; }
</style>
