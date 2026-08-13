import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Tag, Button, Typography, Switch, Tabs } from 'antd';
import { toastSuccess, toastError, toastWarning } from '../../utils/toastNotify';
import { ReloadOutlined } from '@ant-design/icons';
import {
    CircleDot, ScanText, FileUp, History, BookOpen, Image,
    Pencil, ExternalLink, Link2, BadgeCheck, Tag as TagIcon,
    ShieldAlert, Award, Gem,
} from 'lucide-react';
import useFormHandleChange from '../../hooks/useFormHandleChange';
import DynamicForm from '../../hooks/DynamicFormField';
import { api } from '../../api/axiosInstance';
import { ENDPOINTS } from '../../constants/endpoints';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import { exportReportToExcel } from '../../utils/reportExcelExport';
import { buildStoneUpdateUrl } from '../../utils/inventorySkuNavigation';
import styles from '../../assets/scss/pages/report/stoneHistory.module.scss';
import { toastApiError } from '../../utils/apiToast';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';

const { Text } = Typography;

const formatHistoryDateTime = (row) => {
    if (row?.date_display) return row.date_display;
    if (!row?.date) return '—';
    const parsed = new Date(row.date);
    if (Number.isNaN(parsed.getTime())) return String(row.date);
    return parsed.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).replace(',', '');
};

const formatHistoryDate = (row) => {
    if (!row?.date) return '—';
    const parsed = new Date(row.date);
    if (Number.isNaN(parsed.getTime())) return String(row.date).slice(0, 10);
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
};

const signedQty = (row, field) => {
    const n = Number(row?.[field]) || 0;
    return String(row?.type || '').toLowerCase() === 'cr' ? n : -n;
};

const renderInvoiceCell = (invoice) => {
    if (!invoice) return '—';
    const value = String(invoice).trim();
    if (!value) return '—';
    return (
        <Link
            className={styles.invoiceLink}
            to={`/transaction/out-memo?invoice=${encodeURIComponent(value)}`}
            onClick={(e) => e.stopPropagation()}
        >
            {value}
        </Link>
    );
};

const mapDetailToForm = (d) => ({
    mfgCode: d.mfg_code || '',
    sku: d.sku || '',
    lab: d.lab || '',
    pcs: d.polish_pcs || '',
    carat: d.polish_carat || '',
    fullColor: d.main_color || '',
    cost: d.cost || '',
    price: d.price || '',
    amount: d.amount || '',
    loc: d.location || '',
    remark: d.remark || '',
    main: d.main_group || '',
    sub: d.sub_group || '',
    inHouseCla: d.in_house_clarity || '',
    argyleColor: d.argyle_color || '',
    mining: d.mining || '',
    origin: d.origin || '',
    certificate: d.report_no || '',
    shape: d.shape || '',
    clarity: d.clarity || '',
    size: d.size || '',
    fluorescence: d.f_intensity || '',
    cut: d.cut || '',
    polish: d.polish || '',
    symm: d.symmentry || '',
    table: d.table_pc || '',
    depth: d.depth_pc || '',
    msurmnt: d.mesurment || '',
    girdle: d.gridle || '',
    intensity: d.intensity || '',
    overtone: d.overtone || '',
    color: d.color || '',
    package: d.package || '',
    stoneType: d.group_type || '',
    category: d.category || '',
    rap: d.rap_price || '',
    bgm: d.bgm || '',
    eyeClean: d.eyeclean || '',
});

const isFlagOn = (value) => value === 1 || value === '1' || value === true;

const formatHoldDate = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
};

const extraStatusMeta = (outward) => {
    const value = String(outward || '').toLowerCase();
    if (!value) return { key: 'available', label: 'Available', Icon: BadgeCheck };
    if (value === 'sale' || value === 'export') return { key: 'sale', label: 'Sale', Icon: TagIcon };
    if (value === 'memo') return { key: 'memo', label: 'Memo', Icon: TagIcon };
    if (value === 'consign') return { key: 'consign', label: 'Consignment', Icon: TagIcon };
    if (value === 'lab') return { key: 'lab', label: 'Lab', Icon: Award };
    return { key: 'other', label: String(outward).toUpperCase(), Icon: TagIcon };
};

const ExtraFlagTile = ({ label, on }) => (
    <div className={`${styles.flagTile} ${on ? styles.flagTileOn : ''}`}>
        <span>{label}</span>
        <Switch size="small" checked={on} disabled />
    </div>
);

const ExtraMetric = ({ value, label }) => (
    <div className={styles.metric}>
        <span className={styles.metricValue}>{value}</span>
        <span className={styles.metricLabel}>{label}</span>
    </div>
);

const ExtraDetailPanel = ({ stoneDetail, holdInfo, onPairClick }) => {
    const status = extraStatusMeta(stoneDetail.outward);
    const StatusIcon = status.Icon;
    const pairSku = String(stoneDetail.pair || '').trim();
    const shapeLine = [stoneDetail.shape, stoneDetail.main_color, stoneDetail.clarity].filter(Boolean).join(' | ') || '—';

    return (
        <div className={styles.extraWrap}>
            <aside className={styles.extraSide}>
                <div className={`${styles.statusBadge} ${styles[`status_${status.key}`]}`}>
                    <StatusIcon size={15} />
                    <span>{status.label}</span>
                </div>
                {pairSku ? (
                    <button type="button" className={styles.pairBtn} onClick={() => onPairClick(pairSku)}>
                        <Link2 size={13} />
                        {pairSku.toUpperCase()}
                    </button>
                ) : null}
                <div className={styles.extraLinks}>
                    <Link to={buildStoneUpdateUrl(stoneDetail.sku)} className={`${styles.extraBtn} ${styles.extraBtnDanger}`}>
                        <Pencil size={13} />
                        Update Detail
                    </Link>
                    <a
                        href={`https://www.shreehk.com/rapnet.php?sku=${encodeURIComponent(stoneDetail.sku || '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`${styles.extraBtn} ${styles.extraBtnPrimary}`}
                    >
                        <ExternalLink size={13} />
                        Rapnet Page
                    </a>
                </div>
                {isFlagOn(stoneDetail.hold) && holdInfo ? (
                    <div className={styles.holdAlert}>
                        <div className={styles.holdAlertTitle}>
                            <ShieldAlert size={14} />
                            On Hold
                        </div>
                        <p><b>Hold By</b>: {holdInfo.user_name || '—'}</p>
                        <p><b>Date</b>: {formatHoldDate(holdInfo.date)}</p>
                        <p><b>Description</b>: {holdInfo.description || '—'}</p>
                    </div>
                ) : null}
            </aside>
            <div className={styles.extraMain}>
                <div className={styles.flagRow}>
                    <ExtraFlagTile label="Is Hold" on={isFlagOn(stoneDetail.hold)} />
                    <ExtraFlagTile label="Site Upload" on={isFlagOn(stoneDetail.is_uploadsite)} />
                    <ExtraFlagTile label="Rapnet Upload" on={isFlagOn(stoneDetail.is_uploadrapnet)} />
                    <ExtraFlagTile label="Hide" on={isFlagOn(stoneDetail.hide)} />
                </div>
                <div className={styles.labLine}>
                    <span className={styles.labBadge}>
                        <Award size={13} />
                        {String(stoneDetail.lab || '').toUpperCase() || '—'}
                    </span>
                    <span className={styles.labCert}>{String(stoneDetail.report_no || '').toUpperCase() || '—'}</span>
                </div>
                <div className={styles.metricRow}>
                    <div className={`${styles.metricGroup} ${styles.metricGroupCurrent}`}>
                        <div className={styles.metricGroupTitle}>Current Stock</div>
                        <div className={styles.metricGrid}>
                            <ExtraMetric
                                value={`${stoneDetail.polish_pcs || 0} pcs · ${stoneDetail.polish_carat || 0} cts`}
                                label="Carat"
                            />
                            <ExtraMetric value={stoneDetail.price || 0} label="Price" />
                            <ExtraMetric value={stoneDetail.amount || 0} label="Amount" />
                        </div>
                    </div>
                    <div className={`${styles.metricGroup} ${styles.metricGroupPurchase}`}>
                        <div className={styles.metricGroupTitle}>Purchase</div>
                        <div className={styles.metricGrid}>
                            <ExtraMetric
                                value={`${stoneDetail.purchase_pcs || 0} pcs · ${stoneDetail.purchase_carat || 0} cts`}
                                label="Purchase Carat"
                            />
                            <ExtraMetric value={stoneDetail.purchase_price || 0} label="Purchase Price" />
                            <ExtraMetric value={stoneDetail.purchase_amount || 0} label="Purchase Amount" />
                        </div>
                    </div>
                </div>
                <div className={styles.shapeLine}>
                    <Gem size={14} />
                    {shapeLine}
                </div>
            </div>
        </div>
    );
};

const encodeSkuPath = (sku) => encodeURIComponent(String(sku || '').trim());

const stoneMediaOrigin = () => {
    if (import.meta.env.DEV) return '';
    return String(import.meta.env.VITE_NODE_API_URL || '').replace(/\/$/, '');
};

const stoneImageUrls = (sku) => {
    const safe = String(sku || '').trim();
    if (!safe) return [];
    const encoded = encodeSkuPath(safe);
    const origin = stoneMediaOrigin();
    return [1, 2, 3, 4].map((n) => (
        `${origin}/media/v360video/imaged/${encoded}/${encoded}-${n}.jpg`
    ));
};

const stoneVideoUrl = (sku) => {
    const safe = String(sku || '').trim();
    if (!safe) return '';
    return `${stoneMediaOrigin()}/media/v360video/Vision360.html?d=${encodeSkuPath(safe)}`;
};

const stoneVideoExternalUrl = (sku) => {
    const safe = String(sku || '').trim();
    if (!safe) return '';
    return `https://www.shreehk.com/media/v360video/Vision360.html?d=${encodeSkuPath(safe)}`;
};

const StoneHistory = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [historyRows, setHistoryRows] = useState([]);
    const [oldHistoryRows, setOldHistoryRows] = useState([]);
    const [status, setStatus] = useState('');
    const [lastUpdated, setLastUpdated] = useState('');
    const [stoneDetail, setStoneDetail] = useState(null);
    const [holdInfo, setHoldInfo] = useState(null);
    const [hiddenImages, setHiddenImages] = useState({});
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [oldLoading, setOldLoading] = useState(false);
    const [searchForm] = Form.useForm();
    const { form, resetAll } = useFormHandleChange();

    const applyDetailResponse = async (res) => {
        const { detail, history, status: st } = res.data || {};
        if (!detail) return false;
        form.setFieldsValue(mapDetailToForm(detail));
        setStoneDetail(detail);
        setHistoryRows((history || []).map((h, i) => ({ ...h, key: i })));
        setOldHistoryRows([]);
        setStatus(st || '');
        setLastUpdated(detail?.last_updated_display || '');
        setHiddenImages({});
        setActiveTab('general');
        setShowForm(true);
        setHoldInfo(null);
        if (isFlagOn(detail.hold) && detail.id) {
            try {
                const holdRes = await api.get(ENDPOINTS.product.holdDetail, {
                    params: { productId: detail.id },
                });
                setHoldInfo(holdRes.data?.data || null);
            } catch {
                setHoldInfo(null);
            }
        }
        return true;
    };

    const topFields = [
        { name: 'mfgCode', label: 'Mfg.Code', span: 6, disabled: true },
        { name: 'sku', label: 'Sku', span: 6, disabled: true },
        { name: 'lab', label: 'Lab', span: 6, disabled: true },
        { name: 'pcs', label: 'Pcs', span: 6, disabled: true },
        { name: 'carat', label: 'Carat', span: 6, disabled: true },
        { name: 'fullColor', label: 'Full Color', span: 6, disabled: true },
        { name: 'cost', label: 'Cost', span: 6, disabled: true },
        { name: 'price', label: 'Price', span: 6, disabled: true },
        { name: 'amount', label: 'Amount', span: 6, disabled: true },
        { name: 'loc', label: 'LOC', span: 6, disabled: true },
        { name: 'remark', label: 'Remark', span: 6, disabled: true },
        { name: 'main', label: 'Main', span: 6, disabled: true },
        { name: 'sub', label: 'Sub', span: 6, disabled: true },
        { name: 'inHouseCla', label: 'In House Cla', span: 6, disabled: true },
        { name: 'argyleColor', label: 'Argyle Color', span: 6, disabled: true },
        { name: 'mining', label: 'Mining', span: 6, disabled: true },
        { name: 'origin', label: 'Origin', span: 6, disabled: true },
    ];

    const bottomFields = [
        { name: 'certificate', label: 'Certificate.', span: 6, disabled: true },
        { name: 'shape', label: 'Shape', span: 6, disabled: true },
        { name: 'clarity', label: 'Clarity', span: 6, disabled: true },
        { name: 'size', label: 'Size', span: 6, disabled: true },
        { name: 'fluorescence', label: 'Fluorescence', span: 6, disabled: true },
        { name: 'cut', label: 'Cut', span: 6, disabled: true },
        { name: 'polish', label: 'Polish', span: 6, disabled: true },
        { name: 'symm', label: 'Symm', span: 6, disabled: true },
        { name: 'table', label: 'Table', span: 6, disabled: true },
        { name: 'depth', label: 'Depth', span: 6, disabled: true },
        { name: 'msurmnt', label: 'Msurmnt', span: 6, disabled: true },
        { name: 'girdle', label: 'Girdle', span: 6, disabled: true },
        { name: 'intensity', label: 'Intensity', span: 6, disabled: true },
        { name: 'overtone', label: 'Overtone', span: 6, disabled: true },
        { name: 'color', label: 'Color', span: 6, disabled: true },
        { name: 'package', label: 'Package', span: 6, disabled: true },
        { name: 'stoneType', label: 'Stone Type', span: 6, disabled: true },
        { name: 'category', label: 'Category', span: 6, disabled: true },
        { name: 'rap', label: 'Rap', span: 6, disabled: true },
        { name: 'bgm', label: 'BGM', span: 6, disabled: true },
        { name: 'eyeClean', label: 'Eye Clean', span: 6, disabled: true },
    ];

    const historyColumns = [
        { title: 'Action', dataIndex: 'action_label', key: 'action', width: 120 },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            width: 110,
            render: (_, row) => formatHistoryDate(row),
        },
        {
            title: 'Date & Time',
            dataIndex: 'date_display',
            key: 'date_display',
            width: 170,
            render: (_, row) => formatHistoryDateTime(row),
        },
        {
            title: 'Updated By',
            dataIndex: 'updated_by',
            key: 'updated_by',
            width: 120,
            render: (value) => value || '—',
        },
        { title: 'Party', dataIndex: 'party_name', key: 'party', width: 140 },
        {
            title: 'Invoice',
            dataIndex: 'invoice',
            key: 'invoice',
            width: 110,
            render: (value) => renderInvoiceCell(value),
        },
        { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
        {
            title: 'Pcs',
            dataIndex: 'pcs',
            key: 'pcs',
            width: 70,
            align: 'right',
            render: (_, row) => signedQty(row, 'pcs'),
        },
        {
            title: 'Carat',
            dataIndex: 'carat',
            key: 'carat',
            width: 80,
            align: 'right',
            render: (_, row) => signedQty(row, 'carat'),
        },
        {
            title: 'B.Pcs',
            dataIndex: 'balance_pcs',
            key: 'balance_pcs',
            width: 80,
            align: 'right',
            render: (value) => (value == null || value === '' ? '—' : value),
        },
        {
            title: 'B.Carat',
            dataIndex: 'balance_carat',
            key: 'balance_carat',
            width: 90,
            align: 'right',
            render: (value) => (value == null || value === '' ? '—' : value),
        },
        { title: 'Price', dataIndex: 'price', key: 'price', width: 90, align: 'right' },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 100, align: 'right' },
    ];

    const handleSearch = async () => {
        const skuValue = (searchForm.getFieldValue('searchSku') || '').trim();
        if (!skuValue) return;
        setLoading(true);
        try {
            const res = await api.get(ENDPOINTS.report.stoneDetail, { params: { sku: skuValue } });
            const applied = await applyDetailResponse(res);
            if (!applied) {
                toastApiError({ response: { data: res.data } });
            }
        } catch (err) {
            toastApiError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!historyRows.length) {
            toastWarning('Search for a SKU first — no history to export.');
            return;
        }
        setExporting(true);
        try {
            await exportReportToExcel({
                headers: historyColumns.map((c) => ({
                    title: c.title,
                    key: c.dataIndex || c.key,
                    width: 14,
                })),
                rows: historyRows.map((row) => ({
                    ...row,
                    date: formatHistoryDate(row),
                    date_display: formatHistoryDateTime(row),
                    pcs: signedQty(row, 'pcs'),
                    carat: signedQty(row, 'carat'),
                })),
                fileName: 'stone_history',
                sheetName: 'History',
            });
            toastSuccess('Exported to Excel');
        } catch (err) {
            toastError(err.message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        const skuFromUrl = (searchParams.get('sku') || '').trim();
        if (!skuFromUrl) return;
        searchForm.setFieldsValue({ searchSku: skuFromUrl });
        const run = async () => {
            setLoading(true);
            try {
                const res = await api.get(ENDPOINTS.report.stoneDetail, { params: { sku: skuFromUrl } });
                await applyDetailResponse(res);
            } catch (err) {
                toastApiError(err);
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [searchParams, searchForm, form]);

    const handleLoadOld = async () => {
        const skuValue = (searchForm.getFieldValue('searchSku') || '').trim();
        if (!skuValue) {
            toastWarning('Search for a SKU first.');
            return;
        }
        setOldLoading(true);
        try {
            const res = await api.get(ENDPOINTS.report.stoneDetailOld, { params: { sku: skuValue } });
            const history = res.data?.history || [];
            setOldHistoryRows(history.map((h, i) => ({ ...h, key: `old-${i}` })));
            if (!history.length) {
                toastWarning('No old history found for this SKU.');
            } else {
                toastSuccess(`Loaded ${history.length} old history row(s)`);
            }
        } catch (err) {
            toastApiError(err);
        } finally {
            setOldLoading(false);
        }
    };

    const handleReset = () => {
        searchForm.resetFields();
        resetAll();
        setHistoryRows([]);
        setOldHistoryRows([]);
        setStatus('');
        setLastUpdated('');
        setStoneDetail(null);
        setHoldInfo(null);
        setHiddenImages({});
        setActiveTab('general');
        setShowForm(false);
    };

    const searchSku = Form.useWatch('searchSku', searchForm);

    return (
        <div className={styles.pageContainer}>
            <AdvancedFilterPanel
                // title="Filter Stone History"
                title="Stone History"
                // subtitle="Enter stone ID or SKU to load detail and transaction history."
                activeCount={searchSku ? 1 : 0}
                onClear={handleReset}
                clearLabel="Reset"
                onSearch={handleSearch}
                searchLoading={loading}
                extraActions={(
                    <Button type="default" icon={<ReloadOutlined />} className={filterPanelStyles.btnClear} onClick={handleSearch} loading={loading}>
                        Reload
                    </Button>
                )}
            >
                <div className={styles.stoneSearchRow}>
                    {/* <label className={styles.searchLabel} htmlFor="stone-history-sku">
                        Stone Id / SKU :
                    </label> */}
                    <Form form={searchForm} className={styles.searchForm} layout="inline">
                        <Form.Item name="searchSku" className={styles.searchFieldItem}>
                            <Input
                                id="stone-history-sku"
                                placeholder="DKG-010"
                                className={`${filterPanelStyles.filterControl} ${styles.skuSearchInput}`}
                                onPressEnter={handleSearch}
                                allowClear
                                autoComplete="off"
                            />
                        </Form.Item>
                    </Form>
                </div>
            </AdvancedFilterPanel>

            {showForm && (
                <div className={styles.sectionsWrap}>
                    {status ? (
                        <Card size="small" style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                                <span>
                                    Status: <Tag color="blue">{status}</Tag>
                                </span>
                                {lastUpdated ? (
                                    <Text type="secondary">
                                        Last Updated: <Text strong>{lastUpdated}</Text>
                                    </Text>
                                ) : null}
                            </div>
                        </Card>
                    ) : null}
                    <Card className={styles.detailsCard}>
                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            className={styles.detailTabs}
                            items={[
                                {
                                    key: 'general',
                                    label: (
                                        <span className={styles.tabLabel}>
                                            <CircleDot size={14} />
                                            General Detail
                                        </span>
                                    ),
                                    children: (
                                        <Form form={form} className={styles.customFormDesign}>
                                            <div className={styles.tabSectionTitle}>
                                                <CircleDot size={13} />
                                                General Information
                                            </div>
                                            <DynamicForm fields={topFields} />
                                            <div className={styles.tabSectionTitle}>
                                                <ScanText size={13} />
                                                Advanced Information
                                            </div>
                                            <DynamicForm fields={bottomFields} />
                                        </Form>
                                    ),
                                },
                                {
                                    key: 'extra',
                                    label: (
                                        <span className={styles.tabLabel}>
                                            <BookOpen size={14} />
                                            Extra Detail
                                        </span>
                                    ),
                                    children: stoneDetail ? (
                                        <ExtraDetailPanel
                                            stoneDetail={stoneDetail}
                                            holdInfo={holdInfo}
                                            onPairClick={(sku) => navigate(`/report/stone-history?sku=${encodeURIComponent(sku)}`)}
                                        />
                                    ) : null,
                                },
                                {
                                    key: 'media',
                                    label: (
                                        <span className={styles.tabLabel}>
                                            <Image size={14} />
                                            Image / Video
                                        </span>
                                    ),
                                    children: stoneDetail?.sku ? (
                                        <div className={styles.mediaWrap}>
                                            <div className={styles.thumbRow}>
                                                {stoneImageUrls(stoneDetail.sku).map((src, idx) => (
                                                    hiddenImages[src] ? (
                                                        <div key={src} className={styles.thumbFallback}>
                                                            No image {idx + 1}
                                                        </div>
                                                    ) : (
                                                        <img
                                                            key={src}
                                                            src={src}
                                                            alt={`${stoneDetail.sku}-${idx + 1}`}
                                                            className={styles.thumb}
                                                            referrerPolicy="no-referrer"
                                                            onError={() => setHiddenImages((prev) => ({ ...prev, [src]: true }))}
                                                        />
                                                    )
                                                ))}
                                            </div>
                                            {activeTab === 'media' ? (
                                                <iframe
                                                    title={`Vision360 ${stoneDetail.sku}`}
                                                    src={stoneVideoUrl(stoneDetail.sku)}
                                                    className={styles.visionFrame}
                                                    scrolling="no"
                                                    width="480"
                                                    height="530"
                                                    frameBorder="0"
                                                    referrerPolicy="no-referrer"
                                                    allow="fullscreen"
                                                />
                                            ) : null}
                                            <a
                                                className={styles.visionLink}
                                                href={stoneVideoExternalUrl(stoneDetail.sku)}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open 360 video in new tab
                                            </a>
                                        </div>
                                    ) : null,
                                },
                            ]}
                        />
                    </Card>
                </div>
            )}

            <Card
                className={`${styles.detailsCard} ${styles.historyTableCard}`}
                title="Transaction History"
                extra={(
                    <span style={{ display: 'inline-flex', gap: 8 }}>
                        <Button
                            size="small"
                            icon={<History size={14} />}
                            loading={oldLoading}
                            onClick={handleLoadOld}
                            disabled={!showForm}
                        >
                            Load Old
                        </Button>
                        <Button type="primary" size="small" icon={<FileUp size={14} />} loading={exporting} onClick={handleExport} disabled={!historyRows.length}>
                            Export
                        </Button>
                    </span>
                )}
            >
                <SkeletonAwareTable
                    columns={historyColumns}
                    dataSource={historyRows}
                    loading={loading}
                    size="small"
                    bordered
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            {oldHistoryRows.length ? (
                <Card
                    className={`${styles.detailsCard} ${styles.historyTableCard}`}
                    title="Old History"
                    style={{ marginTop: 12 }}
                >
                    <SkeletonAwareTable
                        columns={historyColumns}
                        dataSource={oldHistoryRows}
                        loading={oldLoading}
                        size="small"
                        bordered
                        pagination={{ pageSize: 20 }}
                        scroll={{ x: 'max-content' }}
                    />
                </Card>
            ) : null}
        </div>
    );
};

export default StoneHistory;
