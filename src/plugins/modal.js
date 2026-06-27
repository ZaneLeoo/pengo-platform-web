import { message, Modal, notification } from 'ant-design-vue';

let loadingInstance = null;

// 全屏 loading（DOM 实现，兼容原 API）
function createLoadingOverlay(content) {
  const div = document.createElement('div');
  div.className = 'ant-modal-loading-overlay';
  div.innerHTML = `
    <div style="
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
    ">
      <div style="text-align: center; color: #fff;">
        <div class="ant-spin ant-spin-lg ant-spin-spinning" style="margin-bottom: 16px;">
          <span class="ant-spin-dot ant-spin-dot-spin">
            <i class="ant-spin-dot-item"></i>
            <i class="ant-spin-dot-item"></i>
            <i class="ant-spin-dot-item"></i>
            <i class="ant-spin-dot-item"></i>
          </span>
        </div>
        <div>${content || '加载中...'}</div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  return div;
}

export default {
  // 消息提示
  msg(content) {
    message.info(content);
  },
  // 错误消息
  msgError(content) {
    message.error(content);
  },
  // 成功消息
  msgSuccess(content) {
    message.success(content);
  },
  // 警告消息
  msgWarning(content) {
    message.warning(content);
  },
  // 弹出提示
  alert(content) {
    Modal.info({ title: '系统提示', content });
  },
  // 错误提示
  alertError(content) {
    Modal.error({ title: '系统提示', content });
  },
  // 成功提示
  alertSuccess(content) {
    Modal.success({ title: '系统提示', content });
  },
  // 警告提示
  alertWarning(content) {
    Modal.warning({ title: '系统提示', content });
  },
  // 通知提示
  notify(content) {
    notification.info({ message: '系统提示', description: content });
  },
  // 错误通知
  notifyError(content) {
    notification.error({ message: '系统提示', description: content });
  },
  // 成功通知
  notifySuccess(content) {
    notification.success({ message: '系统提示', description: content });
  },
  // 警告通知
  notifyWarning(content) {
    notification.warning({ message: '系统提示', description: content });
  },
  // 确认窗体
  confirm(content) {
    return Modal.confirm({
      title: '系统提示',
      content,
      okText: '确定',
      cancelText: '取消',
    });
  },
  // 提交内容（prompt）
  prompt(content, defaultText = '') {
    return new Promise((resolve, reject) => {
      let inputValue = defaultText;
      const modal = Modal.confirm({
        title: '系统提示',
        content: content,
        okText: '确定',
        cancelText: '取消',
        onOk() {
          resolve(inputValue);
        },
        onCancel() {
          reject(new Error('cancel'));
        },
      });
      // 注意：Antdv 的 Modal.confirm 不支持内嵌 input。
      // 如果需要 prompt 功能，业务层应使用自定义 Modal 组件。
    });
  },
  // 打开遮罩层
  loading(content) {
    if (loadingInstance) return;
    loadingInstance = createLoadingOverlay(content);
  },
  // 关闭遮罩层
  closeLoading() {
    if (loadingInstance) {
      document.body.removeChild(loadingInstance);
      loadingInstance = null;
    }
  },
};
