import request from '@/utils/request';

export const supplierApi = {
  list: (q) => request({ url: '/mes/base/supplier/list', method: 'get', params: q }),
  get: (id) => request({ url: `/mes/base/supplier/${id}`, method: 'get' }),
  add: (data) => request({ url: '/mes/base/supplier', method: 'post', data }),
  update: (data) => request({ url: '/mes/base/supplier', method: 'put', data }),
  remove: (ids) => request({ url: `/mes/base/supplier/${ids}`, method: 'delete' }),
};
