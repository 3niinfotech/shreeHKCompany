import { toast } from "sonner";
import XLSX from "xlsx-js-style";

export const exportCompanyExcel = (selectedRows) => {
    if (selectedRows.length === 0) {
        toast.warning("Please select at least one row.");
        return;
    }

    const ellipsisText = (text, maxLength = 40) => {
        const value = String(text ?? "");
        return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
    };

    const headers = [
        "Company",
        "Address",
        "Country",
        "Email",
        "Contact Number",
        "CContact person",
        "WebSite",
        "Bank Name",
    ];

    const mapBorder = () => ({
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } },
    });

    const makeCell = (value, isHeader, isOddRow = false) => ({
        v: value ?? "",
        t: "s",
        s: {
            font: {
                name: "Arial",
                sz: 10,
                bold: isHeader,
                color: { rgb: isHeader ? "FFFFFF" : "000000" },
            },
            fill: {
                patternType: "solid",
                fgColor: { rgb: isHeader ? "1D3557" : isOddRow ? "F0F4FF" : "FFFFFF" },
            },
            alignment: {
                horizontal: "center",
                vertical: "center",
                wrapText: isHeader,
            },
            border: mapBorder(),
        },
    });

    const ws = {};
    headers.forEach((header, c) => {
        ws[XLSX.utils.encode_cell({ r: 0, c })] = makeCell(header, true);
    });

    selectedRows.forEach((item, rowIdx) => {
        const isOddRow = rowIdx % 2 === 0;
        const values = [
            item.name ?? "",
            ellipsisText(item.address),
            item.country ?? "",
            item.email ?? "",
            item.contact_number ?? "",
            item.contact_person ?? "",
            item.website ?? "",
            item.bank_name ?? "",
        ];

        values.forEach((val, c) => {
            ws[XLSX.utils.encode_cell({ r: rowIdx + 1, c })] = makeCell(String(val), false, isOddRow);
        });
    });

    ws["!ref"] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: selectedRows.length, c: headers.length - 1 },
    });
    ws["!cols"] = [
        { wch: 24 }, { wch: 30 }, { wch: 14 }, { wch: 26 },
        { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
    ];
    ws["!rows"] = [{ hpt: 35 }];
    selectedRows.forEach((_, i) => {
        ws["!rows"][i + 1] = { hpt: 18 };
    });
    ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Company");

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    XLSX.writeFile(wb, `Company_${dd}${mm}${yyyy}.xlsx`);
};
