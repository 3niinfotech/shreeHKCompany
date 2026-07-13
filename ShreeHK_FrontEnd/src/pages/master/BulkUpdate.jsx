import React, { useState } from 'react';
import {
    Button,
    Card,
    Col,
    Form,
    Row,
    Space,
    Typography,
    Upload,
    Tooltip
} from 'antd';
import { FileSpreadsheet, Upload as UploadIcon, Download } from 'lucide-react';
import XLSX from "xlsx-js-style";
import DynamicFormField from '../../hooks/DynamicFormField';
import styles from '../../assets/scss/pages/master/bulkupdate.module.scss';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { ENDPOINTS } from '../../constants/endpoints';
import { toastApiSuccess, toastApiError } from '../../utils/apiToast';

const { Text } = Typography;
const HEADER_BG = "1D3557";
const HEADER_FG = "FFFFFF";
const BORDER_CLR = "CCCCCC";

const updateTypeOptions = [
    { value: "price", label: "Price" },
    { value: "location", label: "Location" },
    { value: "intensity", label: "Intensity" },
    { value: "package", label: "Package" },
    { value: "sku", label: "SKU Change" },
    { value: "shape", label: "Shape / Clarity" },
    { value: "gia", label: "GIA Report" },
    { value: "rap_price", label: "Rap Price" },
    { value: "group", label: "Group / Sub Group" },
    { value: "sku-pair", label: "SKU Pair" },
    { value: "bgm-eyeclean", label: "BGM / Eye Clean" },
    { value: "category", label: "Category" },
    { value: "remark", label: "Remark" },
    { value: "argyle", label: "Argyle / In House" },
    { value: "mining", label: "Mining / Origin / Manuf" },
    { value: "csv-gia", label: "CSV GIA Import" },
];

const sampleFormats = [
    'Price', 'Location', 'Intensity', 'Package', 'Sku',
    'Shape,Clarity', 'GIA Report', 'Rap Price', 'Group',
    'SKU Pair', 'BGM-Eyeclean', 'Category', 'Remark',
    'Argyle - In House Clarity', 'Mining - Origin - Manuf'
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

const buildBodyCell = (value) => ({
    v: value,
    t: "s",
    s: {
        font: { name: "Arial", sz: 10, color: { rgb: "000000" } },
        alignment: { horizontal: "left", vertical: "center", wrapText: true },
        border: makeBorder(),
    },
});

const fileToBase64 = (fileEntry) =>
    new Promise((resolve, reject) => {
        const file = fileEntry?.originFileObj || fileEntry;
        if (!(file instanceof Blob)) {
            reject(new Error("Please select a valid file."));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || "");
            const base64 = result.includes(",") ? result.split(",")[1] : result;
            resolve(base64 || "");
        };
        reader.onerror = () => reject(new Error("Unable to read selected file."));
        reader.readAsDataURL(file);
    });


const BulkUpdate = () => {
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);
    const queryClient = useQueryClient();
    const { mutate: saveCompany, isPending } = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post(ENDPOINTS.bulk.update, payload);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['bulkupdate'] });
            if (Number(data?.error) === 0) {
                toastApiSuccess(data);
                setFileList([]);
            } else {
                toastApiError({ response: { data } });
            }
        },
        onError: (error) => {
            toastApiError(error);
        },
    });

    const templateMap = {
        Price: {
            headers: ["Sku", "Price", "Cost"],
            row: ["H24-58A", "4000", "5000"],
        },
        Location: {
            headers: ["Sku", "Location"],
            row: ["H24-58A", "Ind"],
        },
        Intensity: {
            headers: ["Sku", "Intensity", "Overtone", "Color"],
            row: ["H24-58A", "FAINT", "Brown", "S-T"],
        },
        Package: {
            headers: ["Sku", "Package"],
            row: ["H24-58A", "Lot"],
        },
        "Shape,Clarity": {
            headers: ["Sku", "Shape", "Clarity"],
            row: ["H24-58A", "ROUND", "VS2"],
        },
        "GIA Report": {
            headers: ["Sku", "Cert No"],
            row: ["H24-58A", "485898948563"],
        },
        "Rap Price": {
            headers: ["Sku", "Rap Price"],
            row: ["H24-58A", "4500"],
        },
        Group: {
            headers: ["Sku", "Main Group", "Sub Group"],
            row: ["H24-58A", "", ""],
        },
        "SKU Pair": {
            headers: ["Sku", "Pair SKU"],
            row: ["H24-58A", "H28-88G"],
        },
        "BGM-Eyeclean": {
            headers: ["Sku", "BGM", "Eye Clean"],
            row: ["H24-58A", "NO BGM", "19%"],
        },
        Category: {
            headers: ["Sku", "CategoryId"],
            row: ["H24-58A", "119"],
        },
        Remark: {
            headers: ["Sku", "Remark"],
            row: ["H24-58A", "Test 3ni"],
        },
        "Argyle - In House Clarity": {
            headers: ["Sku", "Argyle Color", "In House", "Clarity"],
            row: ["H24-58A", "White", "YES", "VS-2II"],
        },
        "Mining - Origin - Manuf": {
            headers: ["Sku", "Mining Origin", "Menufecturing Origin"],
            row: ["H24-58A", "IND", "IND"],
        },
    };

    const handleDownloadTemplate = (item) => {
        const template = templateMap[item];
        if (!template) return;

        const ws = {};
        template.headers.forEach((header, c) => {
            ws[XLSX.utils.encode_cell({ r: 0, c })] = buildHeaderCell(header);
        });
        template.row.forEach((value, c) => {
            ws[XLSX.utils.encode_cell({ r: 1, c })] = buildBodyCell(value);
        });

        ws["!ref"] = XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: 1, c: template.headers.length - 1 },
        });
        ws["!cols"] = template.headers.map(() => ({ wch: 16 }));
        ws["!rows"] = [{ hpt: 24 }, { hpt: 22 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        const fileName = `${item.replace(/[^a-zA-Z0-9]+/g, "_")}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const handleBulkUpdate = async () => {
        const values = form.getFieldsValue();
        const updateType = values?.updateType;
        const selectedFileEntry = fileList?.[0];
        const selectedFile = selectedFileEntry?.originFileObj || selectedFileEntry;

        if (!updateType || !selectedFile) return;

        try {
            const fileContent = await fileToBase64(selectedFileEntry);
            if (!fileContent || String(fileContent).trim() === "") return;

            const payload = {
                fn: "save",
                import: "import",
                type: updateType,
                fileName: selectedFile?.name || selectedFileEntry?.name || "import.xlsx",
                fileContent,
            };

            saveCompany(payload);
        } catch (error) {
            toastApiError(error);
        }
    };

    return (
        <div className={`page-shell ${styles.wrapper}`}>
            {/* Control Bar */}
            <Row gutter={[20, 20]} align="middle" className={styles.topRow}>
                <Col xs={24} md={9}>
                    <Form
                        form={form}
                        initialValues={{ updateType: undefined }}
                        className={styles.updateTypeForm}
                    >
                        <DynamicFormField
                            forceFullWidth
                            fields={[
                                {
                                    name: 'updateType',
                                    label: 'Update Type',
                                    type: 'select',
                                    width: '100%',
                                    options: updateTypeOptions
                                }
                            ]}
                        />
                    </Form>
                </Col>

                <Col xs={24} md={9}>
                    <div className={styles.uploadWrap}>
                        <Upload
                            fileList={fileList}
                            beforeUpload={() => false}
                            onChange={({ fileList: nextFileList }) => setFileList(nextFileList.slice(-1))}
                            onRemove={() => setFileList([])}
                            accept=".xls,.xlsx"
                            maxCount={1}
                        >
                            <Button icon={<UploadIcon size={16} />} className={styles.chooseButton}>
                                {fileList.length > 0 ? fileList[0].name : "Choose Excel File"}
                            </Button>
                        </Upload>
                    </div>
                </Col>

                <Col xs={24} md={6} className={styles.rightAlign}>
                    <Button type="primary" icon={<UploadIcon size={16} />} className={styles.updateBtn} onClick={handleBulkUpdate} loading={isPending}>
                        Update Data
                    </Button>
                </Col>
            </Row>

            <Text className={styles.sectionTitle}>Download Sample Format for Updating</Text>

            {/* Grid with Taller Cards & Download Buttons */}
            <div className={styles.cardGrid}>
                {sampleFormats.map((item) => (
                    <Card key={item} className={styles.sampleCard}>
                        <div className={styles.cardContent}>
                            <Space align="center" size={0}>
                                <FileSpreadsheet className={styles.excelIcon} size={36} strokeWidth={1.5} />
                                <Text className={styles.sampleText}>{item}</Text>
                            </Space>

                            <Tooltip title="Download">
                                <Button
                                    type="text"
                                    shape="circle"
                                    icon={<Download size={18} className={styles.downloadIcon} />}
                                    onClick={() => handleDownloadTemplate(item)}
                                />
                            </Tooltip>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default BulkUpdate;