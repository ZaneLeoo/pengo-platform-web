export function buildBomVersionCompareSummary(result = {}) {
  const differences = result.differences || []
  return {
    addCount: differences.filter(item => item.diffType === 'ADD').length,
    deleteCount: differences.filter(item => item.diffType === 'DELETE').length,
    changeCount: differences.filter(item => item.diffType === 'CHANGE').length,
    total: differences.length
  }
}
