import request from '@/utils/request';

export const purchaseInboundApi = {
  list: (q) => request({ url: '/mes/purchase/inbound/list', method: 'get', params: q }),
  get: (id) => request({ url: `/mes/purchase/inbound/${id}`, method: 'get' }),
  add: (data) => request({ url: '/mes/purchase/inbound', method: 'post', data }),
  update: (data) => request({ url: '/mes/purchase/inbound', method: 'put', data }),
  remove: (ids) => request({ url: `/mes/purchase/inbound/${ids}`, method: 'delete' }),
};

export const approvePurchaseInbound = (id) =>
  request({ url: `/mes/purchase/inbound/${id}/approve`, method: 'post' });

export const unapprovePurchaseInbound = (id) =>
  request({ url: `/mes/purchase/inbound/${id}/unapprove`, method: 'post' });

export const listInboundReferenceLines = (params) =>
  request({ url: '/mes/purchase/inbound/reference/receipt-lines', method: 'get', params });
