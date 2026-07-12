import request from '@/utils/request';

export const purchaseReceiptApi = {
  list: (q) => request({ url: '/mes/purchase/receipt/list', method: 'get', params: q }),
  get: (id) => request({ url: `/mes/purchase/receipt/${id}`, method: 'get' }),
  add: (data) => request({ url: '/mes/purchase/receipt', method: 'post', data }),
  update: (data) => request({ url: '/mes/purchase/receipt', method: 'put', data }),
  remove: (ids) => request({ url: `/mes/purchase/receipt/${ids}`, method: 'delete' }),
};

export const approvePurchaseReceipt = (id) =>
  request({ url: `/mes/purchase/receipt/${id}/approve`, method: 'post' });

export const unapprovePurchaseReceipt = (id) =>
  request({ url: `/mes/purchase/receipt/${id}/unapprove`, method: 'post' });

export const inspectPurchaseReceipt = (id, data) =>
  request({ url: `/mes/purchase/receipt/${id}/inspect`, method: 'post', data });

export const uninspectPurchaseReceipt = (id) =>
  request({ url: `/mes/purchase/receipt/${id}/uninspect`, method: 'post' });

export const listReceiptReferenceLines = (params) =>
  request({ url: '/mes/purchase/receipt/reference/order-lines', method: 'get', params });
