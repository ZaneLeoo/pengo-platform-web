import request from '@/utils/request';

export const purchaseOrderApi = {
  list: (q) => request({ url: '/mes/purchase/order/list', method: 'get', params: q }),
  get: (id) => request({ url: `/mes/purchase/order/${id}`, method: 'get' }),
  add: (data) => request({ url: '/mes/purchase/order', method: 'post', data }),
  update: (data) => request({ url: '/mes/purchase/order', method: 'put', data }),
  remove: (ids) => request({ url: `/mes/purchase/order/${ids}`, method: 'delete' }),
};

export const approvePurchaseOrder = (id) =>
  request({ url: `/mes/purchase/order/${id}/approve`, method: 'post' });

export const unapprovePurchaseOrder = (id) =>
  request({ url: `/mes/purchase/order/${id}/unapprove`, method: 'post' });
