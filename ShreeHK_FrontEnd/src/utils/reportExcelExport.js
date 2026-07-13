/**
 * Shared Excel export for report tables (Venya reportExport parity).
 */
export async function exportReportToExcel({
  headers,
  rows,
  fileName = 'report',
  sheetName = 'Report',
}) {
  if (!headers?.length || !rows?.length) {
    throw new Error('No data to export');
  }

  const XLSX = await import('xlsx-js-style');
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '4472C4' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const aoa = [
    headers.map((h) => h.title),
    ...rows.map((row) => headers.map((h) => {
      const val = typeof h.accessor === 'function' ? h.accessor(row) : row[h.key];
      return val == null ? '' : val;
    })),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = headers.map((h) => ({ wch: h.width || 14 }));

  headers.forEach((_, colIdx) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: colIdx })];
    if (cell) cell.s = headerStyle;
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  const now = new Date();
  const stamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  XLSX.writeFile(wb, `${fileName}_${stamp}.xlsx`);
}

export default exportReportToExcel;
