import request from '@/utils/request';

export const inventoryBalanceApi = {
  list: (q) => request({ url: '/mes/purchase/inventory/list', method: 'get', params: q }),
  get: (id) => request({ url: `/mes/purchase/inventory/${id}`, method: 'get' }),
};
