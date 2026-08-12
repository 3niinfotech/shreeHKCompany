import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Card, Typography, Form, Input, DatePicker, Button, message } from 'antd';
import { FileUp } from 'lucide-react';
import dayjs from 'dayjs';
import { api } from '../../api/axiosInstance';
import { ENDPOINTS } from '../../constants/endpoints';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import PageHeroHeader from '../../components/common/PageHeroHeader';
import { SwapOutlined, ReloadOutlined } from '@ant-design/icons';
import { exportReportToExcel } from '../../utils/reportExcelExport';
import { cssVar } from '../../theme';
import styles from '../../assets/scss/pages/report/transferHistory.module.scss';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';
import { toastApiError } from '../../utils/apiToast';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';
import { SkuLink } from '../../hooks/useSkuModalAction';

const { Text } = Typography;

const TransferHistory = () => {
    const [searchParams] = useSearchParams();
    const [form] = Form.useForm();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    const skuSearch = Form.useWatch('skuSearch', form);
    const fromDate = Form.useWatch('fromDate', form);
    const toDate = Form.useWatch('toDate', form);
    const activeCount = [skuSearch, fromDate, toDate].filter(Boolean).length;

    const columns = [
        { title: 'No', dataIndex: 'no', key: 'no', width: 60, align: 'center' },
        { title: 'Sku', dataIndex: 'sku', key: 'sku', className: styles.skuColumn, render: (text, record) => <SkuLink sku={text} record={record} /> },
        { title: 'Date', dataIndex: 'date', key: 'date', render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
        { title: 'To Company', dataIndex: 'toCompany', key: 'toCompany' },
        { title: 'Discription', dataIndex: 'discription', key: 'discription' },
        {
            title: 'User By', dataIndex: 'userBy', key: 'userBy',
            render: (text) => <Text strong style={{ color: cssVar('color-text-link') }}>{text}</Text>
        },
    ];

    const handleSearch = async () => {
        const v = form.getFieldsValue();
        const sku = (v.skuSearch || '').trim();
        setLoading(true);
        try {
            const params = {};
            if (sku) params.sku = sku;
            if (v.fromDate) params.fromDate = dayjs(v.fromDate).format('YYYY-MM-DD');
            if (v.toDate) params.toDate = dayjs(v.toDate).format('YYYY-MM-DD');
            const res = await api.get(ENDPOINTS.report.transferHistory, { params });
            const rows = (res.data?.Data || []).map((r, i) => ({ ...r, key: i }));
            setData(rows);
        } catch (err) {
            toastApiError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const skuFromUrl = (searchParams.get('sku') || '').trim();
        if (skuFromUrl) {
            form.setFieldsValue({ skuSearch: skuFromUrl });
        }
        handleSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const handleClear = () => {
        form.resetFields();
        setData([]);
    };

    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(tableRef, [data.length, loading]);

    const exportHeaders = [
        { title: 'No', key: 'no', width: 8 },
        { title: 'Sku', key: 'sku', width: 14 },
        { title: 'Date', key: 'date', width: 12 },
        { title: 'To Company', key: 'toCompany', width: 18 },
        { title: 'Description', key: 'discription', width: 24 },
        { title: 'User By', key: 'userBy', width: 14 },
    ];

    const handleExport = async () => {
        if (!data.length) {
            message.warning('Run search first — no data to export.');
            return;
        }
        setExporting(true);
        try {
            await exportReportToExcel({
                headers: exportHeaders,
                rows: data,
                fileName: 'transfer_history',
                sheetName: 'Transfers',
            });
            message.success('Exported to Excel');
        } catch (err) {
            message.error(err.message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className={styles.erpContainer}>
            {/* <PageHeroHeader
                breadcrumb="REPORTS"
                title="Stone Transfer History"
                icon={<SwapOutlined />}
                actions={(
                    <Button type="primary" icon={<FileUp size={16} />} loading={exporting} onClick={handleExport} disabled={!data.length}>
                        Export to Excel
                    </Button>
                )}
            /> */}

            <AdvancedFilterPanel
                title="Filter Transfer History"
                // subtitle="Search by SKU and date range to load transfer records."
                activeCount={activeCount}
                onClear={handleClear}
                clearDisabled={!activeCount}
                onSearch={handleSearch}
                searchLoading={loading}
                extraActions={(
                    <>
                        <Button type="default" icon={<ReloadOutlined />} className={filterPanelStyles.btnClear} onClick={handleSearch} loading={loading}>
                            Reload
                        </Button>
                        <Button type="primary" icon={<FileUp size={16} />} loading={exporting} onClick={handleExport} disabled={!data.length} style={{ background: "var(--color-btn-save-bg)", borderColor: "var(--color-btn-save-bg)", color: "#fff" }}>
                            Export to Excel
                        </Button>
                    </>
                )}
            >
                <div className={`${filterPanelStyles.filterInlineRow} ${styles.transferFilterForm}`}>
                    <Form form={form}>
                        <div className={styles.filterFieldsFlex}>
                            <Form.Item name="skuSearch" className={styles.filterItem}>
                                <Input
                                    allowClear
                                    placeholder="Enter SKU..."
                                    className={styles.fieldSku}
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
                    <SkeletonAwareTable columns={columns} dataSource={data} loading={loading} pagination={{ pageSize: 50 }} size="small" bordered scroll={{ x: "max-content", y: tableHeight }} />
                </div>
            </Card>
        </div>
    );
};

export default TransferHistory;
