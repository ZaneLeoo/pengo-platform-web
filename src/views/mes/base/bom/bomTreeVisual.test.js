import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBomTreeNodes,
  getBomTreeLevel,
  getBomTreeNodeClass,
  getChildBomTreeLevel,
  shouldShowBomTreeElbow
} from './bomTreeVisual.js'

test('root bom items stay at level one', () => {
  assert.equal(getBomTreeLevel({ treeLevel: 1 }), 1)
  assert.equal(getBomTreeLevel({}), 1)
})

test('child bom level is parent level plus one', () => {
  assert.equal(getChildBomTreeLevel({ treeLevel: 1 }), 2)
  assert.equal(getChildBomTreeLevel({ treeLevel: 2 }), 3)
})

test('buildBomTreeNodes assigns stable sibling metadata without map index leakage', () => {
  const nodes = buildBomTreeNodes([{ id: 1 }, { id: 2 }, { id: 3 }], 1)

  assert.deepEqual(nodes.map(item => item.treeLevel), [1, 1, 1])
})

test('node class distinguishes expandable and leaf rows', () => {
  assert.equal(getBomTreeNodeClass({ hasChildBom: true }), 'bom-tree-node is-expandable')
  assert.equal(getBomTreeNodeClass({ hasChildBom: false }), 'bom-tree-node is-leaf')
})

test('tree elbow only appears for child levels', () => {
  assert.equal(shouldShowBomTreeElbow({ treeLevel: 1 }), false)
  assert.equal(shouldShowBomTreeElbow({ treeLevel: 2 }), true)
})
