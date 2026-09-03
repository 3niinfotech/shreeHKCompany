import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Table, Card, Form, Select, Input, DatePicker, Button } from 'antd';
import { toastSuccess, toastError, toastWarning } from '../../utils/toastNotify';
import dayjs from 'dayjs';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import { ReloadOutlined } from '@ant-design/icons';
import ExportExcelButton from '../../components/common/ExportExcelButton';
import { exportReportToExcel } from '../../utils/reportExcelExport';
import styles from '../../assets/scss/pages/report/groupReport.module.scss';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';
import { SkuLink } from '../../hooks/useSkuModalAction';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';

const TYPE_OPTIONS = [
    { value: 'sale', label: 'Sale' },
    { value: 'purchase', label: 'Purchase' },
];

const detailOfGoods = (row) => [row.shape, row.color, row.clarity].filter(Boolean).join(' ');

const SALE_EXCEL_HEADERS = [
    { title: 'No', key: 'no', width: 6, align: 'center' },
    { title: 'SKU', key: 'sku', width: 14, align: 'center' },
    { title: 'Date', key: 'out_date', width: 14, align: 'center' },
    { title: 'GIA/NOGIA', key: 'lab', width: 12, align: 'center' },
    { title: 'Invoice No', key: 'invoiceno', width: 14, align: 'center' },
    { title: 'Detail Of Goods', key: 'detail_of_goods', width: 22, align: 'center', accessor: detailOfGoods },
    { title: 'Pcs', key: 'polish_pcs', width: 8, align: 'center', type: 'n', total: true, decimals: 0 },
    { title: 'Cts', key: 'polish_carat', width: 10, align: 'center', type: 'n', total: true, decimals: 3 },
    { title: 'Price', key: 'sell_price', width: 12, align: 'center', type: 'n', total: true, decimals: 2 },
    { title: 'Amount', key: 'sell_amount', width: 14, align: 'center', type: 'n', total: true, decimals: 2 },
    { title: 'Term', key: 'terms', width: 12, align: 'center' },
    { title: 'Due Date', key: 'due_date', width: 14, align: 'center' },
    { title: 'Party', key: 'party', width: 36, align: 'center', accessor: (row) => String(row.party || '').toUpperCase() },
    { title: 'Rec Amt', key: 'paid_amount', width: 12, align: 'center', type: 'n', total: true, decimals: 2, accessor: (row) => Number(row.paid_amount ?? 0) },
    { title: 'Rec Date', key: 'received_date', width: 14, align: 'center', accessor: (row) => row.received_date || '' },
    { title: 'Rec Book', key: 'received_book', width: 14, align: 'center', accessor: (row) => row.received_book || '' },
    { title: 'Remarks', key: 'remark', width: 16, align: 'center', accessor: (row) => row.remark || '' },
];

const SaleStoneReport = () => {
    const [form] = Form.useForm();
    const [tableData, setTableData] = useState([]);
    const [exporting, setExporting] = useState(false);
    const { data: companyData } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { mutate: fetchReport, isPending: tableLoading } = usePostApiRequest(ENDPOINTS.report.saleStock, 'saleStoneReport', { showToast: false });

    const companyOptions = useMemo(() => {
        const list = companyData?.Data || [];
        return [{ value: '', label: 'All Company' }, ...list.map((c) => ({ value: String(c.id), label: c.name }))];
    }, [companyData]);

    const party = Form.useWatch('party', form);
    const invoiceNo = Form.useWatch('invoiceNo', form);
    const fromDate = Form.useWatch('fromDate', form);
    const toDate = Form.useWatch('toDate', form);
    const activeCount = [party, invoiceNo, fromDate, toDate].filter(Boolean).length;

    const handleSearch = () => {
        const v = form.getFieldsValue();
        fetchReport({
            type: v.type || 'sale',
            party: v.party || '',
            invoice: (v.invoiceNo || '').trim(),
            cfrom: v.fromDate ? dayjs(v.fromDate).format('YYYY-MM-DD') : '',
            cto: v.toDate ? dayjs(v.toDate).format('YYYY-MM-DD') : '',
            limit: 200,
        }, {
            onSuccess: (res) => setTableData((res?.Data || []).map((r, i) => ({ ...r, key: i, no: i + 1 }))),
        });
    };

    useEffect(() => {
        handleSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const columns = [
        { title: 'No', dataIndex: 'no', width: 60, align: 'center' },
        { title: 'SKU', dataIndex: 'sku', width: 100, render: (text, record) => <SkuLink sku={text} record={record} /> },
        { title: 'Lab', dataIndex: 'lab', width: 80 },
        { title: 'Report No', dataIndex: 'report_no', width: 110 },
        { title: 'Pcs', dataIndex: 'polish_pcs', width: 70, align: 'center' },
        { title: 'Carat', dataIndex: 'polish_carat', width: 90, align: 'right' },
        { title: 'Price', dataIndex: 'sell_price', width: 90, align: 'right' },
        { title: 'Amount', dataIndex: 'sell_amount', width: 100, align: 'right' },
        { title: 'Shape', dataIndex: 'shape', width: 90 },
        { title: 'Color', dataIndex: 'color', width: 80 },
        { title: 'Clarity', dataIndex: 'clarity', width: 90 },
        { title: 'Party', dataIndex: 'party', width: 140 },
        { title: 'Date', dataIndex: 'out_date', width: 100, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
        { title: 'Invoice', dataIndex: 'invoiceno', width: 110 },
        { title: 'Terms', dataIndex: 'terms', width: 70 },
        { title: 'Due Date', dataIndex: 'due_date', width: 100, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
        { title: 'Paid', dataIndex: 'paid_amount', width: 90, align: 'right' },
    ];

    const handleClear = () => {
        form.resetFields();
        setTableData([]);
    };

    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(tableRef, [tableData.length, tableLoading]);

    const handleExport = async () => {
        if (!tableData.length) {
            toastWarning('Run search first — no data to export.');
            return;
        }
        setExporting(true);
        try {
            const isPurchase = form.getFieldValue('type') === 'purchase';
            const title = isPurchase ? 'Purchase Stone Report' : 'Sale Stone Report';
            await exportReportToExcel({
                headers: SALE_EXCEL_HEADERS,
                rows: tableData,
                fileName: isPurchase ? 'purchase_stone_report' : 'sale_stone_report',
                sheetName: title,
                title,
                totals: true,
                autoFilter: true,
                titleNoTopLeftBorder: true,
            });
            toastSuccess('Exported to Excel');
        } catch (err) {
            toastError(err.message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            {/* <PageHeroHeader
                breadcrumb="REPORTS"
                title="Sale Stock Report"
                icon={<BarChartOutlined />}
                actions={(
                    <Button type="primary" icon={<FileUp size={16} />} loading={exporting} onClick={handleExport} disabled={!tableData.length}>
                        Export to Excel
                    </Button>
                )}
            /> */}

            <AdvancedFilterPanel
                // title="Filter Sale Stock Report"
                title="Sale Stock Report"
                // subtitle="Filter by party, invoice number, and date range."
                activeCount={activeCount}
                onClear={handleClear}
                clearDisabled={!activeCount}
                onSearch={handleSearch}
                searchLoading={tableLoading}
                extraActions={(
                    <>
                        <Button type="default" icon={<ReloadOutlined />} className={filterPanelStyles.btnClear} onClick={handleSearch} loading={tableLoading}>
                            Reload
                        </Button>
                        <ExportExcelButton
                            loading={exporting}
                            onClick={handleExport}
                            disabled={!tableData.length}
                        />
                    </>
                )}
            >
                <div className={`${filterPanelStyles.filterInlineRow} ${styles.saleStockFilterForm}`}>
                    <Form form={form} initialValues={{ type: 'sale' }}>
                        <div className={styles.filterFieldsFlex}>
                            <Form.Item name="type" className={styles.filterItem}>
                                <Select
                                    placeholder="Type"
                                    options={TYPE_OPTIONS}
                                    className={styles.fieldDate}
                                />
                            </Form.Item>
                            <Form.Item name="party" className={styles.filterItem}>
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder="Party"
                                    options={companyOptions}
                                    optionFilterProp="label"
                                    className={styles.fieldParty}
                                />
                            </Form.Item>
                            <Form.Item name="invoiceNo" className={styles.filterItem}>
                                <Input
                                    allowClear
                                    placeholder="Invoice No"
                                    className={styles.fieldInvoice}
                                    onPressEnter={handleSearch}
                                    autoComplete="off"
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

            <Card className={styles.tableCard}>
                <div ref={tableRef} className="erp-table-container">
                    <SkeletonAwareTable
                        columns={columns}
                        dataSource={tableData}
                        loading={tableLoading}
                        pagination={{ pageSize: 50 }}
                        bordered size="small"
                        scroll={{
                            x: "max-content",
                            y: tableHeight
                        }}
                    />
                </div>
            </Card>
        </div>
    );
};

export default SaleStoneReport;
