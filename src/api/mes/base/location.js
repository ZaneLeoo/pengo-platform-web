import request from '@/utils/request';

export const locationApi = {
  list: (q) => request({ url: '/mes/base/location/list', method: 'get', params: q }),
  get: (id) => request({ url: `/mes/base/location/${id}`, method: 'get' }),
  add: (data) => request({ url: '/mes/base/location', method: 'post', data }),
  update: (data) => request({ url: '/mes/base/location', method: 'put', data }),
  remove: (ids) => request({ url: `/mes/base/location/${ids}`, method: 'delete' }),
};
