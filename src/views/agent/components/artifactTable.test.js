import test from 'node:test'
import assert from 'node:assert/strict'
import { buildArtifactTable } from './artifactTable.js'

test('把二维产物数据映射为 Ant Design Vue 表格 columns 和 dataSource', () => {
  const table = buildArtifactTable({
    columns: ['月份', '销售额'],
    rows: [
      ['一月', 1200],
      ['二月', 1800]
    ]
  })

  assert.deepEqual(table.columns, [
    { title: '月份', dataIndex: 'col_0', key: 'col_0', ellipsis: true },
    { title: '销售额', dataIndex: 'col_1', key: 'col_1', ellipsis: true }
  ])
  assert.deepEqual(table.dataSource, [
    { key: 'row_0', col_0: '一月', col_1: 1200 },
    { key: 'row_1', col_0: '二月', col_1: 1800 }
  ])
})

test('缺失 payload 时返回空表格结构', () => {
  assert.deepEqual(buildArtifactTable(), {
    columns: [],
    dataSource: []
  })
})

test('标量行数据降级到第一列，避免渲染崩溃', () => {
  const table = buildArtifactTable({
    columns: ['结果'],
    rows: ['通过']
  })

  assert.deepEqual(table.dataSource, [
    { key: 'row_0', col_0: '通过' }
  ])
})
