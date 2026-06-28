export function buildBomCheckSummary(result = {}) {
  const issues = result.issues || []
  const errorCount = issues.filter(item => item.level === 'ERROR').length
  const warnCount = issues.filter(item => item.level === 'WARN').length
  const infoCount = issues.filter(item => item.level === 'INFO').length

  return {
    errorCount,
    warnCount,
    infoCount,
    total: issues.length,
    status: errorCount > 0 ? 'error' : (warnCount > 0 ? 'warning' : 'success')
  }
}
