/** CSV 다운로드 */
export function downloadCSV(
  data: Record<string, unknown>[],
  filename: string
): void {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h]
          const str = val === null || val === undefined ? '' : String(val)
          // 콤마나 따옴표 포함 시 감싸기
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        .join(',')
    ),
  ]

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
