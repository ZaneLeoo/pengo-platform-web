<template>
  <div class="artifact-card">
    <div class="card-header">
      <div class="header-left">
        <span class="type-badge" :class="artifact.type">
          {{ artifact.type === 'chart' ? '图表' : '数据表' }}
        </span>
        <h4 class="card-title">{{ artifact.title || '数据分析产物' }}</h4>
      </div>
      <div class="header-right">
        <!-- 提供简单的数据项统计 -->
        <span v-if="artifact.type === 'table'" class="data-count">
          共 {{ rows.length }} 行
        </span>
      </div>
    </div>
    
    <div class="card-body">
      <div v-if="artifact.type === 'chart'" ref="chartRef" class="chart-container"></div>
      
      <div v-else class="table-container">
        <a-table 
          :data="rows" 
          max-height="320" 
          stripe 
          class="custom-table"
        >
          <a-table-column 
            v-for="(column, index) in columns" 
            :key="index" 
            :prop="String(index)" 
            :label="column" 
            min-width="120"
          />
        </a-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  artifact: {
    type: Object,
    required: true
  }
})

const chartRef = ref(null)
let chartInstance = null

const columns = computed(() => props.artifact.payload?.columns || [])
const rows = computed(() => {
  const rawRows = props.artifact.payload?.rows || []
  return rawRows.map(row => Object.fromEntries(row.map((v, i) => [i, v])))
})

// 高阶冷调配色
const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

function getChartOption() {
  const payload = props.artifact.payload || {}
  const chartType = payload.chartType || 'bar'
  const categories = payload.categories || payload.xAxis || []
  
  // 基础通用配置
  const baseOption = {
    color: colors,
    tooltip: {
      trigger: chartType === 'pie' ? 'item' : 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#1f2937', fontSize: 12 },
      shadowColor: 'rgba(0, 0, 0, 0.04)',
      shadowBlur: 10
    },
    legend: {
      bottom: 5,
      left: 'center',
      icon: 'circle',
      textStyle: { color: '#6b7280', fontSize: 11 },
      itemWidth: 8,
      itemHeight: 8
    }
  }

  // 1. 饼图或环形图
  if (chartType === 'pie') {
    const seriesData = payload.series?.[0]?.data || []
    const data = seriesData.map((value, i) => {
      if (typeof value === 'object') return value
      return { 
        name: categories[i] || `类别 ${i + 1}`, 
        value 
      }
    })

    return {
      ...baseOption,
      series: [{
        name: payload.series?.[0]?.name || '占比',
        type: 'pie',
        radius: ['45%', '72%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#ffffff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data
      }]
    }
  }

  // 2. 柱状图或折线图
  const series = (payload.series || []).map((item, index) => {
    const sColor = colors[index % colors.length]
    const seriesConfig = {
      name: item.name,
      type: chartType,
      data: item.data
    }

    if (chartType === 'line') {
      seriesConfig.smooth = true
      seriesConfig.showSymbol = false
      seriesConfig.lineStyle = { width: 3 }
      seriesConfig.areaStyle = {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: `${sColor}24` }, // 约 14% 透明度
          { offset: 1, color: `${sColor}00` }  // 完全透明
        ])
      }
    } else if (chartType === 'bar') {
      seriesConfig.barMaxWidth = 24
      seriesConfig.itemStyle = {
        borderRadius: [4, 4, 0, 0] // 柱子顶部圆角
      }
    }

    return seriesConfig
  })

  return {
    ...baseOption,
    grid: {
      left: '4%',
      right: '4%',
      top: '12%',
      bottom: '16%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280', fontSize: 11 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      axisLabel: { color: '#6b7280', fontSize: 11 }
    },
    series
  }
}

function renderChart() {
  if (!chartRef.value || props.artifact.type !== 'chart') return
  
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  chartInstance.setOption(getChartOption(), true)
}

function resizeChart() {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', resizeChart)
})

watch(() => props.artifact, () => {
  nextTick(renderChart)
}, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.artifact-card {
  margin: 16px 0;
  border: 1px solid rgba(229, 231, 235, 0.7);
  border-radius: 12px;
  background-color: #ffffff;
  overflow: hidden;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.02),
              0 1px 3px rgba(0, 0, 0, 0.01);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(243, 244, 246, 0.8);
  background-color: rgba(249, 250, 251, 0.4);
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.type-badge {
  font-size: 10.5px;
  font-weight: 500;
  padding: 2.5px 8px;
  border-radius: 6px;
  
  &.chart {
    background-color: #eff6ff;
    color: #3b82f6;
  }
  
  &.table {
    background-color: #ecfdf5;
    color: #10b981;
  }
}

.card-title {
  font-size: 13.5px;
  font-weight: 600;
  color: #374151;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-count {
  font-size: 11px;
  color: #9ca3af;
}

.card-body {
  padding: 16px;
}

.chart-container {
  height: clamp(300px, 38vh, 430px);
  width: 100%;
}

.table-container {
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
}

@media (max-width: 640px) {
  .card-header {
    align-items: flex-start;
    padding: 11px 12px;
  }

  .card-body { padding: 12px; }
  .chart-container { height: 280px; }
  .data-count { display: none; }
}

// Ant Design Vue 表格定制样式
.custom-table {
  width: 100%;
  font-size: 13px;

  :deep(th.ant-table-cell) {
    background-color: #f9fafb !important;
    color: #4b5563;
    font-weight: 600;
    height: 40px;
    padding: 8px 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  :deep(td.ant-table-cell) {
    height: 42px;
    padding: 8px 16px;
    color: #1f2937;
    border-bottom: 1px solid #f3f4f6;
  }

  :deep(.ant-table) {
    border: none;
  }
}
</style>
