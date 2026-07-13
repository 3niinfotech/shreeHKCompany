const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");

function formatRowForExport(row) {
  return {
    Date: row.createdAt || row.created_at || "",
    User: row.userName || row.user_name || "",
    Role: row.userRole || row.user_role || "",
    Action: row.actionType || row.action_type || "",
    Module: row.moduleName || row.module_name || "",
    Reference: row.recordReference || row.record_reference || "",
    Description: row.description || "",
    Status: row.status || "SUCCESS",
  };
}

function buildExcelBuffer(rows) {
  const data = rows.map(formatRowForExport);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Activity Log");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function buildPdfBuffer(rows) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text("ShreeHK Activity History", { underline: true });
    doc.moveDown();
    doc.fontSize(9);

    rows.forEach((row, i) => {
      const f = formatRowForExport(row);
      doc.text(
        `${i + 1}. ${f.Date} | ${f.User} (${f.Role}) | ${f.Action} | ${f.Module} | ${f.Reference}`,
      );
      doc.text(`   ${f.Description}`, { indent: 12 });
      doc.moveDown(0.3);
      if (doc.y > 750) doc.addPage();
    });

    doc.end();
  });
}

module.exports = {
  buildExcelBuffer,
  buildPdfBuffer,
  formatRowForExport,
};
