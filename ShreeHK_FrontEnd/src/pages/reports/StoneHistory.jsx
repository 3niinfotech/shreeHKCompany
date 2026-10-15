import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Tag, Button, Switch, Tabs, Tooltip, Badge } from 'antd';
import { toastSuccess, toastError, toastWarning } from '../../utils/toastNotify';
import { ReloadOutlined } from '@ant-design/icons';
import {
    CircleDot, ScanText, History, BookOpen, Image,
    Pencil, ExternalLink, Link2, BadgeCheck, Tag as TagIcon,
    ShieldAlert, Award, Gem, Network, ShieldCheck, Info,
} from 'lucide-react';
import useFormHandleChange from '../../hooks/useFormHandleChange';
import DynamicForm from '../../components/common/ui/DynamicFormField';
import { api } from '../../api/client/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import ExportExcelButton from '../../components/common/ExportExcelButton';
import { exportReportToExcel } from '../../utils/reportExcelExport';
import { buildStoneUpdateUrl } from '../../utils/inventorySkuNavigation';
import styles from '../../assets/scss/pages/report/stoneHistory.module.scss';
import { toastApiError } from '../../utils/toastNotify';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';
import StockReconciliationCard from '../../components/report/StockReconciliationCard';
import LineageTreePanel from '../../components/report/LineageTreePanel';
import StoneAuditTrailPanel from '../../components/report/StoneAuditTrailPanel';

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

/** Outward / stock-out actions must show as debit even if dai_history.type was saved wrong. */
const HISTORY_DEBIT_ACTIONS = new Set([
    'memo', 'sale', 'lab', 'export', 'consign',
    'purchase_return', 'purchase_delete',
    'sale_close', 'close_sale', 'memo_close', 'close_memo',
    'lab_close', 'close_lab', 'export_close', 'consign_close',
]);
const HISTORY_CREDIT_ACTIONS = new Set([
    'import', 'in_import', 'purchase', 'in_memo', 'in_consign',
    'memo_return', 'sale_return', 'lab_return', 'consign_return',
    'hold', 'unhold', 'price_change', 'unboxing', 'boxing',
    'to_box', 'from_box', 'sku_change',
]);

const isHistoryCredit = (row) => {
    const action = String(row?.action || '').toLowerCase().trim();
    if (HISTORY_DEBIT_ACTIONS.has(action)) return false;
    if (HISTORY_CREDIT_ACTIONS.has(action)) return true;
    return String(row?.type || '').toLowerCase().trim() === 'cr';
};

/** History stores absolute pcs/carat + type cr|dr; UI shows signed movement. */
const signedQty = (row, field) => {
    const n = Number(row?.[field]);
    if (!Number.isFinite(n)) return 0;
    const abs = Math.abs(n);
    return isHistoryCredit(row) ? abs : -abs;
};

const formatQtyCell = (value) => {
    if (value == null || value === '') return '—';
    const n = Number(value);
    if (!Number.isFinite(n)) return value;
    // Keep integers clean; show up to 3 dp for carat without trailing zeros noise
    if (Number.isInteger(n)) return String(n);
    return String(Number(n.toFixed(3)));
};

/** Route invoice click by stone-history action → matching transaction list. */
const getInvoiceLinkForAction = (action, invoice) => {
    const value = String(invoice || '').trim();
    if (!value) return null;
    const a = String(action || '').toLowerCase().trim();
    let path = '/transaction/purchase';
    if (
        a === 'memo' ||
        a === 'memo_return' ||
        a === 'memo_close' ||
        a === 'close_memo' ||
        a === 'consign' ||
        a === 'consign_return' ||
        a === 'consign_close'
    ) {
        path = '/transaction/out-memo';
    } else if (a === 'in_memo' || a === 'in_consign') {
        path = '/transaction/in-memo';
    } else if (
        a === 'sale' ||
        a === 'sale_return' ||
        a === 'sale_close' ||
        a === 'close_sale' ||
        a === 'export' ||
        a === 'export_close'
    ) {
        path = '/transaction/sale';
    } else if (
        a === 'lab' ||
        a === 'lab_return' ||
        a === 'lab_close' ||
        a === 'close_lab'
    ) {
        path = '/transaction/gia-memo';
    } else if (a === 'import' || a === 'purchase' || a === 'purchase_delete') {
        path = '/transaction/purchase';
    }
    const params = new URLSearchParams({ invoice: value });
    return `${path}?${params.toString()}`;
};

const renderInvoiceCell = (invoice, row) => {
    const value = String(invoice || '').trim();
    if (!value) return '—';
    const to = getInvoiceLinkForAction(row?.action, value);
    if (!to) return value;
    return (
        <Link
            className={styles.invoiceLink}
            to={to}
            onClick={(e) => e.stopPropagation()}
            title="Open related invoice"
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
    const [activeTab, setActiveTab] = useState('history');
    const [historyRows, setHistoryRows] = useState([]);
    const [oldHistoryRows, setOldHistoryRows] = useState([]);
    const [status, setStatus] = useState('');
    const [lastUpdated, setLastUpdated] = useState('');
    const [stoneDetail, setStoneDetail] = useState(null);
    const [stockSummary, setStockSummary] = useState(null);
    const [lineage, setLineage] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const [holdInfo, setHoldInfo] = useState(null);
    const [hiddenImages, setHiddenImages] = useState({});
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [oldLoading, setOldLoading] = useState(false);
    const [searchForm] = Form.useForm();
    const { form, resetAll } = useFormHandleChange();

    const applyDetailResponse = async (res) => {
        const { detail, history, status: st, stock_summary, lineage: lin, activity_logs } = res.data || {};
        if (!detail) return false;
        form.setFieldsValue(mapDetailToForm(detail));
        setStoneDetail(detail);
        setHistoryRows((history || []).map((h, i) => ({ ...h, key: i })));
        setOldHistoryRows([]);
        setStatus(st || '');
        setLastUpdated(detail?.last_updated_display || '');
        setStockSummary(stock_summary || null);
        setLineage(lin || null);
        setActivityLogs(activity_logs || []);
        setHiddenImages({});
        setActiveTab('history');
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

    const getActionTagColor = (action) => {
        const a = String(action || '').toLowerCase().trim();
        if (a === 'memo_return' || a === 'consign_return') return 'cyan';
        if (a === 'sale_return' || a === 'lab_return' || a === 'purchase_return') return 'green';
        if (a === 'memo' || a === 'consign') return 'orange';
        if (a === 'sale' || a === 'export') return 'magenta';
        if (a === 'lab') return 'purple';
        return 'blue';
    };

    const historyRowClassName = (row) => {
        if (row?.is_from_memo) return styles.rowFromMemo;
        const a = String(row?.action || '').toLowerCase().trim();
        if (a === 'memo_return' || a === 'consign_return') {
            return row?.is_partial_memo_return
                ? 'stone-row-memo-return-partial'
                : 'stone-row-memo-return';
        }
        if (a === 'memo' || a === 'consign') return 'stone-row-memo-out';
        return '';
    };

    const historyColumns = [
        {
            title: 'Action',
            dataIndex: 'action_label',
            key: 'action',
            width: 105,
            render: (value, row) => {
                const raw = value || row.action || '';
                const label = String(raw).replace(/_/g, ' ').trim();
                if (!label) return '—';
                const display = label
                    .toLowerCase()
                    .replace(/\b\w/g, (ch) => ch.toUpperCase());
                return (
                    <div className={styles.actionCellWrap}>
                        <Tag color={getActionTagColor(row.action)} className={styles.actionMainTag}>
                            {display}
                        </Tag>
                    </div>
                );
            },
        },
        {
            title: 'Date & Time',
            dataIndex: 'date_display',
            key: 'date_display',
            width: 110,
            render: (_, row) => formatHistoryDateTime(row),
        },
        {
            title: 'Party',
            dataIndex: 'party_name',
            key: 'party',
            width: 190,
            ellipsis: true,
            render: (value, row) => {
                const name = String(value || row.party || '').trim();
                return name || '—';
            },
        },
        {
            title: 'Invoice',
            dataIndex: 'invoice',
            key: 'invoice',
            width: 75,
            render: (value, row) => renderInvoiceCell(value, row),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            width: 480,
            ellipsis: true,
            render: (value, row) => {
                const text = String(value || '').trim();
                if (!text) return '—';
                const a = String(row?.action || '').toLowerCase().trim();
                const isReturn = a === 'memo_return' || a === 'consign_return';
                return (
                    <div className={styles.descCellWrap}>
                        {row?.is_from_memo ? (
                            <span className={styles.fromMemoPill} title="Sold from open memo">
                                From Memo
                            </span>
                        ) : null}
                        <span className={isReturn ? styles.memoReturnDesc : ''} title={text}>
                            {text}
                        </span>
                    </div>
                );
            },
        },
        {
            title: 'Pcs',
            dataIndex: 'pcs',
            key: 'pcs',
            width: 70,
            align: 'right',
            render: (_, row) => formatQtyCell(signedQty(row, 'pcs')),
        },
        {
            title: 'Carat',
            dataIndex: 'carat',
            key: 'carat',
            width: 95,
            align: 'right',
            render: (_, row) => {
                const val = formatQtyCell(signedQty(row, 'carat'));
                if (row?.is_from_memo) {
                    return (
                        <div className={styles.memoQtyWrap}>
                            <span className={styles.memoQtyVal}>{val}</span>
                            <Tooltip title={row.balance_note || "Sold from open Memo balance. Carat was already debited from on-hand stock when Memo was issued, so B.Carat does not deduct again."}>
                                <Info size={13} className={styles.memoInfoIcon} />
                            </Tooltip>
                        </div>
                    );
                }
                return val;
            },
        },
        {
            title: 'B.Pcs',
            dataIndex: 'balance_pcs',
            key: 'balance_pcs',
            width: 80,
            align: 'right',
            onHeaderCell: () => ({
                className: 'stone-balance-col',
                style: { background: '#ccfbf1', color: '#0f766e', fontWeight: 700 },
            }),
            onCell: () => ({
                className: 'stone-balance-col',
                style: { background: '#ecfdf5', fontWeight: 600 },
            }),
            render: (value) => formatQtyCell(value),
        },
        {
            title: 'B.Carat',
            dataIndex: 'balance_carat',
            key: 'balance_carat',
            width: 90,
            align: 'right',
            onHeaderCell: () => ({
                className: 'stone-balance-col',
                style: { background: '#ccfbf1', color: '#0f766e', fontWeight: 700 },
            }),
            onCell: () => ({
                className: 'stone-balance-col',
                style: { background: '#ecfdf5', fontWeight: 600 },
            }),
            render: (value) => formatQtyCell(value),
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            width: 90,
            align: 'right',
            render: (value) => formatQtyCell(value),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 100,
            align: 'right',
            render: (value) => formatQtyCell(value),
        },
        {
            title: 'Updated By',
            dataIndex: 'updated_by',
            key: 'updated_by',
            width: 130,
            ellipsis: true,
            render: (value, row) => {
                const name = String(value || row?.user_name || '').trim();
                if (name && name !== '—') return name;
                if (row?.user != null && String(row.user).trim() !== '') {
                    return `User #${row.user}`;
                }
                return '—';
            },
        },
    ];

    // Fixed min table width so zoom / narrow view scrolls instead of clipping columns
    const historyTableScrollX = historyColumns.reduce(
        (sum, col) => sum + (Number(col.width) || 120),
        0
    );

    const handleSearch = async () => {
        const skuValue = (searchForm.getFieldValue('searchSku') || '').trim();
        if (!skuValue) return;
        const companyId = (searchParams.get('companyId') || '').trim();
        setLoading(true);
        try {
            const params = { sku: skuValue };
            if (companyId) params.companyId = companyId;
            const res = await api.get(ENDPOINTS.report.stoneDetail, { params });
            const applied = await applyDetailResponse(res);
            if (!applied) {
                toastApiError({ response: { data: res.data } }, { id: `stone-history-err-${skuValue}` });
            }
        } catch (err) {
            toastApiError(err, { id: `stone-history-err-${skuValue}` });
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
        const companyId = (searchParams.get('companyId') || '').trim();
        searchForm.setFieldsValue({ searchSku: skuFromUrl });
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            try {
                const params = { sku: skuFromUrl };
                if (companyId) params.companyId = companyId;
                const res = await api.get(ENDPOINTS.report.stoneDetail, { params });
                if (cancelled) return;
                await applyDetailResponse(res);
            } catch (err) {
                // Deduplicate StrictMode double-mount toasts
                if (!cancelled) toastApiError(err, { id: `stone-history-err-${skuFromUrl}` });
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when URL sku/company changes
    }, [searchParams]);

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
        setStockSummary(null);
        setLineage(null);
        setActivityLogs([]);
        setHoldInfo(null);
        setHiddenImages({});
        setActiveTab('history');
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
                    {status ? (
                        <div className={styles.headerMeta}>
                            <span className={styles.headerMetaItem}>
                                <span className={styles.headerMetaLabel}>Status:</span>
                                <Tag color="blue" className={styles.headerStatusTag}>{status}</Tag>
                            </span>
                            {lastUpdated ? (
                                <span className={styles.headerMetaItem}>
                                    <span className={styles.headerMetaLabel}>Last Updated:</span>
                                    <span className={styles.headerMetaValue}>{lastUpdated}</span>
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </AdvancedFilterPanel>

            {showForm && (
                <div className={styles.sectionsWrap}>
                    <Card className={styles.detailsCard}>
                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            className={styles.detailTabs}
                            tabBarExtraContent={
                                activeTab === 'history' ? (
                                    <span className={styles.historyTabActions}>
                                        <Button
                                            size="small"
                                            icon={<History size={14} />}
                                            loading={oldLoading}
                                            onClick={handleLoadOld}
                                        >
                                            Load Old
                                        </Button>
                                        <ExportExcelButton
                                            size="small"
                                            loading={exporting}
                                            onClick={handleExport}
                                            disabled={!historyRows.length}
                                        />
                                    </span>
                                ) : null
                            }
                            items={[
                                {
                                    key: 'history',
                                    label: (
                                        <span className={styles.tabLabel}>
                                            <History size={14} />
                                            History
                                        </span>
                                    ),
                                    children: (
                                        <div className={styles.historyTabContent}>
                                            <StockReconciliationCard
                                                stockSummary={stockSummary}
                                                stoneDetail={stoneDetail}
                                                historyRows={historyRows}
                                            />
                                            <div className={styles.historyTableScroll}>
                                                <SkeletonAwareTable
                                                    columns={historyColumns}
                                                    dataSource={historyRows}
                                                    loading={loading}
                                                    size="small"
                                                    bordered
                                                    pagination={false}
                                                    tableLayout="fixed"
                                                    scroll={{ x: historyTableScrollX }}
                                                    rowClassName={historyRowClassName}
                                                />
                                            </div>
                                            {oldHistoryRows.length ? (
                                                <div className={styles.oldHistoryBlock}>
                                                    <div className={styles.tabSectionTitle}>
                                                        <History size={13} />
                                                        Old History
                                                    </div>
                                                    <div className={styles.historyTableScroll}>
                                                        <SkeletonAwareTable
                                                            columns={historyColumns}
                                                            dataSource={oldHistoryRows}
                                                            loading={oldLoading}
                                                            size="small"
                                                            bordered
                                                            pagination={false}
                                                            tableLayout="fixed"
                                                            scroll={{ x: historyTableScrollX }}
                                                            rowClassName={historyRowClassName}
                                                        />
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ),
                                },
                                {
                                    key: 'lineage',
                                    label: (
                                        <span className={styles.tabLabel}>
                                            <Network size={14} />
                                            Tree & Lineage
                                            {lineage?.has_lineage ? (
                                                <Tag color="cyan" style={{ fontSize: '10px', margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                                                    {lineage.children?.length ? `${lineage.children.length} stones` : 'Active'}
                                                </Tag>
                                            ) : null}
                                        </span>
                                    ),
                                    children: (
                                        <LineageTreePanel
                                            lineage={lineage}
                                            currentDetail={stoneDetail}
                                            onNavigateSku={(sku) => {
                                                searchForm.setFieldsValue({ searchSku: sku });
                                                navigate(`/report/stone-history?sku=${encodeURIComponent(sku)}${searchParams.get('companyId') ? `&companyId=${searchParams.get('companyId')}` : ''}`);
                                            }}
                                        />
                                    ),
                                },
                                {
                                    key: 'audit',
                                    label: (
                                        <span className={styles.tabLabel}>
                                            <ShieldCheck size={14} />
                                            Audit Trail
                                            {activityLogs.length ? (
                                                <Tag color="blue" style={{ fontSize: '10px', margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                                                    {activityLogs.length}
                                                </Tag>
                                            ) : null}
                                        </span>
                                    ),
                                    children: (
                                        <StoneAuditTrailPanel activityLogs={activityLogs} />
                                    ),
                                },
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
        </div>
    );
};

export default StoneHistory;
