import React, { useMemo, useState, useRef } from 'react';
import { Card, Form, Select, Input, DatePicker, Button, Tag } from 'antd';
import { toastSuccess, toastError, toastWarning } from '../../utils/toastNotify';
import dayjs from 'dayjs';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../api/endpoints';
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
    { title: 'InvoiceNo', key: 'invoiceno', width: 14, align: 'center' },
    { title: 'Detail Of Goods', key: 'detail_of_goods', width: 22, align: 'center', accessor: detailOfGoods },
    { title: 'PCS', key: 'polish_pcs', width: 8, align: 'center', type: 'n', total: true, decimals: 0 },
    { title: 'Cts', key: 'polish_carat', width: 10, align: 'center', type: 'n', total: true, decimals: 3 },
    { title: 'Price', key: 'sell_price', width: 12, align: 'center', type: 'n', total: true, decimals: 2, accessor: (row) => Number(row.sell_price ?? row.purchase_price) || 0 },
    { title: 'Amount', key: 'sell_amount', width: 14, align: 'center', type: 'n', total: true, decimals: 2, accessor: (row) => Number(row.sell_amount ?? row.purchase_amount) || 0 },
    { title: 'Terms', key: 'terms', width: 12, align: 'center' },
    { title: 'DueDate', key: 'due_date', width: 14, align: 'center' },
    { title: 'Party', key: 'party', width: 36, align: 'center', accessor: (row) => String(row.party || '').toUpperCase() },
    { title: 'Rec Amt', key: 'paid_amount', width: 12, align: 'center', type: 'n', total: true, decimals: 2, accessor: (row) => Number(row.paid_amount ?? 0) },
    { title: 'Rec Date', key: 'received_date', width: 14, align: 'center', accessor: (row) => row.received_date || '' },
    { title: 'Rec Book', key: 'received_book', width: 14, align: 'center', accessor: (row) => row.received_book || '' },
    { title: 'Remark', key: 'remark', width: 16, align: 'center', accessor: (row) => row.remark || '' },
];

const SaleStoneReport = () => {
    const [form] = Form.useForm();
    const [tableData, setTableData] = useState([]);
    const [exporting, setExporting] = useState(false);
    const { data: companyData } = useFetchApi('GetCompanyAllParties', ENDPOINTS.company.options, { all: '1' });
    const { mutate: fetchReport, isPending: tableLoading } = usePostApiRequest(ENDPOINTS.report.saleStock, 'saleStoneReport', { showToast: false });

    const companyOptions = useMemo(() => {
        const list = companyData?.Data || [];
        return [{ value: '', label: 'All Party' }, ...list.map((c) => ({ value: String(c.id), label: c.name }))];
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
            allCompanies: true,
            limit: 200,
        }, {
            onSuccess: (res) => {
                setTableData((res?.Data || []).map((r, i) => ({ ...r, key: i, no: i + 1 })));
            },
        });
    };

    const columns = [
        { title: 'No', dataIndex: 'no', width: 50, align: 'center', render: (_, __, idx) => idx + 1 },
        { title: 'SKU', dataIndex: 'sku', width: 140, render: (text, record) => <SkuLink sku={text} record={record} /> },
        {
            title: 'Date',
            dataIndex: 'out_date',
            width: 110,
            align: 'center',
            render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')),
        },
        {
            title: 'GIA/NOGIA',
            dataIndex: 'lab',
            width: 95,
            align: 'center',
            render: (lab) => {
                const value = String(lab || '').trim();
                if (!value) return '-';
                const colorMap = {
                    GIA: 'blue',
                    gia: 'blue',
                    IGI: 'green',
                    igi: 'green',
                    CGL: 'orange',
                    cgl: 'orange',
                    AGT: 'purple',
                    agt: 'purple',
                };
                return (
                    <Tag color={colorMap[value] || 'default'} className="inventory-lab-tag">
                        {value.toUpperCase()}
                    </Tag>
                );
            },
        },
        { title: 'InvoiceNo', dataIndex: 'invoiceno', width: 105, align: 'center', render: (v) => v || '-' },
        {
            title: 'Detail Of Goods',
            key: 'detail_of_goods',
            width: 150,
            align: 'center',
            render: (_, record) => detailOfGoods(record) || '-',
        },
        {
            title: 'PCS',
            dataIndex: 'polish_pcs',
            width: 60,
            align: 'right',
            render: (val) => Number(val || 0).toLocaleString(),
        },
        {
            title: 'Cts',
            dataIndex: 'polish_carat',
            width: 80,
            align: 'right',
            render: (val) => Number(val || 0).toFixed(3),
        },
        {
            title: 'Price',
            dataIndex: 'sell_price',
            width: 95,
            align: 'right',
            render: (v, row) => {
                const val = v ?? row.purchase_price;
                return val != null && val !== '' ? (
                    <span style={{ color: 'var(--color-success-dark)' }}>
                        {Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                ) : '-';
            },
        },
        {
            title: 'Amount',
            dataIndex: 'sell_amount',
            width: 110,
            align: 'right',
            render: (v, row) => {
                const val = v ?? row.purchase_amount;
                return val != null && val !== '' ? (
                    <b style={{ color: 'var(--color-primary-dark)' }}>
                        {Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </b>
                ) : '-';
            },
        },
        {
            title: 'Terms',
            dataIndex: 'terms',
            width: 85,
            align: 'center',
            render: (val) => (val != null && val !== '' ? `${val} Days` : '-'),
        },
        {
            title: 'DueDate',
            dataIndex: 'due_date',
            width: 110,
            align: 'center',
            render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')),
        },
        { title: 'Party', dataIndex: 'party', width: 180, render: (v) => v || '-' },
        {
            title: 'Rec Amt',
            dataIndex: 'paid_amount',
            width: 100,
            align: 'right',
            render: (val) => (
                <span style={{ color: 'var(--color-success)' }}>
                    {Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            title: 'Rec Date',
            dataIndex: 'received_date',
            width: 110,
            align: 'center',
            render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')),
        },
        { title: 'Rec Book', dataIndex: 'received_book', width: 100, align: 'center', render: (v) => v || '-' },
        { title: 'Remark', dataIndex: 'remark', width: 140, render: (v) => v || '-' },
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
                                    placeholder="All Party"
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
                                <DatePicker placeholder="From Date" className={styles.fieldDate} format="DD-MM-YYYY" />
                            </Form.Item>
                            <Form.Item name="toDate" className={styles.filterItem}>
                                <DatePicker placeholder="To Date" className={styles.fieldDate} format="DD-MM-YYYY" />
                            </Form.Item>
                        </div>
                    </Form>
                </div>
            </AdvancedFilterPanel>

            <Card
                className={styles.tableCard}
                styles={{
                    body: {
                        padding: 0,
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    },
                }}
            >
                <div ref={tableRef} className={`erp-table-container ${styles.saleStockTable}`}>
                    <SkeletonAwareTable
                        columns={columns}
                        dataSource={tableData}
                        loading={tableLoading}
                        className={styles.saleStockAntTable}
                        pagination={false}
                        bordered
                        size="small"
                        scroll={{
                            x: "max-content",
                            y: tableHeight,
                        }}
                    />
                </div>
            </Card>
        </div>
    );
};

export default SaleStoneReport;
