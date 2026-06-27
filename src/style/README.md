# 样式系统规范文档

## 📁 文件结构

```
src/style/
├── theme.less              # 主题变量定义（CSS变量）
├── mixins.less             # 公共样式mixins
├── global.less             # 全局样式入口文件
├── layout-modes.less       # 布局模式样式
├── components/             # 组件样式目录
│   ├── menu.less          # 菜单组件样式
│   ├── button.less        # 按钮组件样式
│   ├── table.less         # 表格组件样式
│   ├── form.less          # 表单组件样式
│   └── function-components.less  # 功能组件样式
└── pages/                  # 页面样式目录
    ├── homePage/
    └── loginPage/
```

## 🎨 CSS变量系统

### 变量命名规范

#### 背景色层次系统
- `--bg-color`: 页面主背景色（最深层）
- `--component-background`: 组件背景色（中间层）
- `--sidebar-background`: 侧边栏专用背景色（特殊用途）

#### 专用组件背景色
- `--drawer-bg`: 抽屉背景色
- `--modal-bg`: 模态框背景色
- `--dropdown-bg`: 下拉菜单背景色
- `--input-bg`: 输入框背景色
- `--table-header-bg`: 表格头背景色

#### 文字颜色系统
- `--text-primary`: 主要文字颜色
- `--text-secondary`: 次要文字颜色
- `--text-disabled`: 禁用文字颜色
- `--text-color`: 兼容性别名，指向 `--text-primary`

#### 边框颜色系统
- `--border-color-base`: 基础边框颜色
- `--border-color-split`: 分割线颜色
- `--divider-color`: 分隔符颜色

### 变量使用原则

1. **优先使用CSS变量**：避免硬编码颜色值
2. **遵循层次结构**：按照设计系统使用对应层级的变量
3. **保持一致性**：同类型组件使用相同的变量
4. **兼容性考虑**：保留必要的别名变量

## 🛠️ Mixins使用规范

### 基础动画效果
```less
.hover-lift-effect()     // 通用上浮hover效果
.hover-slide-effect()    // 侧滑hover效果
.hover-scale-effect()    // 缩放hover效果
```

### 组件样式
```less
.base-card()             // 基础卡片样式
.base-list-item()        // 列表项基础样式
.drawer-gradient-header() // 抽屉渐变头部
.drawer-content-base()   // 抽屉内容基础样式
```

### 表单组件
```less
.input-base()            // 输入框基础样式
.action-button-base()    // 操作按钮基础样式
.action-button-theme()   // 操作按钮主题色
```

### 菜单组件
```less
.menu-item-base()        // 菜单项基础样式
.menu-item-hover()       // 菜单项hover效果
.menu-item-active()      // 菜单项激活效果
```

## 📋 编码规范

### 1. 文件组织原则

- **按功能分组**：相关样式放在同一文件中
- **避免重复**：使用mixins提取公共样式
- **模块化**：每个文件专注于特定功能
- **依赖清晰**：明确引入关系

### 2. 样式命名规范

```less
// ✅ 推荐：语义化命名
.message-item {
  // 样式定义
}

// ❌ 避免：缩写或无意义命名
.msg-itm {
  // 样式定义
}
```

### 3. 选择器规范

```less
// ✅ 推荐：适度嵌套（不超过3层）
.dark-theme {
  .ant-table {
    .table-action-bar {
      // 样式定义
    }
  }
}

// ❌ 避免：过深嵌套
.dark-theme .ant-table .table-action-bar .action-buttons .action-btn {
  // 样式定义
}
```

### 4. CSS变量使用规范

```less
// ✅ 推荐：使用CSS变量
background-color: var(--component-background);

// ❌ 避免：硬编码颜色
background-color: #1f1f1f;
```

### 5. 注释规范

```less
// === 大段落注释 ===
// 用于标识主要功能模块

// 小段落注释
// 用于解释特定样式的作用

/* 
 * 多行注释
 * 用于详细说明复杂逻辑
 */
```

## 🎯 最佳实践

### 1. 主题适配

```less
// ✅ 推荐：完整的主题适配
.dark-theme {
  .component {
    background-color: var(--component-background);
    color: var(--text-primary);
    border-color: var(--border-color-base);
  }
}
```

### 2. 响应式设计

```less
// ✅ 推荐：使用mixins进行响应式设计
.component {
  .responsive(md; {
    // 中等屏幕样式
  });
}
```

### 3. 动画效果

```less
// ✅ 推荐：使用预定义的动画mixin
.card {
  .hover-lift-effect();
}
```

### 4. 样式覆盖

```less
// ✅ 推荐：使用适度的特异性
.dark-theme .ant-component {
  property: value !important;
}

// ❌ 避免：过度使用!important
.component {
  property: value !important !important;
}
```

## 🚫 常见问题和避免事项

### 1. 避免重复定义

```less
// ❌ 避免：重复的样式定义
.component-a {
  background: var(--component-background);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.component-b {
  background: var(--component-background);
  border-radius: 8px;
  transition: all 0.3s ease;
}

// ✅ 推荐：使用mixin提取公共样式
.base-component {
  background: var(--component-background);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.component-a {
  .base-component();
}

.component-b {
  .base-component();
}
```

### 2. 避免过度嵌套

```less
// ❌ 避免：过深的嵌套
.page {
  .container {
    .content {
      .section {
        .item {
          // 样式定义
        }
      }
    }
  }
}

// ✅ 推荐：扁平化结构
.page-item {
  // 样式定义
}
```

### 3. 避免硬编码

```less
// ❌ 避免：硬编码的颜色和尺寸
.component {
  background-color: #1f1f1f;
  padding: 16px;
  margin: 8px;
}

// ✅ 推荐：使用变量和标准化尺寸
.component {
  background-color: var(--component-background);
  padding: @spacing-md;
  margin: @spacing-sm;
}
```

## 📈 性能优化建议

### 1. 减少CSS文件大小

- 使用mixins避免重复代码
- 移除未使用的样式
- 合理拆分文件，避免单文件过大

### 2. 优化选择器性能

- 避免使用通配符选择器
- 减少复杂的组合选择器
- 使用类选择器而非标签选择器

### 3. 合理使用!important

- 仅在覆盖第三方库样式时使用
- 避免在常规样式中使用
- 使用更具体的选择器替代!important

## 🔄 维护和更新

### 1. 定期检查

- 检查是否有重复的样式定义
- 清理未使用的CSS变量和mixins
- 优化文件结构和组织

### 2. 版本控制

- 重大改动时更新文档
- 保持样式规范的一致性
- 记录变更原因和影响

### 3. 团队协作

- 新增组件时遵循现有规范
- 修改公共样式时评估影响范围
- 定期进行代码review

---

**最后更新**: 202-08-27
**维护者**: BearJia Team