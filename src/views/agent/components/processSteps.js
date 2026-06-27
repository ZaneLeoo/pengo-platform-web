const NODE_EVENTS = new Set(['node_started', 'node_finished'])

/** 将后端安全事件摘要归并为面向用户的业务步骤。 */
export function buildProcessSteps(items = [], options = {}) {
  const steps = new Map()

  items.forEach((item, position) => {
    if (item.event === 'artifact_ready') {
      const id = `artifact:${item.artifactType || 'unknown'}:${item.title || position}`
      steps.set(id, {
        id,
        label: item.artifactType === 'table' ? '数据表已生成' : '图表已生成',
        status: 'finished'
      })
      return
    }

    if (!NODE_EVENTS.has(item.event)) return

    const id = item.nodeId || `${item.nodeType || 'node'}:${item.title || item.index || position}`
    const previous = steps.get(id)
    const step = {
      id,
      label: resolveStepLabel(item),
      status: item.event === 'node_finished' ? 'finished' : 'running'
    }
    const elapsedTime = item.elapsedTime ?? previous?.elapsedTime
    if (elapsedTime !== undefined && elapsedTime !== null) {
      step.elapsedTime = elapsedTime
    }
    steps.set(id, step)
  })

  return Array.from(steps.values()).map(step => {
    if (step.status !== 'running' || !options.terminalStatus) return step
    return { ...step, status: options.terminalStatus }
  })
}

/** 根据节点类型与安全标题生成简洁的中文动作名称。 */
function resolveStepLabel(item) {
  const title = String(item.title || '').trim()
  const titleLower = title.toLowerCase()
  const nodeType = String(item.nodeType || '').toLowerCase()

  if (nodeType.includes('question-classifier') || title.includes('问题分类')) return '识别意图'
  if (/sql|数据库|数据查询|查询数据/.test(titleLower)) return '查询业务数据'
  if (/图表|可视化|\bbi\b/.test(titleLower)) return '生成图表'
  if (nodeType.includes('knowledge-retrieval')) return '检索知识库'
  if (nodeType.includes('http') || nodeType.includes('tool')) return title || '调用业务能力'
  if (nodeType.includes('code')) return title || '处理业务数据'
  if (nodeType.includes('answer')) return '整理回答'
  if (nodeType.includes('llm')) return title && title !== '大模型' ? title : '组织回答'
  return title || '处理请求'
}
