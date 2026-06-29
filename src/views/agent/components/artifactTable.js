export function buildArtifactTable(payload = {}) {
  const columns = Array.isArray(payload.columns)
    ? payload.columns.map((column, index) => ({
      title: String(column || `列 ${index + 1}`),
      dataIndex: `col_${index}`,
      key: `col_${index}`,
      ellipsis: true
    }))
    : []

  const rows = Array.isArray(payload.rows) ? payload.rows : []
  const dataSource = rows.map((row, rowIndex) => {
    const cells = Array.isArray(row) ? row : [row]
    return cells.reduce((record, cell, cellIndex) => {
      record[`col_${cellIndex}`] = cell
      return record
    }, { key: `row_${rowIndex}` })
  })

  return { columns, dataSource }
}
