import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Card, Form, Input, Table, Tag, Typography } from 'antd';
import { api } from '../../api/axiosInstance';
import { ENDPOINTS } from '../../constants/endpoints';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import styles from '../../assets/scss/pages/report/stoneHistory.module.scss';
import { toastApiError } from '../../utils/apiToast';

const { Title } = Typography;

const historyColumns = [
    { title: 'Action', dataIndex: 'action', key: 'action', width: 120 },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
    { title: 'Invoice', dataIndex: 'invoice', key: 'invoice', width: 100 },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Pcs', dataIndex: 'pcs', key: 'pcs', width: 70 },
    { title: 'Carat', dataIndex: 'carat', key: 'carat', width: 80 },
    { title: 'Price', dataIndex: 'price', key: 'price', width: 90 },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 100 },
];

const StoneInfoReport = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const [byParty, setByParty] = useState([]);
    const [status, setStatus] = useState('');

    const handleSearch = async () => {
        const sku = (form.getFieldValue('searchSku') || '').trim();
        if (!sku) return;
        setLoading(true);
        try {
            const res = await api.get(ENDPOINTS.report.stoneInfo, { params: { sku } });
            const data = res.data?.Data;
            if (!data?.detail) {
                toastApiError({ response: { data: res.data } });
                return;
            }
            setDetail(data.detail);
            setByParty(data.byParty || []);
            setStatus(data.status || '');
        } catch (err) {
            toastApiError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        form.resetFields();
        setDetail(null);
        setByParty([]);
        setStatus('');
    };

    const searchSku = Form.useWatch('searchSku', form);
    const activeCount = searchSku ? 1 : 0;

    return (
        <div className={styles.pageContainer}>
            <AdvancedFilterPanel
                // title="Filter Stone Info"
                title="Stone Info"
                subtitle="Enter stone ID or SKU to load stone details and history."
                activeCount={activeCount}
                onClear={handleClear}
                clearDisabled={!activeCount}
                onSearch={handleSearch}
                searchLoading={loading}
                clearLabel="Reset"
            >
                <div className={styles.stoneSearchRow}>
                    <label className={styles.searchLabel} htmlFor="stone-info-sku">
                        Stone Id / SKU :
                    </label>
                    <Form form={form} className={styles.searchForm} layout="inline">
                        <Form.Item name="searchSku" className={styles.searchFieldItem}>
                            <Input
                                id="stone-info-sku"
                                placeholder="SKU"
                                className={`${filterPanelStyles.filterControl} ${styles.skuSearchInput}`}
                                onPressEnter={handleSearch}
                                allowClear
                                autoComplete="off"
                            />
                        </Form.Item>
                    </Form>
                </div>
            </AdvancedFilterPanel>

            {(loading || detail) && (
                <Card style={{ marginTop: 16 }}>
                    {loading && !detail ? (
                        <Table
                            size="small"
                            columns={historyColumns}
                            dataSource={[]}
                            loading
                            pagination={false}
                            bordered
                        />
                    ) : detail ? (
                        <>
                            <Title level={5}>SKU: {detail.sku} <Tag>{status}</Tag></Title>
                            <p>Lab: {detail.lab} | Carat: {detail.polish_carat} | Price: {detail.price}</p>
                            {byParty.map((block) => (
                                <div key={block.party_id} style={{ marginTop: 24 }}>
                                    <Title level={5}>{block.party_name}</Title>
                                    <Typography.Text strong>Memo / Consign</Typography.Text>
                                    <Table
                                        size="small"
                                        columns={historyColumns}
                                        dataSource={(block.memoHistory || []).map((r, i) => ({ ...r, key: `m-${i}` }))}
                                        loading={loading}
                                        pagination={false}
                                        bordered
                                        style={{ marginBottom: 16 }}
                                    />
                                    <Typography.Text strong>Sale / Export</Typography.Text>
                                    <Table
                                        size="small"
                                        columns={historyColumns}
                                        dataSource={(block.saleHistory || []).map((r, i) => ({ ...r, key: `s-${i}` }))}
                                        loading={loading}
                                        pagination={false}
                                        bordered
                                    />
                                </div>
                            ))}
                        </>
                    ) : null}
                </Card>
            )}
        </div>
    );
};

export default StoneInfoReport;
