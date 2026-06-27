<template>
  <aside class="embedded-sidebar" :class="{ open: visible }">
    <!-- 1. 展开态面板 -->
    <div v-show="visible" class="expanded-container">
      <div class="sidebar-header">
        <span class="brand-title">智能助手</span>
        <button class="toggle-btn" @click="emit('close')" title="收起侧栏">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>

      <div class="drawer-content">
        <button class="new-chat-btn" :disabled="disabled" @click="emit('new')">
          <span><PlusOutlined /></span>
          <span>新建对话</span>
        </button>

        <div class="search-box">
          <a-input 
            ref="searchInputRef"
            v-model="keyword"
            placeholder="搜索对话..."
            allowClear
            :prefix-icon="Search"
          />
        </div>

        <div class="conversation-list">
          <div v-if="filtered.length === 0" class="empty-tip">
            无相关对话
          </div>
          <div
            v-for="item in filtered"
            :key="item.id"
            class="conversation-item"
            :class="{ active: item.id === activeId, disabled: disabled }"
            @click="selectItem(item)"
          >
            <span class="chat-icon"><MessageOutlined /></span>
            <span class="title">{{ item.title || '无标题会话' }}</span>
            <span 
              v-if="!disabled"
              class="delete-icon"
              @click.stop="removeItem(item)"
            ><DeleteOutlined /></span>
          </div>
        </div>
      </div>
      
      <!-- 展开态下的底部用户信息栏 -->
      <div class="sidebar-footer">
        <div class="user-profile">
          <div class="user-avatar">
            <img v-if="avatar" :src="avatar" class="avatar-img" alt="avatar" />
            <span v-else>{{ userInitials }}</span>
          </div>
          <div class="user-info">
            <span class="user-name" :title="username">{{ username }}</span>
            <span class="user-status">● 在线</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 折叠态极窄图标栏 (仅在宽屏下非 open 时显示) -->
    <div v-show="!visible" class="collapsed-container">
      <div class="collapsed-top">
        <!-- 展开侧栏按钮 -->
        <button class="collapsed-btn toggle-expand-btn" @click="triggerExpand" title="展开侧栏">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>

        <!-- 新建会话图标 -->
        <button class="collapsed-btn" :disabled="disabled" @click="emit('new')" title="新建对话">
          <span><PlusOutlined /></span>
        </button>

        <!-- 搜索图标（点击展开并聚焦） -->
        <button class="collapsed-btn" @click="triggerSearchFocus" title="搜索对话">
          <span><SearchOutlined /></span>
        </button>
      </div>

      <div class="collapsed-bottom">
        <!-- 用户头像 (优先显示图片，无图片时降级为首字母) -->
        <div class="collapsed-avatar" :title="username">
          <img v-if="avatar" :src="avatar" class="avatar-img" alt="avatar" />
          <span v-else>{{ userInitials }}</span>
        </div>
      </div>
    </div>
  </aside>
  <!-- 仅在移动端起效的遮罩 -->
  <div v-if="visible" class="sidebar-mask" @click="emit('close')"></div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { PlusOutlined, DeleteOutlined, SearchOutlined, MessageOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  visible: Boolean,
  conversations: {
    type: Array,
    default: () => []
  },
  activeId: [String, Number],
  disabled: Boolean,
  username: {
    type: String,
    default: 'User'
  },
  avatar: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'open', 'new', 'select', 'remove'])

const keyword = ref('')
const searchInputRef = ref(null)

const filtered = computed(() => {
  if (!keyword.value) return props.conversations
  const kw = keyword.value.toLowerCase()
  return props.conversations.filter(c => 
    (c.title || '').toLowerCase().includes(kw)
  )
})

// 计算用户名首字母
const userInitials = computed(() => {
  if (!props.username) return 'U'
  const trimmed = props.username.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'U'
})

function triggerExpand() {
  emit('open')
}

// 在折叠态点击搜索，先通知展开，并在下一帧自动将输入框聚焦
function triggerSearchFocus() {
  emit('open')
  nextTick(() => {
    setTimeout(() => {
      if (searchInputRef.value) {
        searchInputRef.value.focus()
      }
    }, 150) // 稍作延时，等侧栏展开动画完成
  })
}

function selectItem(item) {
  if (props.disabled) return
  emit('select', item)
}

function removeItem(item) {
  if (props.disabled) return
  emit('remove', item)
}
</script>

<style scoped lang="scss">
.embedded-sidebar {
  width: 52px; /* 默认折叠宽度 */
  height: 100%;
  background-color: rgba(249, 250, 251, 0.7); /* 极淡冷灰磨砂 */
  backdrop-filter: blur(12px);
  overflow: hidden;
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative; /* 显式开启相对定位，激活 z-index 生效 */
  z-index: 15;
  flex-shrink: 0;
  box-sizing: border-box;
  border-right: 1px solid rgba(229, 231, 235, 0.7);
  padding: 0 !important; /* 强制覆盖全局 aside 带来的 24px 左右 padding 污染 */
  margin: 0 !important;  /* 强制覆盖全局 aside 带来的 margin-bottom */

  &.open {
    width: 260px;
    background-color: rgba(255, 255, 255, 0.85);
  }
}

// 1. 展开态容器
.expanded-container {
  width: 260px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  animation: fadeIn 0.15s ease-out;
}

.sidebar-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 20px;
  border-bottom: 1px solid rgba(243, 244, 246, 0.8);
  flex-shrink: 0;

  .brand-title {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
  }
}

.toggle-btn {
  background: transparent;
  border: none;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    color: #111827;
    background-color: #f3f4f6;
  }
}

.drawer-content {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.new-chat-btn {
  width: 100%;
  height: 38px;
  border: 1px solid rgba(229, 231, 235, 1);
  background: #ffffff;
  border-radius: 8px;
  font-weight: 500;
  font-size: 13px;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #d1d5db;
    color: #111827;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.search-box {
  :deep(.ant-input-affix-wrapper) {
    border-radius: 8px;
    background-color: rgba(243, 244, 246, 0.5);
    box-shadow: none;
    border: 1px solid transparent;
    transition: all 0.2s ease;

    &:focus-within,
    &.ant-input-affix-wrapper-focused {
      background-color: #fff;
      border-color: #d1d5db;
      box-shadow: 0 0 0 1px #d1d5db;
    }
  }
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-right: -6px;
  padding-right: 6px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #e5e7eb;
    border-radius: 2px;
  }
}

.empty-tip {
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
  padding: 30px 0;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  gap: 8px;

  .chat-icon {
    font-size: 15px;
    color: #9ca3af;
    flex-shrink: 0;
  }

  .title {
    font-size: 12.5px;
    color: #4b5563;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .delete-icon {
    font-size: 13px;
    color: #9ca3af;
    opacity: 0;
    transition: all 0.2s ease;
    flex-shrink: 0;

    &:hover {
      color: #ef4444;
    }
  }

  &:hover:not(.disabled) {
    background: rgba(243, 244, 246, 0.7);
    .title {
      color: #1f2937;
    }
    .delete-icon {
      opacity: 1;
    }
  }

  &.active {
    background: #f3f4f6;
    .chat-icon {
      color: #374151;
    }
    .title {
      font-weight: 500;
      color: #111827;
    }
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
}

// 2. 折叠态容器 (精细图标栏)
.collapsed-container {
  width: 52px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0 16px;
  box-sizing: border-box;
  animation: fadeIn 0.15s ease-out;
}

.collapsed-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.collapsed-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: #111827;
    background-color: rgba(243, 244, 246, 0.8);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.toggle-expand-btn {
    color: #4b5563;
    margin-bottom: 4px;
    
    &:hover {
      background-color: rgba(243, 244, 246, 0.8);
      color: #111827;
    }
  }
}

.collapsed-bottom {
  display: flex;
  justify-content: center;
  width: 100%;
}

.collapsed-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: #1f2937;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  display: grid;
  place-items: center;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
  overflow: hidden;

  &:hover {
    transform: scale(1.05);
  }
}

.sidebar-mask {
  display: none;
}

.sidebar-footer {
  height: 54px;
  border-top: 1px solid rgba(243, 244, 246, 0.8);
  padding: 0 16px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  box-sizing: border-box;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #1f2937;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 600;
  display: grid;
  place-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  user-select: none;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
  line-height: 1.3;
}

.user-status {
  font-size: 10px;
  color: #10b981;
  line-height: 1.2;
  margin-top: 1px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

// 移动端/窄屏自适应 (折叠态完全隐藏，展开态悬浮抽屉)
@media (max-width: 768px) {
  .embedded-sidebar {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    height: 100%;
    width: 0px;
    border-right: none;
    background-color: rgba(255, 255, 255, 0.96);
    z-index: 99;
    
    &.open {
      width: 260px;
      border-right: 1px solid rgba(229, 231, 235, 0.7);
      box-shadow: 10px 0 30px rgba(0, 0, 0, 0.08);
    }
  }

  .collapsed-container {
    display: none;
  }

  .sidebar-mask {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(2.5px);
    z-index: 50;
  }
}
</style>
