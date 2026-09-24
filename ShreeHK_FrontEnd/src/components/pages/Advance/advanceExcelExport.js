import { toastSuccess, toastWarning, toastError } from "../../../utils/toastNotify.js";
import { loadXlsx } from "../../../utils/loadXlsx.js";
import { trackExportAudit } from "../../../utils/auditExportTracker.js";
import dayjs from "dayjs";

/**
 * Export Advance Payment records to Excel matching exact template format
 * @param {Array} records Array of advance records
 * @param {Function} resolvePartyName Optional function to resolve party ID to party name
 */
export async function exportAdvanceExcel(records = [], resolvePartyName) {
  if (!records || records.length === 0) {
    toastWarning("No advance payment records to export");
    return;
  }

  try {
    const XLSX = await loadXlsx();

    const headers = [
      "Date",
      "Use Date",
      "Invoice",
      "Party",
      "Book",
      "Type",
      "Amount",
      "Use Amount",
      "Balance",
    ];

    const BORDER_HEADER = {
      top: { style: "thin", color: { rgb: "7F7F7F" } },
      bottom: { style: "thin", color: { rgb: "7F7F7F" } },
      left: { style: "thin", color: { rgb: "7F7F7F" } },
      right: { style: "thin", color: { rgb: "7F7F7F" } },
    };

    const BORDER_DATA = {
      top: { style: "thin", color: { rgb: "D9D9D9" } },
      bottom: { style: "thin", color: { rgb: "D9D9D9" } },
      left: { style: "thin", color: { rgb: "D9D9D9" } },
      right: { style: "thin", color: { rgb: "D9D9D9" } },
    };

    const ws = {};

    // Row 2: Title "Advance Payment Report" (0-indexed row 1, cols 0..8)
    const titleCell = {
      v: "Advance Payment Report",
      t: "s",
      s: {
        font: {
          name: "Calibri",
          sz: 16,
          bold: true,
          color: { rgb: "5DADE2" }, // Soft light blue / cyan
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
        },
      },
    };

    ws[XLSX.utils.encode_cell({ r: 1, c: 0 })] = titleCell;
    for (let c = 1; c < headers.length; c++) {
      ws[XLSX.utils.encode_cell({ r: 1, c })] = {
        v: "",
        t: "s",
        s: {
          alignment: { horizontal: "center", vertical: "center" },
        },
      };
    }

    // Row 4: Headers (0-indexed row 3)
    headers.forEach((header, c) => {
      ws[XLSX.utils.encode_cell({ r: 3, c })] = {
        v: header,
        t: "s",
        s: {
          font: {
            name: "Calibri",
            sz: 11,
            bold: true,
            color: { rgb: "002060" }, // Dark Navy / Indigo
          },
          fill: {
            patternType: "solid",
            fgColor: { rgb: "E8A2C8" }, // Soft Pink / Rose
          },
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },
          border: BORDER_HEADER,
        },
      };
    });

    // Row 5+: Data rows (0-indexed row 4+)
    records.forEach((item, index) => {
      const r = index + 4;

      const dateStr = item.date && dayjs(item.date).isValid()
        ? dayjs(item.date).format("DD-MM-YYYY")
        : (item.date ? String(item.date).split("T")[0] : "");

      const useDateStr = item.assign_date && dayjs(item.assign_date).isValid()
        ? dayjs(item.assign_date).format("DD-MM-YYYY")
        : (item.assign_date ? String(item.assign_date).split("T")[0] : "");

      const invoiceStr = item.invoice || item.invoice_id || "";
      const partyStr = item.party_name || (resolvePartyName ? resolvePartyName(item.party) : item.party) || "";
      const bookStr = item.book || item.booktype || "";
      const typeStr = item.type ? String(item.type).toUpperCase() : "";

      const rawAmount = item.amount != null && item.amount !== "" ? Number(item.amount) : null;
      const rawUseAmount = item.use_amount != null && item.use_amount !== "" && Number(item.use_amount) !== 0 ? Number(item.use_amount) : null;
      const rawBalance = item.balance_amount != null && item.balance_amount !== ""
        ? Number(item.balance_amount)
        : (rawAmount != null ? (rawAmount - (rawUseAmount || 0)) : null);

      const rowValues = [
        { v: dateStr, t: "s", align: "left" },
        { v: useDateStr, t: "s", align: "left" },
        { v: invoiceStr, t: "s", align: "left" },
        { v: partyStr, t: "s", align: "left" },
        { v: bookStr, t: "s", align: "left" },
        { v: typeStr, t: "s", align: "left" },
        { v: rawAmount != null ? rawAmount : "", t: rawAmount != null ? "n" : "s", align: "right" },
        { v: rawUseAmount != null ? rawUseAmount : "", t: rawUseAmount != null ? "n" : "s", align: "right" },
        { v: rawBalance != null ? rawBalance : 0, t: "n", align: "right" },
      ];

      rowValues.forEach((cellData, c) => {
        ws[XLSX.utils.encode_cell({ r, c })] = {
          v: cellData.v,
          t: cellData.t,
          s: {
            font: {
              name: "Calibri",
              sz: 11,
              color: { rgb: "000000" },
            },
            alignment: {
              horizontal: cellData.align,
              vertical: "center",
            },
            border: BORDER_DATA,
          },
        };
      });
    });

    const totalRows = records.length + 4;
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: totalRows, c: headers.length - 1 },
    });

    // Merge A2:I2 for Title
    ws["!merges"] = [
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
    ];

    // Column widths
    ws["!cols"] = [
      { wch: 14 }, // Date
      { wch: 14 }, // Use Date
      { wch: 14 }, // Invoice
      { wch: 34 }, // Party
      { wch: 28 }, // Book
      { wch: 12 }, // Type
      { wch: 16 }, // Amount
      { wch: 16 }, // Use Amount
      { wch: 16 }, // Balance
    ];

    // Row heights
    ws["!rows"] = [
      { hpt: 15 }, // Row 1 (empty)
      { hpt: 32 }, // Row 2 (Title)
      { hpt: 15 }, // Row 3 (empty)
      { hpt: 24 }, // Row 4 (Headers)
    ];

    records.forEach((_, i) => {
      ws["!rows"][i + 4] = { hpt: 20 };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Advance Payment");

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const fileName = `Advance_Payment_Report_${dd}${mm}${yyyy}`;

    XLSX.writeFile(wb, `${fileName}.xlsx`);

    toastSuccess(`Exported ${records.length} advance payment records to Excel`);

    trackExportAudit({
      moduleName: "Advance Payment Report",
      fileName,
      count: records.length,
      format: "xlsx",
    });
  } catch (err) {
    console.error("Advance Excel Export Error:", err);
    toastError("Failed to export Advance Payment Excel");
  }
}
