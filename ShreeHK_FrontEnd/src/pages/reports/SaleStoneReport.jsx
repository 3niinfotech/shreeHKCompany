import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Table, Card, Form, Select, Input, DatePicker, Button, message } from 'antd';
import { FileUp } from 'lucide-react';
import dayjs from 'dayjs';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import PageHeroHeader from '../../components/common/PageHeroHeader';
import { BarChartOutlined, ReloadOutlined } from '@ant-design/icons';
import { exportReportToExcel } from '../../utils/reportExcelExport';
import styles from '../../assets/scss/pages/report/groupReport.module.scss';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';

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
            type: 'sale',
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
        { title: 'SKU', dataIndex: 'sku', width: 100 },
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

    const exportHeaders = columns.map((c) => ({
        title: c.title,
        key: c.dataIndex || c.title,
        width: 14,
    }));

    const handleExport = async () => {
        if (!tableData.length) {
            message.warning('Run search first — no data to export.');
            return;
        }
        setExporting(true);
        try {
            await exportReportToExcel({
                headers: exportHeaders,
                rows: tableData,
                fileName: 'sale_stock_report',
                sheetName: 'Sale Stock',
            });
            message.success('Exported to Excel');
        } catch (err) {
            message.error(err.message || 'Export failed');
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
                        <Button type="primary" icon={<FileUp size={16} />} loading={exporting} onClick={handleExport} disabled={!tableData.length} style={{ background: "var(--color-btn-save-bg)", borderColor: "var(--color-btn-save-bg)", color: "#fff" }}>
                            Export to Excel
                        </Button>
                    </>
                )}
            >
                <div className={`${filterPanelStyles.filterInlineRow} ${styles.saleStockFilterForm}`}>
                    <Form form={form}>
                        <div className={styles.filterFieldsFlex}>
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
                    <Table
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
