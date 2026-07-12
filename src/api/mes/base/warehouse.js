import request from '@/utils/request';

export const warehouseApi = {
  list: (q) => request({ url: '/mes/base/warehouse/list', method: 'get', params: q }),
  get: (id) => request({ url: `/mes/base/warehouse/${id}`, method: 'get' }),
  add: (data) => request({ url: '/mes/base/warehouse', method: 'post', data }),
  update: (data) => request({ url: '/mes/base/warehouse', method: 'put', data }),
  remove: (ids) => request({ url: `/mes/base/warehouse/${ids}`, method: 'delete' }),
};
