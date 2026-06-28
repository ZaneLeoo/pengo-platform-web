import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBomCheckSummary } from './bomCheckSummary.js'

test('builds check summary counts from issues', () => {
  const summary = buildBomCheckSummary({
    issues: [
      { level: 'ERROR', message: '无子件' },
      { level: 'WARN', message: '重复子件' },
      { level: 'INFO', message: '草稿版本' }
    ]
  })

  assert.deepEqual(summary, {
    errorCount: 1,
    warnCount: 1,
    infoCount: 1,
    total: 3,
    status: 'error'
  })
})

test('returns success when there are no check issues', () => {
  assert.deepEqual(buildBomCheckSummary({ issues: [] }), {
    errorCount: 0,
    warnCount: 0,
    infoCount: 0,
    total: 0,
    status: 'success'
  })
})

test('warning summary is used when only warnings exist', () => {
  assert.equal(buildBomCheckSummary({ issues: [{ level: 'WARN' }] }).status, 'warning')
})
