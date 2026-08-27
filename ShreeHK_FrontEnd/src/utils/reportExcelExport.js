/**
 * Shared Excel export for report tables (Venya reportExport parity).
 */
export async function exportReportToExcel({
  headers,
  rows,
  fileName = 'report',
  sheetName = 'Report',
  title = '',
  totals = false,
}) {
  if (!headers?.length || !rows?.length) {
    throw new Error('No data to export');
  }

  if (title) {
    await exportVenyaStyledReport({
      headers,
      rows,
      fileName,
      sheetName,
      title,
      totals,
    });
    return;
  }

  const XLSX = await import('xlsx-js-style');
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '4472C4' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const aoa = [
    headers.map((h) => h.title),
    ...rows.map((row, rowIndex) => headers.map((h) => {
      const val = typeof h.accessor === 'function' ? h.accessor(row, rowIndex) : row[h.key];
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

const BLACK_BORDER = {
  top: { style: 'thin', color: { rgb: 'FF000000' } },
  bottom: { style: 'thin', color: { rgb: 'FF000000' } },
  left: { style: 'thin', color: { rgb: 'FF000000' } },
  right: { style: 'thin', color: { rgb: 'FF000000' } },
};

function cellValue(header, row, rowIndex) {
  const val = typeof header.accessor === 'function'
    ? header.accessor(row, rowIndex)
    : row[header.key];
  return val == null ? '' : val;
}

function makeStyledCell(value, { isTitle, isHeader, isTotal, isNumber }) {
  const num = isNumber && value !== '' && value != null && !Number.isNaN(Number(value));
  return {
    v: num ? Number(value) : (value ?? ''),
    t: num ? 'n' : 's',
    s: {
      font: {
        name: 'Calibri',
        sz: isTitle ? 16 : 11,
        bold: Boolean(isTitle || isHeader || isTotal),
        color: { rgb: isHeader ? 'FFFFFFFF' : 'FF000000' },
      },
      fill: isHeader
        ? { patternType: 'solid', fgColor: { rgb: 'FF000000' } }
        : { patternType: 'solid', fgColor: { rgb: 'FFFFFFFF' } },
      alignment: {
        horizontal: 'center',
        vertical: 'center',
        wrapText: Boolean(isHeader),
      },
      border: BLACK_BORDER,
    },
  };
}

/**
 * Venya Company Report Excel: black header, white bold text, title row, totals.
 */
export async function exportVenyaStyledReport({
  headers,
  rows,
  fileName = 'report',
  sheetName = 'Report',
  title = '',
  totals = false,
}) {
  const XLSX = await import('xlsx-js-style');
  const lastCol = headers.length - 1;
  const startRow = 1;
  const headerRow = title ? startRow + 1 : startRow;
  const dataStart = headerRow + 1;
  const ws = {};

  if (title) {
    ws[XLSX.utils.encode_cell({ r: startRow, c: 0 })] = makeStyledCell(title, {
      isTitle: true,
      align: 'center',
    });
    for (let c = 1; c <= lastCol; c += 1) {
      ws[XLSX.utils.encode_cell({ r: startRow, c })] = makeStyledCell('', { isTitle: true });
    }
    ws['!merges'] = [{ s: { r: startRow, c: 0 }, e: { r: startRow, c: lastCol } }];
  }

  headers.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: headerRow, c })] = makeStyledCell(h.title, { isHeader: true });
  });

  const totalsAcc = {};
  rows.forEach((row, rowIdx) => {
    headers.forEach((h, c) => {
      const raw = cellValue(h, row, rowIdx);
      const isNumber = h.type === 'n';
      if (totals && h.total && isNumber) {
        totalsAcc[c] = (totalsAcc[c] || 0) + (Number(raw) || 0);
      }
      ws[XLSX.utils.encode_cell({ r: dataStart + rowIdx, c })] = makeStyledCell(raw, {
        isNumber,
      });
    });
  });

  let lastRow = dataStart + rows.length - 1;
  if (totals) {
    lastRow += 1;
    headers.forEach((h, c) => {
      const hasTotal = h.total && h.type === 'n';
      const value = hasTotal
        ? Number((totalsAcc[c] || 0).toFixed(h.decimals ?? 2))
        : (c === 0 ? 'Total' : '');
      ws[XLSX.utils.encode_cell({ r: lastRow, c })] = makeStyledCell(value, {
        isTotal: true,
        isNumber: hasTotal,
      });
    });
  }

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow, c: lastCol },
  });
  ws['!cols'] = headers.map((h) => ({ wch: h.width || 14 }));
  ws['!rows'] = title
    ? [{ hpt: 15 }, { hpt: 24 }, { hpt: 22 }, ...rows.map(() => ({ hpt: 16 }))]
    : [{ hpt: 15 }, { hpt: 22 }, ...rows.map(() => ({ hpt: 16 }))];
  if (totals) ws['!rows'].push({ hpt: 16 });
  ws['!freeze'] = {
    xSplit: 0,
    ySplit: headerRow + 1,
    topLeftCell: XLSX.utils.encode_cell({ r: headerRow + 1, c: 0 }),
    activePane: 'bottomLeft',
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  const now = new Date();
  const stamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  XLSX.writeFile(wb, `${fileName}_${stamp}.xlsx`);
}

export default exportReportToExcel;
