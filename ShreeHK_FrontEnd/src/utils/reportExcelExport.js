import { trackExportAudit } from "./auditExportTracker";

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
  autoFilter = false,
  titleNoTopLeftBorder = false,
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
      autoFilter,
      titleNoTopLeftBorder,
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

  trackExportAudit({
    moduleName: title || sheetName || fileName || "Report",
    fileName,
    count: rows.length,
    format: "xlsx",
  });
}

const BLACK_BORDER = {
  top: { style: 'thin', color: { rgb: 'FF000000' } },
  bottom: { style: 'thin', color: { rgb: 'FF000000' } },
  left: { style: 'thin', color: { rgb: 'FF000000' } },
  right: { style: 'thin', color: { rgb: 'FF000000' } },
};

const TITLE_BORDER_NO_TOP_LEFT = {
  bottom: { style: 'thin', color: { rgb: 'FF000000' } },
  right: { style: 'thin', color: { rgb: 'FF000000' } },
};

function cellValue(header, row, rowIndex) {
  const val = typeof header.accessor === 'function'
    ? header.accessor(row, rowIndex)
    : row[header.key];
  return val == null ? '' : val;
}

function makeStyledCell(value, { isTitle, isHeader, isTotal, isNumber, titleNoTopLeftBorder }) {
  const num = isNumber && value !== '' && value != null && !Number.isNaN(Number(value));
  const border = isTitle && titleNoTopLeftBorder ? TITLE_BORDER_NO_TOP_LEFT : BLACK_BORDER;
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
      border,
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
  autoFilter = false,
  titleNoTopLeftBorder = false,
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
      titleNoTopLeftBorder,
    });
    for (let c = 1; c <= lastCol; c += 1) {
      ws[XLSX.utils.encode_cell({ r: startRow, c })] = makeStyledCell('', {
        isTitle: true,
        titleNoTopLeftBorder,
      });
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
  if (autoFilter) {
    const filterEndRow = totals ? lastRow - 1 : lastRow;
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: headerRow, c: 0 },
        e: { r: filterEndRow, c: lastCol },
      }),
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  const now = new Date();
  const stamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  XLSX.writeFile(wb, `${fileName}_${stamp}.xlsx`);
}

export async function exportPartyReportToExcel({
  rows,
  title = 'Party Report',
  fileName = 'Party_Report',
  sheetName = 'Party Report',
}) {
  if (!rows?.length) {
    throw new Error('No data to export');
  }

  const XLSX = await import('xlsx-js-style');

  const headers = [
    { title: 'Date', key: 'date', width: 14, align: 'left' },
    { title: 'Account', key: 'account', width: 16, align: 'left' },
    { title: 'Party', key: 'party', width: 28, align: 'left' },
    { title: 'Cheque', key: 'cheque', width: 14, align: 'left' },
    { title: 'Description', key: 'description', width: 48, align: 'left' },
    { title: 'Credit', key: 'credit', width: 16, align: 'right' },
    { title: 'Debit', key: 'debit', width: 16, align: 'right' },
    { title: 'Balance', key: 'balance', width: 16, align: 'right' },
  ];

  const ws = {};
  const lastCol = headers.length - 1; // 7 (Col H)

  // Colors
  const TITLE_COLOR = { rgb: '70B5D9' }; // Soft Sky Blue / Cyan
  const HEADER_FILL = { patternType: 'solid', fgColor: { rgb: 'F2B6D6' } }; // Pastel Pink
  const HEADER_FONT_COLOR = { rgb: '2B1B54' }; // Deep Indigo / Dark Purple
  const HEADER_BORDER = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  // Row 2 (0-indexed r: 1): Title (Sachin Credit-HKD Report)
  const titleRowIdx = 1;
  for (let c = 0; c <= lastCol; c += 1) {
    ws[XLSX.utils.encode_cell({ r: titleRowIdx, c })] = {
      v: c === 0 ? title : '',
      t: 's',
      s: {
        font: {
          name: 'Calibri',
          sz: 16,
          bold: true,
          color: TITLE_COLOR,
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
      },
    };
  }
  ws['!merges'] = [{ s: { r: titleRowIdx, c: 0 }, e: { r: titleRowIdx, c: lastCol } }];

  // Row 4 (0-indexed r: 3): Table Headers
  const headerRowIdx = 3;
  headers.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: headerRowIdx, c })] = {
      v: h.title,
      t: 's',
      s: {
        font: {
          name: 'Calibri',
          sz: 11,
          bold: true,
          color: HEADER_FONT_COLOR,
        },
        fill: HEADER_FILL,
        alignment: {
          horizontal: 'center',
          vertical: 'center',
          wrapText: true,
        },
        border: HEADER_BORDER,
      },
    };
  });

  // Row 5+ (0-indexed r: 4): Data rows
  const dataStartRowIdx = 4;
  rows.forEach((row, rIdx) => {
    const rowNum = dataStartRowIdx + rIdx;

    headers.forEach((h, c) => {
      let rawVal = row[h.key];
      let cellType = 's';
      let cellValue = rawVal == null ? '' : String(rawVal);
      let numVal = null;

      if (h.key === 'date') {
        if (rawVal) {
          const dStr = String(rawVal);
          // if already in DD-MM-YYYY format, leave as is, otherwise format if valid
          if (dStr.includes('T') || dStr.includes('-')) {
            const parts = dStr.split(/[-T /]/);
            if (parts.length >= 3 && parts[0].length === 4) {
              // YYYY-MM-DD
              cellValue = `${parts[2].slice(0, 2)}-${parts[1]}-${parts[0]}`;
            } else {
              cellValue = dStr.split('T')[0];
            }
          }
        }
      } else if (h.key === 'credit' || h.key === 'debit') {
        const parsed = parseFloat(rawVal);
        if (!Number.isNaN(parsed) && parsed !== 0) {
          cellType = 'n';
          numVal = Number(parsed.toFixed(2));
          cellValue = numVal;
        } else {
          cellValue = '';
        }
      } else if (h.key === 'balance') {
        const parsed = parseFloat(rawVal);
        if (!Number.isNaN(parsed)) {
          cellType = 'n';
          numVal = Number(parsed.toFixed(2));
          cellValue = numVal;
        } else {
          cellValue = rawVal || '';
        }
      }

      ws[XLSX.utils.encode_cell({ r: rowNum, c })] = {
        v: cellValue,
        t: cellType,
        s: {
          font: {
            name: 'Calibri',
            sz: 11,
            bold: false,
            color: { rgb: '000000' },
          },
          alignment: {
            horizontal: h.align,
            vertical: 'center',
          },
        },
      };
    });
  });

  // Summary / Total Row (Row after last data row)
  const totalRowIdx = dataStartRowIdx + rows.length;
  const lastBalanceRaw = rows[rows.length - 1]?.balance;
  const lastBalanceNum = parseFloat(lastBalanceRaw);
  const finalBalanceVal = !Number.isNaN(lastBalanceNum) ? Number(lastBalanceNum.toFixed(2)) : (lastBalanceRaw || '');

  for (let c = 0; c <= lastCol; c += 1) {
    let cellVal = '';
    let cellType = 's';
    let align = 'left';

    if (c === 4) {
      // Column E: Description -> "Total Balance"
      cellVal = 'Total Balance';
      align = 'left';
    } else if (c === 7) {
      // Column H: Balance -> Final balance amount
      cellVal = finalBalanceVal;
      cellType = typeof finalBalanceVal === 'number' ? 'n' : 's';
      align = 'right';
    }

    ws[XLSX.utils.encode_cell({ r: totalRowIdx, c })] = {
      v: cellVal,
      t: cellType,
      s: {
        font: {
          name: 'Calibri',
          sz: 11,
          bold: true,
          color: TITLE_COLOR,
        },
        alignment: {
          horizontal: align,
          vertical: 'center',
        },
      },
    };
  }

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: totalRowIdx, c: lastCol },
  });

  ws['!cols'] = headers.map((h) => ({ wch: h.width || 14 }));
  ws['!rows'] = [
    { hpt: 15 }, // Row 1 (blank)
    { hpt: 26 }, // Row 2 (Title)
    { hpt: 12 }, // Row 3 (blank)
    { hpt: 22 }, // Row 4 (Headers)
    ...rows.map(() => ({ hpt: 18 })), // Data rows
    { hpt: 20 }, // Total row
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  const now = new Date();
  const stamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  XLSX.writeFile(wb, `${fileName}_${stamp}.xlsx`);

  trackExportAudit({
    moduleName: title || sheetName || fileName || "Report",
    fileName,
    count: rows.length,
    format: "xlsx",
  });
}

export default exportReportToExcel;

