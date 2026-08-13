import React, { useEffect } from "react";
import { Button, Card, Col, Divider, Row, Space, Tag, Typography } from "antd";
import { Download, FileSpreadsheet } from "lucide-react";
import { loadXlsx } from "../../utils/loadXlsx";
import useThemeColors from "../../hooks/useThemeColors";
import { cssVar } from "../../theme";

const { Title, Text } = Typography;

const HEADER_BG = "1D3557";
const HEADER_FG = "FFFFFF";
const BORDER_CLR = "CCCCCC";

const HEADERS = [
  "Mfg.Code",
  "D.No.",
  "Sku",
  // "R.Pcs",
  "P.Pcs",
  "P.Carat",
  "Cost",
  "Price",
  "Amount",
  "Main Color",
  "LOC",
  "Lab",
  "Report No",
  "Shape",
  "Clarity",
  "Intensity",
  "Overtone",
  "Color",
  "Size",
  "Polish",
  "Symm",
  "Cut",
  "Flo. Intenser",
  "Measurements",
  "Table%",
  "Depth%",
  "Girdle",
  "BGM",
  "Eyeclean",
  "Remark",
  "Group Type",
];

const makeBorder = () => ({
  top: { style: "thin", color: { rgb: BORDER_CLR } },
  bottom: { style: "thin", color: { rgb: BORDER_CLR } },
  left: { style: "thin", color: { rgb: BORDER_CLR } },
  right: { style: "thin", color: { rgb: BORDER_CLR } },
});

const buildHeaderCell = (value) => ({
  v: value,
  t: "s",
  s: {
    font: { name: "Arial", sz: 10, bold: true, color: { rgb: HEADER_FG } },
    fill: { patternType: "solid", fgColor: { rgb: HEADER_BG } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: makeBorder(),
  },
});

const downloadImportFormatExcel = async () => {
  const XLSX = await loadXlsx();
  const ws = {};

  HEADERS.forEach((header, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = buildHeaderCell(header);
  });

  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: 0, c: HEADERS.length - 1 },
  });
  ws["!cols"] = HEADERS.map(() => ({ wch: 14 }));
  ws["!rows"] = [{ hpt: 24 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Import Format");
  XLSX.writeFile(wb, "Import_Format.xlsx");
};

const ImportFormat = () => {
  const theme = useThemeColors();
  useEffect(() => {
    const navEntry = performance.getEntriesByType("navigation")[0];
    if (navEntry?.type === "reload") {
      return;
    }

    const guardKey = "import_format_last_download_at";
    const now = Date.now();
    const lastDownloadAt = Number(sessionStorage.getItem(guardKey) || 0);

    // Prevent duplicate auto-download caused by React StrictMode double mount in dev.
    if (now - lastDownloadAt > 1500) {
      downloadImportFormatExcel();
      sessionStorage.setItem(guardKey, String(now));
    }
  }, []);

  return (
    <div className="page-shell" style={{ padding: 20, background: cssVar("color-bg-page") }}>
      <Row justify="center">
        <Col xs={24} sm={22} md={18} lg={14} xl={12}>
          <Card
            style={{
              borderRadius: 10,
              border: `1px solid ${cssVar("color-border")}`,
              boxShadow: cssVar("shadow-card"),
            }}
            styles={{ body: { padding: 24 } }}
          >
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Space size={10}>
                <FileSpreadsheet size={22} color={theme.textHeading} />
                <Title level={4} style={{ margin: 0, color: cssVar("color-text-heading") }}>
                  Import Format
                </Title>
                <Tag color="blue">Excel Template</Tag>
              </Space>

              <Text style={{ color: cssVar("color-text-muted") }}>
                Header-based import file download is ready. Click below to download the latest format.
              </Text>

              <Divider style={{ margin: "10px 0" }} />

              <Space size={12}>
                <Button type="primary" icon={<Download size={15} />} onClick={downloadImportFormatExcel}>
                  Download Format
                </Button>
                <Text type="secondary">File name: Import_Format.xlsx</Text>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ImportFormat;
