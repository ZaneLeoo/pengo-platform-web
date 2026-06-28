import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBomVersionCompareSummary } from './bomVersionCompareSummary.js'

test('builds compare summary counts by diff type', () => {
  const summary = buildBomVersionCompareSummary({
    differences: [
      { diffType: 'ADD' },
      { diffType: 'DELETE' },
      { diffType: 'CHANGE' },
      { diffType: 'CHANGE' }
    ]
  })

  assert.deepEqual(summary, {
    addCount: 1,
    deleteCount: 1,
    changeCount: 2,
    total: 4
  })
})

test('returns empty summary for missing differences', () => {
  assert.deepEqual(buildBomVersionCompareSummary({}), {
    addCount: 0,
    deleteCount: 0,
    changeCount: 0,
    total: 0
  })
})
