import request from '@/utils/request';
const api = (url) => ({
  list: (q) => request({ url: `/mes/purchase/${url}/list`, method: 'get', params: q }),
  get: (id) => request({ url: `/mes/purchase/${url}/${id}`, method: 'get' }),
  add: (data) => request({ url: `/mes/purchase/${url}`, method: 'post', data }),
  update: (data) => request({ url: `/mes/purchase/${url}`, method: 'put', data }),
  remove: (ids) => request({ url: `/mes/purchase/${url}/${ids}`, method: 'delete' }),
});
export const purchaseOrderApi = api('order');
export const purchaseReceiptApi = api('receipt');
export const purchaseInboundApi = api('inbound');
export const inventoryBalanceApi = api('inventory');
export const approvePurchaseOrder = (id) =>
  request({ url: `/mes/purchase/order/${id}/approve`, method: 'post' });
export const unapprovePurchaseOrder = (id) =>
  request({ url: `/mes/purchase/order/${id}/unapprove`, method: 'post' });
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
export const approvePurchaseInbound = (id) =>
  request({ url: `/mes/purchase/inbound/${id}/approve`, method: 'post' });
export const unapprovePurchaseInbound = (id) =>
  request({ url: `/mes/purchase/inbound/${id}/unapprove`, method: 'post' });
export const listInboundReferenceLines = (params) =>
  request({ url: '/mes/purchase/inbound/reference/receipt-lines', method: 'get', params });
