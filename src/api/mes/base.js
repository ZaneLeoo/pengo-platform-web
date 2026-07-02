import request from '@/utils/request'

// 物料分类
export function listCategory(query) { return request({ url: '/mes/base/materialCategory/list', method: 'get', params: query }) }
export function getCategory(id) { return request({ url: '/mes/base/materialCategory/' + id, method: 'get' }) }
export function addCategory(data) { return request({ url: '/mes/base/materialCategory', method: 'post', data }) }
export function updateCategory(data) { return request({ url: '/mes/base/materialCategory', method: 'put', data }) }
export function delCategory(id) { return request({ url: '/mes/base/materialCategory/' + id, method: 'delete' }) }
export function treeSelect() { return request({ url: '/mes/base/materialCategory/treeSelect', method: 'get' }) }

// 物料
export function listMaterial(query) { return request({ url: '/mes/base/material/list', method: 'get', params: query }) }
export function getMaterial(id) { return request({ url: '/mes/base/material/' + id, method: 'get' }) }
export function addMaterial(data) { return request({ url: '/mes/base/material', method: 'post', data }) }
export function updateMaterial(data) { return request({ url: '/mes/base/material', method: 'put', data }) }
export function delMaterial(id) { return request({ url: '/mes/base/material/' + id, method: 'delete' }) }
export function exportMaterial(query) { return request({ url: '/mes/base/material/export', method: 'post', params: query }) }

// BOM
export function listBomMaster(query) { return request({ url: '/mes/base/bomMaster/list', method: 'get', params: query }) }
export function getBomMaster(id) { return request({ url: '/mes/base/bomMaster/' + id, method: 'get' }) }
export function addBomMaster(data) { return request({ url: '/mes/base/bomMaster', method: 'post', data }) }
export function updateBomMaster(data) { return request({ url: '/mes/base/bomMaster', method: 'put', data }) }
export function delBomMaster(ids) { return request({ url: '/mes/base/bomMaster/' + ids, method: 'delete' }) }
export function listBomVersion(query) { return request({ url: '/mes/base/bomVersion/list', method: 'get', params: query }) }
export function getBomVersion(id) { return request({ url: '/mes/base/bomVersion/' + id, method: 'get' }) }
export function addBomVersion(data) { return request({ url: '/mes/base/bomVersion', method: 'post', data }) }
export function updateBomVersion(data) { return request({ url: '/mes/base/bomVersion', method: 'put', data }) }
export function delBomVersion(ids) { return request({ url: '/mes/base/bomVersion/' + ids, method: 'delete' }) }
export function copyBomVersion(data) { return request({ url: '/mes/base/bomVersion/copy', method: 'post', data }) }
export function checkBomVersion(id) { return request({ url: '/mes/base/bomVersion/' + id + '/check', method: 'get' }) }
export function compareBomVersion(query) { return request({ url: '/mes/base/bomVersion/compare', method: 'get', params: query }) }
export function listBomItem(query) { return request({ url: '/mes/base/bomItem/list', method: 'get', params: query }) }
export function listBomItemChildren(bomVersionId, parentItemCode) { return request({ url: '/mes/base/bomItem/children', method: 'get', params: { bomVersionId, parentItemCode } }) }
export function listBomItemByComponent(componentItemCode, bomVersionId) { return request({ url: '/mes/base/bomItem/childrenByComponent', method: 'get', params: { componentItemCode, bomVersionId } }) }
export function getBomItem(id) { return request({ url: '/mes/base/bomItem/' + id, method: 'get' }) }
export function addBomItem(data) { return request({ url: '/mes/base/bomItem', method: 'post', data }) }
export function updateBomItem(data) { return request({ url: '/mes/base/bomItem', method: 'put', data }) }
export function delBomItem(ids) { return request({ url: '/mes/base/bomItem/' + ids, method: 'delete' }) }

// BOM OCR 导入
export function listBomImport(query) { return request({ url: '/mes/base/bomImport/list', method: 'get', params: query }) }
export function getBomImport(id) { return request({ url: '/mes/base/bomImport/' + id, method: 'get' }) }
export function recognizeBomImport(data) {
  return request({
    url: '/mes/base/bomImport/recognize',
    method: 'post',
    data,
    timeout: 600000,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export function validateBomImport(id) { return request({ url: `/mes/base/bomImport/${id}/validate`, method: 'post' }) }
export function updateBomImport(id, data) { return request({ url: `/mes/base/bomImport/${id}`, method: 'put', data }) }
export function delBomImport(ids) { return request({ url: '/mes/base/bomImport/' + ids, method: 'delete' }) }
