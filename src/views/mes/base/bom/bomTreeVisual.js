export function buildBomTreeNodes(items = [], level = 1) {
  return items.map(item => ({
    ...item,
    key: item.id,
    treeLevel: level
  }))
}

export function getBomTreeLevel(record = {}) {
  return Number.isFinite(record.treeLevel) && record.treeLevel > 0 ? record.treeLevel : 1
}

export function getChildBomTreeLevel(record = {}) {
  return getBomTreeLevel(record) + 1
}

export function getBomTreeNodeClass(record = {}) {
  return `bom-tree-node ${record.hasChildBom ? 'is-expandable' : 'is-leaf'}`
}
