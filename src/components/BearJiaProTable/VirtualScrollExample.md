# BearJiaProTable 虚拟滚动使用指南

## 📖 概述

虚拟滚动是一种用于优化大数据量列表渲染性能的技术。当表格数据超过一定数量时，只渲染可视区域内的数据行，大大减少DOM节点数量，提升页面性能。

## 🎯 适用场景

- ✅ 数据量超过 100 条的列表
- ✅ 需要流畅滚动体验的表格
- ✅ 单页显示大量数据（不使用分页）
- ✅ 实时监控数据展示
- ✅ 日志查看器

## 🚀 基础使用

### 1. 启用虚拟滚动

只需添加 `virtual-scroll` 属性即可启用：

```vue
<template>
  <BearJiaProTable
    :api="api"
    :columns="columns"
    row-key="id"
    :search-fields="searchFields"
    virtual-scroll
  />
</template>

<script setup>
import BearJiaProTable from '@/components/BearJiaProTable/index.vue';
import { getUserList, deleteUser } from '@/api/system/user';

const api = {
  list: getUserList,
  delete: deleteUser,
};

const columns = [
  { title: '用户名', dataIndex: 'username', width: 150 },
  { title: '姓名', dataIndex: 'realName', width: 120 },
  { title: '邮箱', dataIndex: 'email', width: 200 },
  { title: '手机号', dataIndex: 'phone', width: 150 },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
];
</script>
```

### 2. 自定义虚拟滚动配置

```vue
<template>
  <BearJiaProTable
    :api="api"
    :columns="columns"
    row-key="id"
    virtual-scroll
    :virtual-scroll-config="{
      threshold: 50,  // 数据量超过50条才启用虚拟滚动
      buffer: 10      // 上下各渲染10行缓冲区
    }"
  />
</template>
```

## ⚙️ 配置参数

### virtualScroll (Boolean)
- **默认值**: `false`
- **说明**: 是否启用虚拟滚动
- **示例**: `:virtual-scroll="true"`

### virtualScrollConfig (Object)
- **默认值**: `{ threshold: 100, buffer: 5 }`
- **说明**: 虚拟滚动配置对象

#### threshold (Number)
- **默认值**: `100`
- **说明**: 启用虚拟滚动的最小数据量阈值
- **建议**: 
  - 数据量 < 50: 不建议启用
  - 数据量 50-200: threshold 设为 50
  - 数据量 > 200: threshold 设为 100（默认）

#### buffer (Number)
- **默认值**: `5`
- **说明**: 缓冲区行数，在可视区域上下各渲染额外的行
- **建议**:
  - 慢速滚动场景: buffer 设为 3-5
  - 快速滚动场景: buffer 设为 8-10
  - 超快滚动场景: buffer 设为 15-20

## 📊 性能对比

### 传统渲染 vs 虚拟滚动

| 数据量 | 传统渲染DOM节点 | 虚拟滚动DOM节点 | 性能提升 |
|--------|----------------|----------------|----------|
| 100条  | ~2,000         | ~200           | 10x      |
| 500条  | ~10,000        | ~200           | 50x      |
| 1000条 | ~20,000        | ~200           | 100x     |
| 5000条 | ~100,000       | ~200           | 500x     |

### 内存占用对比

```
传统渲染 1000 条数据: ~50MB
虚拟滚动 1000 条数据: ~5MB
节省内存: 90%
```

## 🔧 高级用法

### 1. 访问虚拟滚动API

```vue
<template>
  <BearJiaProTable
    ref="tableRef"
    :api="api"
    :columns="columns"
    row-key="id"
    virtual-scroll
  />
  
  <a-space style="margin-top: 16px;">
    <a-button @click="scrollToTop">滚动到顶部</a-button>
    <a-button @click="scrollToBottom">滚动到底部</a-button>
    <a-button @click="scrollToIndex(500)">滚动到第500行</a-button>
    <a-button @click="showStats">查看性能统计</a-button>
  </a-space>
</template>

<script setup>
import { ref } from 'vue';
import { message } from 'ant-design-vue';

const tableRef = ref(null);

// 滚动到顶部
const scrollToTop = () => {
  tableRef.value?.virtualScroll.scrollToTop();
};

// 滚动到底部
const scrollToBottom = () => {
  tableRef.value?.virtualScroll.scrollToBottom();
};

// 滚动到指定索引
const scrollToIndex = (index) => {
  tableRef.value?.virtualScroll.scrollToIndex(index);
};

// 查看性能统计
const showStats = () => {
  const stats = tableRef.value?.virtualScroll.stats.value;
  if (stats) {
    message.info(
      `总数据: ${stats.total} | 渲染: ${stats.rendered} | 
       节省节点: ${stats.savedNodes} (${stats.reductionPercent})`
    );
  }
};
</script>
```

### 2. 结合固定表头使用

```vue
<template>
  <BearJiaProTable
    :api="api"
    :columns="columns"
    row-key="id"
    virtual-scroll
    :scroll="{ y: 600 }"
  />
</template>
```

### 3. 响应式行高（根据表格尺寸自动调整）

虚拟滚动会自动根据表格的 `size` 属性调整行高：

```vue
<template>
  <a-space direction="vertical" style="width: 100%;">
    <a-radio-group v-model:value="tableSize">
      <a-radio-button value="small">紧凑</a-radio-button>
      <a-radio-button value="middle">默认</a-radio-button>
      <a-radio-button value="large">宽松</a-radio-button>
    </a-radio-group>
    
    <BearJiaProTable
      :api="api"
      :columns="columns"
      row-key="id"
      virtual-scroll
      :size="tableSize"
    />
  </a-space>
</template>

<script setup>
import { ref } from 'vue';

const tableSize = ref('middle');
</script>
```

行高映射：
- `small`: 40px
- `middle`: 54px（默认）
- `large`: 64px

## 💡 最佳实践

### 1. 固定列宽
为了保证虚拟滚动的性能，建议为所有列设置固定宽度：

```javascript
const columns = [
  { title: '用户名', dataIndex: 'username', width: 150 },
  { title: '姓名', dataIndex: 'realName', width: 120 },
  { title: '邮箱', dataIndex: 'email', width: 200 },
];
```

### 2. 合理设置缓冲区
根据实际滚动速度调整 `buffer` 值：

```javascript
// 用户缓慢滚动
virtualScrollConfig: { buffer: 5 }

// 用户快速滚动
virtualScrollConfig: { buffer: 10 }
```

### 3. 避免复杂的单元格内容
虚拟滚动适合简单的文本内容，避免在单元格中使用：
- ❌ 大量图片
- ❌ 复杂的嵌套组件
- ❌ 图表
- ✅ 简单文本
- ✅ 标签
- ✅ 简单图标

### 4. 数据量阈值设置
```javascript
// 小数据量（<100条）
virtual-scroll: false  // 不建议启用

// 中等数据量（100-1000条）
:virtual-scroll="true"
:virtual-scroll-config="{ threshold: 100, buffer: 5 }"

// 大数据量（>1000条）
:virtual-scroll="true"
:virtual-scroll-config="{ threshold: 100, buffer: 10 }"
```

## ⚠️ 注意事项

1. **行高一致性**: 虚拟滚动要求所有行具有相同的高度，不支持动态行高
2. **展开行**: 虚拟滚动模式下，展开行功能可能受限
3. **树形表格**: 树形表格不建议使用虚拟滚动
4. **选择行**: 行选择功能正常支持
5. **排序筛选**: 排序和筛选功能正常支持

## 🐛 常见问题

### Q1: 启用虚拟滚动后，表格滚动不流畅？
**A**: 增加 `buffer` 值，例如从 5 增加到 10：
```vue
:virtual-scroll-config="{ buffer: 10 }"
```

### Q2: 数据更新后，虚拟滚动位置错乱？
**A**: 虚拟滚动会自动处理数据更新，如果遇到问题，可以手动重置：
```javascript
tableRef.value?.virtualScroll.scrollToTop();
```

### Q3: 如何关闭虚拟滚动？
**A**: 移除 `virtual-scroll` 属性或设为 `false`：
```vue
:virtual-scroll="false"
```

### Q4: 虚拟滚动会影响导出功能吗？
**A**: 不会。导出功能会导出完整数据，不受虚拟滚动影响。

## 📈 性能监控

使用虚拟滚动API获取性能统计：

```javascript
const stats = tableRef.value?.virtualScroll.stats.value;

console.log('性能统计:', {
  total: stats.total,           // 总数据量
  rendered: stats.rendered,     // 实际渲染的行数
  savedNodes: stats.savedNodes, // 节省的DOM节点数
  reductionPercent: stats.reductionPercent, // 减少百分比
  enabled: stats.enabled        // 是否启用
});
```

## 🎓 完整示例

```vue
<template>
  <div class="virtual-scroll-demo">
    <a-card title="虚拟滚动演示" style="margin-bottom: 16px;">
      <a-space>
        <a-switch 
          v-model:checked="enableVirtualScroll" 
          checked-children="虚拟滚动开" 
          un-checked-children="虚拟滚动关"
        />
        <a-tag v-if="stats" color="blue">
          渲染: {{ stats.rendered }}/{{ stats.total }} 
          (节省 {{ stats.reductionPercent }})
        </a-tag>
      </a-space>
    </a-card>

    <BearJiaProTable
      ref="tableRef"
      :api="api"
      :columns="columns"
      row-key="id"
      :search-fields="searchFields"
      :virtual-scroll="enableVirtualScroll"
      :virtual-scroll-config="{
        threshold: 50,
        buffer: 8
      }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'status'">
          <a-tag :color="record.status === 1 ? 'success' : 'error'">
            {{ record.status === 1 ? '正常' : '停用' }}
          </a-tag>
        </template>
      </template>
    </BearJiaProTable>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import BearJiaProTable from '@/components/BearJiaProTable/index.vue';
import { getUserList, deleteUser } from '@/api/system/user';

const tableRef = ref(null);
const enableVirtualScroll = ref(true);

const api = {
  list: getUserList,
  delete: deleteUser,
};

const columns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '用户名', dataIndex: 'username', width: 150 },
  { title: '姓名', dataIndex: 'realName', width: 120 },
  { title: '邮箱', dataIndex: 'email', width: 200 },
  { title: '手机号', dataIndex: 'phone', width: 150 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
];

const searchFields = [
  { 
    label: '用户名', 
    field: 'username', 
    component: 'input',
    placeholder: '请输入用户名'
  },
];

// 获取性能统计
const stats = computed(() => {
  return tableRef.value?.virtualScroll.stats.value;
});

onMounted(() => {
  console.log('虚拟滚动已启用');
});
</script>

<style scoped>
.virtual-scroll-demo {
  padding: 24px;
}
</style>
```

## 📚 相关资源

- [useVirtualScroll Composable 源码](../../composables/useVirtualScroll.js)
- [BearJiaProTable 组件文档](./README.md)
- [Ant Design Vue Table 文档](https://antdv.com/components/table-cn)

---

**提示**: 虚拟滚动是提升大数据量表格性能的有效手段，但不是万能的。根据实际业务场景选择合适的优化方案。
