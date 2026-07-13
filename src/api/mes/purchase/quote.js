import request from '@/utils/request'

export const purchaseQuoteApi = {
  list: (params) => request({ url: '/mes/purchase/quote/list', method: 'get', params }),
  get: (id) => request({ url: `/mes/purchase/quote/${id}`, method: 'get' }),
  add: (data) => request({ url: '/mes/purchase/quote', method: 'post', data }),
  update: (data) => request({ url: '/mes/purchase/quote', method: 'put', data }),
  remove: (ids) => request({ url: `/mes/purchase/quote/${ids}`, method: 'delete' }),
  approve: (id) => request({ url: `/mes/purchase/quote/${id}/approve`, method: 'post' }),
  unapprove: (id) => request({ url: `/mes/purchase/quote/${id}/unapprove`, method: 'post' }),
}
