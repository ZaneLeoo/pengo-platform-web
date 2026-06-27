import test from 'node:test'
import assert from 'node:assert/strict'
import { buildProcessSteps } from './processSteps.js'

test('合并同一节点并把问题分类器显示为识别意图', () => {
  const steps = buildProcessSteps([
    { event: 'node_started', nodeId: 'node-1', title: '问题分类器', nodeType: 'question-classifier' },
    { event: 'node_finished', nodeId: 'node-1', title: '问题分类器', nodeType: 'question-classifier', elapsedTime: 0.32 }
  ])

  assert.deepEqual(steps, [{
    id: 'node-1',
    label: '识别意图',
    status: 'finished',
    elapsedTime: 0.32
  }])
})

test('根据安全节点标题展示数据查询和图表生成动作', () => {
  const steps = buildProcessSteps([
    { event: 'node_started', nodeId: 'sql-1', title: '自然语言转 SQL', nodeType: 'code' },
    { event: 'node_finished', nodeId: 'sql-1', title: '自然语言转 SQL', nodeType: 'code' },
    { event: 'node_started', nodeId: 'chart-1', title: '生成 BI 图表', nodeType: 'llm' }
  ])

  assert.equal(steps[0].label, '查询业务数据')
  assert.equal(steps[0].status, 'finished')
  assert.equal(steps[1].label, '生成图表')
  assert.equal(steps[1].status, 'running')
})

test('结构化产物到达后追加图表已生成步骤', () => {
  const steps = buildProcessSteps([
    { event: 'artifact_ready', artifactType: 'chart', title: '季度销售图' }
  ])

  assert.equal(steps[0].label, '图表已生成')
  assert.equal(steps[0].status, 'finished')
})

test('用户停止后把仍在运行的节点收敛为停止状态', () => {
  const steps = buildProcessSteps([
    { event: 'node_started', nodeId: 'classifier-1', title: '问题分类器', nodeType: 'question-classifier' }
  ], { terminalStatus: 'stopped' })

  assert.equal(steps[0].label, '识别意图')
  assert.equal(steps[0].status, 'stopped')
})

test('正常结束后不保留仍在运行的节点', () => {
  const steps = buildProcessSteps([
    { event: 'node_started', nodeId: 'classifier-1', title: '问题分类器', nodeType: 'question-classifier' }
  ], { terminalStatus: 'finished' })

  assert.equal(steps[0].status, 'finished')
})
