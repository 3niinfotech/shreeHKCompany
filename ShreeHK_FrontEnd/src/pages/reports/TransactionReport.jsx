import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
    Table, Button, Card, Typography, Checkbox, Form, Select, Input, DatePicker,
} from 'antd';
import { toastSuccess, toastError, toastWarning } from '../../utils/toastNotify';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import useFormHandleChange from '../../hooks/useFormHandleChange';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';
import ExportExcelButton from '../../components/common/ExportExcelButton';
import { exportReportToExcel } from '../../utils/reportExcelExport';
import styles from '../../assets/scss/pages/report/TransactionReport.module.scss';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';
import { SkuLink } from '../../hooks/useSkuModalAction';

const { Text } = Typography;
const SALE_STATUS_OPTIONS = [
    { value: 'report', label: 'Report' },
    { value: 'memo', label: 'Memo' },
    { value: 'lab', label: 'Lab' },
    { value: 'sale', label: 'Sale' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'open', label: 'Open Sale' },
    { value: 'close', label: 'Close Sale' },
];
const TYPE_OPTIONS = [
    { value: 'company', label: 'Company' },
    { value: 'sku', label: 'SKU' },
];

const PARTY_COLUMNS = [
    { title: 'No', dataIndex: 'no', key: 'no', width: 60, align: 'center' },
    { title: 'Invoice', dataIndex: 'invoice', key: 'invoice' },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
    { title: 'Company', dataIndex: 'company', key: 'company' },
    { title: 'Pcs', dataIndex: 'pcs', key: 'pcs', align: 'center' },
    { title: 'Carat', dataIndex: 'carat', key: 'carat', align: 'right' },
    { title: 'Price', dataIndex: 'price', key: 'price', align: 'right' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' },
    { title: 'Term', dataIndex: 'term', key: 'term', align: 'center' },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
    { title: 'Reference', dataIndex: 'reference', key: 'reference' },
];

const PACKET_COLUMNS = [
    { title: 'No', dataIndex: 'no', key: 'no', width: 40, align: 'center' },
    { title: 'Date', dataIndex: 'out_date', key: 'out_date', width: 100, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
    { title: 'Sku', dataIndex: 'sku', key: 'sku', width: 160, render: (text, record) => <SkuLink sku={text} record={record} /> },
    { title: 'Lab', dataIndex: 'lab', key: 'lab', width: 70, align: 'center' },
    { title: 'Report No.', dataIndex: 'report_no', key: 'report_no', width: 120 },
    { title: 'P.Pcs', dataIndex: 'polish_pcs', key: 'polish_pcs', width: 70, align: 'right' },
    { title: 'P.Carat', dataIndex: 'polish_carat', key: 'polish_carat', width: 80, align: 'right' },
    { title: 'Price', dataIndex: 'sell_price', key: 'sell_price', width: 90, align: 'right', render: (v, row) => v ?? row.purchase_price ?? '-' },
    { title: 'Amount', dataIndex: 'sell_amount', key: 'sell_amount', width: 100, align: 'right', render: (v, row) => v ?? row.purchase_amount ?? '-' },
    { title: 'Shape', dataIndex: 'shape', key: 'shape', width: 90 },
    { title: 'Color', dataIndex: 'color', key: 'color', width: 70, align: 'center' },
    { title: 'Clarity', dataIndex: 'clarity', key: 'clarity', width: 80, align: 'center' },
    { title: 'Company', dataIndex: 'party', key: 'party', width: 180 },
    { title: 'Remark', dataIndex: 'remark', key: 'remark', width: 160 },
];

const formatExcelDate = (value) => {
    if (!value) return '';
    const s = String(value).trim();
    const m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
    if (m) {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
        return `${dd} ${mm} ${yyyy}`;
    }
    const d = dayjs(s);
    return d.isValid() ? d.format('DD MM YYYY') : s;
};

const PARTY_EXCEL_HEADERS = [
    { title: 'NO', key: 'no', width: 6, align: 'center' },
    { title: 'Company', key: 'company', width: 42, align: 'left', accessor: (row) => String(row.company || '').toUpperCase() },
    { title: 'Invoice', key: 'invoice', width: 12, align: 'center' },
    { title: 'Date', key: 'date', width: 14, align: 'center', accessor: (row) => formatExcelDate(row.date) },
    { title: 'Term', key: 'term', width: 8, align: 'center' },
    { title: 'Due Date', key: 'dueDate', width: 14, align: 'center', accessor: (row) => formatExcelDate(row.dueDate) },
    { title: 'Pcs', key: 'pcs', width: 8, align: 'right', type: 'n', total: true, decimals: 0 },
    { title: 'Carat', key: 'carat', width: 10, align: 'right', type: 'n', total: true, decimals: 3 },
    { title: 'Price', key: 'price', width: 10, align: 'right', type: 'n', total: true, decimals: 2 },
    { title: 'Amount', key: 'amount', width: 14, align: 'right', type: 'n', total: true, decimals: 2 },
    { title: 'Reference', key: 'reference', width: 32, align: 'left' },
    { title: 'Paid Amt.', key: 'paid_amount', width: 12, align: 'right', type: 'n', total: true, decimals: 2, accessor: (row) => Number(row.paid_amount ?? 0) },
    { title: 'Due Amt.', key: 'due_amount', width: 14, align: 'right', type: 'n', total: true, decimals: 2, accessor: (row) => Number(row.due_amount ?? ((Number(row.amount) || 0) - (Number(row.paid_amount) || 0))) },
];

const PACKET_EXCEL_HEADERS = [
    { title: 'NO', key: 'no', width: 6, align: 'center' },
    { title: 'Date', key: 'out_date', width: 14, align: 'center', accessor: (row) => formatExcelDate(row.out_date) },
    { title: 'Sku', key: 'sku', width: 18, align: 'left' },
    { title: 'Lab', key: 'lab', width: 8, align: 'center' },
    { title: 'Report No.', key: 'report_no', width: 14, align: 'left' },
    { title: 'P.Pcs', key: 'polish_pcs', width: 10, align: 'right', type: 'n', total: true, decimals: 0 },
    { title: 'P.Carat', key: 'polish_carat', width: 10, align: 'right', type: 'n', total: true, decimals: 3 },
    { title: 'Price', key: 'sell_price', width: 12, align: 'right', type: 'n', total: true, decimals: 2, accessor: (row) => row.sell_price ?? row.purchase_price ?? '' },
    { title: 'Amount', key: 'sell_amount', width: 14, align: 'right', type: 'n', total: true, decimals: 2, accessor: (row) => row.sell_amount ?? row.purchase_amount ?? '' },
    { title: 'Shape', key: 'shape', width: 12, align: 'left' },
    { title: 'Color', key: 'color', width: 10, align: 'center' },
    { title: 'Clarity', key: 'clarity', width: 10, align: 'center' },
    { title: 'Company', key: 'party', width: 22, align: 'left', accessor: (row) => String(row.party || '').toUpperCase() },
    { title: 'Remark', key: 'remark', width: 18, align: 'left' },
];

const TransactionReport = () => {
    const { form } = useFormHandleChange();
    const [tableData, setTableData] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [viewType, setViewType] = useState('party');

    const { data: companyData, isLoading: isCompanyLoading } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { mutate: fetchTransaction, isPending: tableLoading } = usePostApiRequest(ENDPOINTS.report.transaction, 'transactionReport', { showToast: false });

    const companyOptions = useMemo(() => {
        const actualData = Array.isArray(companyData)
            ? companyData?.Data
            : (companyData?.Data || []);

        if (actualData.length === 0) {
            return [{ value: 'all', label: 'All Companies' }];
        }

        const apiOptions = actualData.map(item => ({
            value: String(item.id),
            label: item.name ? item.name.trim() : `Unknown (${item.id})`
        }));

        return [{ value: 'all', label: 'All Companies' }, ...apiOptions];
    }, [companyData]);

    const {
        loading: aiReportLoading,
        result: aiReportResult,
        error: aiReportError,
        panelOpen: aiPanelOpen,
        setPanelOpen: setAiPanelOpen,
    } = useAiSalesReport();

    const handleSearch = () => {
        const v = form.getFieldsValue();
        const company = v.company && v.company !== 'all' ? v.company : '0';
        const type = v.type === 'sku' ? 'packet' : 'party';

        fetchTransaction({
            type,
            saleStatus: v.saleStatus || 'report',
            party: company,
            company,
            invoice: (v.invoiceNo || '').trim(),
            cfrom: v.fromDate ? dayjs(v.fromDate).format('YYYY-MM-DD') : '',
            cto: v.toDate ? dayjs(v.toDate).format('YYYY-MM-DD') : '',
            gia: v.gia || false,
            nonGia: v.nonGia || false,
            limit: 500,
        }, {
            onSuccess: (res) => {
                setViewType(type);
                setTableData((res?.Data || []).map((row, i) => ({ ...row, key: row.key ?? i + 1 })));
            },
        });
    };

    useEffect(() => {
        handleSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isPacket = viewType === 'packet';
    const columns = isPacket ? PACKET_COLUMNS : PARTY_COLUMNS;
    const exportHeaders = isPacket ? PACKET_EXCEL_HEADERS : PARTY_EXCEL_HEADERS;

    const handleExport = async () => {
        if (!tableData.length) {
            toastWarning('Run search first — no data to export.');
            return;
        }
        setExporting(true);
        try {
            await exportReportToExcel({
                headers: exportHeaders,
                rows: tableData,
                fileName: isPacket ? 'sku_report' : 'company_report',
                sheetName: isPacket ? 'SKU Report' : 'Company Report',
                title: isPacket ? 'SKU Report' : 'Company Report',
                totals: true,
            });
            toastSuccess('Exported to Excel');
        } catch (err) {
            toastError(err.message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(tableRef, [tableData.length, tableLoading]);

    return (
        <div className={styles.pageContainer}>
            {/* <PageHeroHeader
                breadcrumb="REPORTS"
                title="Transaction Report"
                icon={<BarChartOutlined />}
                actions={(
                    <>
                        <Button
                            icon={<Sparkles size={16} />}
                            onClick={() => runSalesReport(tableData)}
                            loading={aiReportLoading}
                            disabled={!tableData.length}
                        >
                            Generate AI Report
                        </Button>
                        <Button type="primary" icon={<FileUp />} className={styles.exportBtn} loading={exporting} onClick={handleExport} disabled={!tableData.length}>
                            Export to Excel
                        </Button>
                    </>
                )}
            /> */}

            <AdvancedFilterPanel
                // title="Filter Transaction Report"
                title="Transaction Report"
                // subtitle="Refine by sale status, company, location, invoice, and dates."
                showClear={false}
                onSearch={handleSearch}
                searchLoading={tableLoading}
                extraActions={
                    <>
                        {/* <Button
                            icon={<Sparkles size={16} />}
                            onClick={() => runSalesReport(tableData)}
                            loading={aiReportLoading}
                            disabled={!tableData.length}
                        >
                            Generate AI Report
                        </Button> */}
                        <Button type="default" icon={<ReloadOutlined />} className={filterPanelStyles.btnClear} onClick={handleSearch} loading={tableLoading}>
                            Reload
                        </Button>
                        <ExportExcelButton
                            loading={exporting}
                            onClick={handleExport}
                            disabled={!tableData.length}
                        />
                    </>
                }
            >
                <div className={`${filterPanelStyles.filterInlineRow} ${styles.transactionFilterForm}`}>
                    <Form
                        form={form}
                        initialValues={{ saleStatus: 'report', type: 'company', company: 'all', location: 'all', gia: false, nonGia: false }}
                    >
                        <div className={styles.filterFieldsFlex}>
                            <Form.Item name="saleStatus" className={styles.filterItem}>
                                <Select
                                    allowClear
                                    placeholder="Sale Status"
                                    options={SALE_STATUS_OPTIONS}
                                    className={styles.fieldMd}
                                />
                            </Form.Item>

                            <Form.Item name="type" className={styles.filterItem}>
                                <Select
                                    placeholder="Type"
                                    options={TYPE_OPTIONS}
                                    className={styles.fieldMd}
                                />
                            </Form.Item>

                            {/* <Form.Item name="company" className={styles.filterItem}>
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder="All Companies"
                                    options={companyOptions}
                                    loading={isCompanyLoading}
                                    optionFilterProp="label"
                                    virtual
                                    className={styles.fieldLg}
                                />
                            </Form.Item> */}

                            <Form.Item name="location" className={styles.filterItem}>
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder="Location"
                                    options={companyOptions}
                                    loading={isCompanyLoading}
                                    optionFilterProp="label"
                                    className={styles.fieldLg}
                                />
                            </Form.Item>

                            <div className={styles.giaChecks}>
                                <Form.Item name="gia" valuePropName="checked" noStyle>
                                    <Checkbox>GIA</Checkbox>
                                </Form.Item>
                                <Form.Item name="nonGia" valuePropName="checked" noStyle>
                                    <Checkbox>N-GIA</Checkbox>
                                </Form.Item>
                            </div>

                            <Form.Item name="invoiceNo" className={styles.filterItem}>
                                <Input
                                    allowClear
                                    placeholder="Invoice No..."
                                    prefix={<SearchOutlined />}
                                    className={styles.fieldLg}
                                    onPressEnter={handleSearch}
                                />
                            </Form.Item>

                            <Form.Item name="fromDate" className={styles.filterItem}>
                                <DatePicker placeholder="From Date" className={styles.fieldDate} />
                            </Form.Item>

                            <Form.Item name="toDate" className={styles.filterItem}>
                                <DatePicker placeholder="To Date" className={styles.fieldDate} />
                            </Form.Item>
                        </div>
                    </Form>
                </div>
            </AdvancedFilterPanel>

            <AIResultPanel
                title="AI Sales Report"
                loading={aiReportLoading}
                result={aiReportResult}
                error={aiReportError}
                open={aiPanelOpen}
                onOpenChange={setAiPanelOpen}
            />

            <Card className={styles.tableCard}>
                <div ref={tableRef} className="erp-table-container">
                    <SkeletonAwareTable
                        columns={columns}
                        dataSource={tableData}
                        loading={tableLoading}
                        pagination={{ pageSize: 50 }}
                        bordered
                        size="small"
                        className={styles.customTable}
                        scroll={{ x: "max-content", y: tableHeight }}
                        summary={(pageData) => {
                            let totalPcs = 0;
                            let totalCarat = 0;
                            let totalAmount = 0;
                            pageData.forEach((row) => {
                                if (isPacket) {
                                    totalPcs += Number(row.polish_pcs) || 0;
                                    totalCarat += Number(row.polish_carat) || 0;
                                    totalAmount += Number(row.sell_amount ?? row.purchase_amount) || 0;
                                } else {
                                    totalPcs += Number(row.pcs) || 0;
                                    totalAmount += Number(row.amount) || 0;
                                }
                            });
                            if (isPacket) {
                                return (
                                    <Table.Summary fixed>
                                        <Table.Summary.Row className={styles.summaryRow}>
                                            <Table.Summary.Cell index={0} colSpan={5}>
                                                <Text strong>Total</Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={1} align="right">
                                                <Text strong>{totalPcs}</Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={2} align="right">
                                                <Text strong>{totalCarat.toFixed(2)}</Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={3} />
                                            <Table.Summary.Cell index={4} align="right">
                                                <Text strong>{totalAmount.toFixed(2)}</Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={5} colSpan={5} />
                                        </Table.Summary.Row>
                                    </Table.Summary>
                                );
                            }
                            return (
                                <Table.Summary fixed>
                                    <Table.Summary.Row className={styles.summaryRow}>
                                        <Table.Summary.Cell index={0} colSpan={4}>
                                            <Text strong>Total</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="center">
                                            <Text strong>{totalPcs}</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={2} colSpan={3} />
                                        <Table.Summary.Cell index={3} align="right">
                                            <Text strong>{totalAmount.toFixed(2)}</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={4} colSpan={2} />
                                    </Table.Summary.Row>
                                </Table.Summary>
                            );
                        }}
                    />
                </div>
            </Card>
        </div>
    );
};

export default TransactionReport;
