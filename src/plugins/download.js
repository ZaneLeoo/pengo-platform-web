import axios from 'axios';
import { message } from 'ant-design-vue';

export default {
  // 通用下载方法
  download(url, params, filename) {
    message.loading('正在下载中...', 0);
    return axios({
      method: 'post',
      url,
      data: params,
      responseType: 'blob',
    })
      .then((res) => {
        const blob = new Blob([res.data]);
        const downloadElement = document.createElement('a');
        const href = window.URL.createObjectURL(blob);
        downloadElement.href = href;
        downloadElement.download = filename || 'download';
        document.body.appendChild(downloadElement);
        downloadElement.click();
        document.body.removeChild(downloadElement);
        window.URL.revokeObjectURL(href);
        message.destroy();
        message.success('下载成功');
      })
      .catch(() => {
        message.destroy();
        message.error('下载失败');
      });
  },
};
