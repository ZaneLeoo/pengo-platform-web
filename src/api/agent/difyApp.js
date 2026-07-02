import request from '@/utils/request';

export function listDifyApps(query) {
  return request({
    url: '/agent/difyApps/list',
    method: 'get',
    params: query,
  });
}

export function getDifyApp(id) {
  return request({
    url: `/agent/difyApps/${id}`,
    method: 'get',
  });
}

export function addDifyApp(data) {
  return request({
    url: '/agent/difyApps',
    method: 'post',
    data,
  });
}

export function updateDifyApp(data) {
  return request({
    url: '/agent/difyApps',
    method: 'put',
    data,
  });
}

export function deleteDifyApps(ids) {
  return request({
    url: `/agent/difyApps/${ids}`,
    method: 'delete',
  });
}
