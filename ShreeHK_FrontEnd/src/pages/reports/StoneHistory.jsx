import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Tag, Button, Switch, Tabs, Tooltip, Badge } from 'antd';
import { toastSuccess, toastError, toastWarning } from '../../utils/toastNotify';
import { ReloadOutlined } from '@ant-design/icons';
import {
    CircleDot, ScanText, History, BookOpen, Image,
    Pencil, ExternalLink, Link2, BadgeCheck, Tag as TagIcon,
    ShieldAlert, Award, Gem, Network, Info,
    CornerDownRight,
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
import LineageTreePanel from '../../components/report/LineageTreePanel';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';

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
    'hold', 'unhold', 'price_change', 'boxing', 'sku_change',
    'stone_update', 'remark_change',
]);

const isHistoryCredit = (row, isContainer = false) => {
    const action = String(row?.action || '').toLowerCase().trim();
    if (isContainer) {
        if (action === 'unboxing' || action === 'from_box' || action === 'from_parcel') return false;
        if (action === 'box_add' || action === 'to_box' || action === 'boxing' || action === 'parcel_add') return true;
    } else {
        if (action === 'unboxing' || action === 'from_box' || action === 'from_parcel') return true;
        if (action === 'box_add' || action === 'to_box' || action === 'boxing' || action === 'parcel_add') return false;
    }
    if (HISTORY_DEBIT_ACTIONS.has(action)) return false;
    if (HISTORY_CREDIT_ACTIONS.has(action)) return true;
    return String(row?.type || '').toLowerCase().trim() === 'cr';
};

/** History stores absolute pcs/carat + type cr|dr; UI shows signed movement. */
const signedQty = (row, field, isContainer = false) => {
    const n = Number(row?.[field]);
    if (!Number.isFinite(n)) return 0;
    const abs = Math.abs(n);
    return isHistoryCredit(row, isContainer) ? abs : -abs;
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

const renderInvoiceCell = (invoice, row, allRows, onJump) => {
    const value = String(invoice || '').trim();
    if (!value) return '—';
    const to = getInvoiceLinkForAction(row?.action, value);

    const hasRelatedRow = (allRows || []).some(
        (r) =>
            String(r.invoice || '').trim().toLowerCase() === value.toLowerCase() &&
            r.key !== row?.key
    ) || Boolean(row?.linked_memo);

    if (hasRelatedRow && onJump) {
        return (
            <div className={styles.invoiceCellWrap}>
                <button
                    type="button"
                    className={styles.invoiceLink}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        const directId = row?.linked_memo?.parent_row_id ? `h-${row.linked_memo.parent_row_id}` : null;
                        const targetInv = row?.linked_memo?.invoice || value;
                        onJump(targetInv, 'memo', row, directId);
                    }}
                    title={row?.linked_memo ? `Jump to parent Memo #${row.linked_memo.invoice}` : `Jump to related history entry for ${value}`}
                >
                    {value}
                </button>
                {to ? (
                    <Tooltip title="Open invoice page">
                        <Link
                            to={to}
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: 'inline-flex', alignItems: 'center', color: '#64748b', marginLeft: 4 }}
                        >
                            <ExternalLink size={11} />
                        </Link>
                    </Tooltip>
                ) : null}
            </div>
        );
    }

    return (
        <div className={styles.invoiceCellWrap}>
            {to ? (
                <Link
                    className={styles.invoiceLink}
                    to={to}
                    onClick={(e) => e.stopPropagation()}
                    title="Open related invoice"
                >
                    {value}
                </Link>
            ) : (
                <span className={styles.invoiceText}>{value}</span>
            )}
        </div>
    );
};

const NON_INVOICE_WORDS = new Set([
    '1pcs', '0pcs', '2pcs', '3pcs', '4pcs', '5pcs', 'pcs', 'ct', 'carat',
    'settled', 'left', 'return', 'returns', 'outward', 'inward', 'purchase',
    'import', 'sale', 'sold', 'party', 'original', 'active', 'pending',
    'memo', 'inv', 'invoice', 'ref'
]);

const isRealInvoiceIdentifier = (candidate, fullMatch, knownInvoices) => {
    if (!candidate) return false;
    const clean = candidate.trim().toLowerCase();
    if (!clean || NON_INVOICE_WORDS.has(clean)) return false;

    // Check if it exists in known history invoices
    if ((knownInvoices || []).some((k) => k.toLowerCase() === clean)) {
        return true;
    }

    // Check standard patterns like INV-3, MEMO-4, SALE-1
    if (/^(?:INV|MEMO|SALE)[-_]\d+/i.test(candidate)) {
        return true;
    }

    // Has digits and is preceded by REF, INVOICE, INV, MEMO followed by colon or hash (e.g. Ref: 10002, Memo #INV-3)
    if (/\d+/.test(candidate) && /^(?:REF|INVOICE|INV|MEMO)\s*[:#-]\s*[A-Za-z0-9_-]+/i.test(fullMatch)) {
        return true;
    }

    return false;
};

/**
 * Splits description text to convert references like "REF INV-4" or standalone invoice numbers
 * into clickable jump links that scroll directly to the matching memo/history row.
 */
const renderParsedDescriptionText = (text, row, knownInvoices, onJump) => {
    if (!text) return '—';

    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const sortedInvoices = [...(knownInvoices || [])].sort((a, b) => b.length - a.length);
    const invoicePattern = sortedInvoices.length
        ? `|\\b(?:${sortedInvoices.map(escapeRegExp).join('|')})\\b`
        : '';

    const regex = new RegExp(
        `(?:REF|INVOICE|INV|MEMO)\\s*[:#-]?\\s*([A-Za-z0-9_-]+)|\\b(INV-[A-Za-z0-9_-]+|MEMO-[A-Za-z0-9_-]+|SALE-[A-Za-z0-9_-]+)\\b${invoicePattern}`,
        'gi'
    );

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const matchStart = match.index;
        const matchEnd = regex.lastIndex;
        const fullMatch = match[0];
        const invCandidate = (
            match[1] ||
            match[2] ||
            fullMatch.replace(/^(?:REF|INVOICE|INV|MEMO)\s*[:#-]?\s*/i, '')
        ).trim();

        if (matchStart > lastIndex) {
            parts.push(text.slice(lastIndex, matchStart));
        }

        const isValidInvoice = isRealInvoiceIdentifier(invCandidate, fullMatch, knownInvoices);

        if (isValidInvoice && invCandidate && onJump) {
            const isMemoRef = /memo/i.test(fullMatch);
            const directTargetId =
                isMemoRef && row?.linked_memo?.parent_row_id
                    ? `h-${row.linked_memo.parent_row_id}`
                    : null;
            const targetInv =
                isMemoRef && row?.linked_memo?.invoice
                    ? row.linked_memo.invoice
                    : invCandidate;

            parts.push(
                <button
                    key={`jump-${matchStart}`}
                    type="button"
                    className={styles.historyJumpPill}
                    onClick={(e) => {
                        e.stopPropagation();
                        onJump(targetInv, 'memo', row, directTargetId);
                    }}
                    title={`Jump to history entry for ${targetInv}`}
                >
                    <span>{fullMatch}</span>
                    <CornerDownRight size={11} className={styles.historyJumpIcon} />
                </button>
            );
        } else {
            parts.push(fullMatch);
        }

        lastIndex = matchEnd;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length ? parts : text;
};

const extractDiffsFromText = (text) => {
    if (!text) return [];
    const t = String(text).trim();
    const diffs = [];

    const priceMatch = t.match(/old price\s*:\s*([\d.]+)\s*,\s*new price\s*:\s*([\d.]+)/i);
    if (priceMatch) {
        diffs.push({ field: 'Price', old: priceMatch[1], new: priceMatch[2] });
        return diffs;
    }

    const remarkMatch = t.match(/remark changed:\s*"([^"]*)"\s*→\s*"([^"]*)"/i);
    if (remarkMatch) {
        diffs.push({ field: 'Remark', old: remarkMatch[1] || '—', new: remarkMatch[2] || '—' });
        return diffs;
    }

    const clean = t.replace(/^stone detail updated:\s*/i, '');
    const regex = /([A-Za-z0-9_ ]+):\s*([^→;]+)\s*→\s*([^;]+)/g;
    let m;
    while ((m = regex.exec(clean)) !== null) {
        diffs.push({ field: m[1].trim(), old: m[2].trim(), new: m[3].trim() });
    }
    return diffs;
};

const renderDescriptionCell = (value, row, historyRows, oldHistoryRows, onJump, onSearchSku, currentSku) => {
    const text = String(value || '').trim();
    const a = String(row?.action || '').toLowerCase().trim();
    const isReturn = a === 'memo_return' || a === 'consign_return';

    const allRows = [...(historyRows || []), ...(oldHistoryRows || [])];
    const knownInvoices = Array.from(
        new Set(allRows.map((r) => String(r.invoice || '').trim()).filter(Boolean))
    );

    const ml = row?.memo_lifecycle;
    const lm = row?.linked_memo;
    const isInwardAdd = row?.is_inward_addition;
    const textHasSettlement = text.includes('[✓ Memo Settled') || text.includes('[⏳ Active Memo');
    const textHasParentMemo = lm && (text.includes(`Memo #${lm.invoice}`) || text.includes(`against Memo #${lm.invoice}`) || text.includes(`from Memo #${lm.invoice}`));
    const isParentMemoJumpable = Boolean(lm && onJump);

    const diffsToRender = (row?.diff_list && row.diff_list.length > 0)
        ? row.diff_list
        : extractDiffsFromText(text);

    const handleJumpToParentMemo = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (lm && onJump) {
            onJump(lm.invoice, 'memo', row, lm.parent_row_id ? `h-${lm.parent_row_id}` : null);
        }
    };

    return (
        <div
            className={`${styles.descCellWrap} ${isParentMemoJumpable ? styles.clickableDescCell : ''}`}
            title={isParentMemoJumpable ? `Click to jump to parent Memo #${lm.invoice}` : text}
            onClick={isParentMemoJumpable ? handleJumpToParentMemo : undefined}
        >
            <span className={`${styles.descText} ${isReturn ? styles.memoReturnDesc : ''}`}>
                {isInwardAdd && (
                    <Tag color="geekblue" className={styles.inwardAddTag}>
                        + Stock Addition
                    </Tag>
                )}
                {renderParsedDescriptionText(text, row, knownInvoices, onJump)}
            </span>

            {/* Old vs New visual diff badges if attributes changed */}
            {diffsToRender.length > 0 && (
                <span className={styles.diffBadgesWrap}>
                    {diffsToRender.map((d, dIdx) => (
                        <span key={dIdx} className={styles.diffItem}>
                            <strong style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase' }}>
                                {String(d.field || '').toUpperCase()}:
                            </strong>
                            <Tag color="error" style={{ textDecoration: 'line-through', margin: 0, padding: '0 4px', fontSize: 10, lineHeight: '16px' }}>
                                {String(d.old != null && d.old !== '' ? d.old : '—')}
                            </Tag>
                            <span style={{ color: '#64748b', fontSize: 10, fontWeight: 'bold' }}>→</span>
                            <Tag color="success" style={{ margin: 0, padding: '0 4px', fontSize: 10, fontWeight: 700, lineHeight: '16px' }}>
                                {String(d.new != null && d.new !== '' ? d.new : '—')}
                            </Tag>
                        </span>
                    ))}
                </span>
            )}

            {/* If this is a Memo row, show linked return/sale jump pills cleanly without duplicate settlement tag */}
            {ml && (
                <span className={styles.memoLifecycleWrap}>
                    {!textHasSettlement && (
                        ml.status === 'OPEN' ? (
                            <Tag color="warning" className={styles.memoStatusTag}>
                                ⏳ Active Memo: {ml.pending_carat} ct Pending
                            </Tag>
                        ) : (
                            <Tag color="success" className={styles.memoStatusTag}>
                                ✓ Memo Settled
                            </Tag>
                        )
                    )}

                    {ml.linked_returns?.map((ret) => (
                        <button
                            key={`ret-${ret.id}`}
                            type="button"
                            className={styles.historyJumpPill}
                            onClick={(e) => {
                                e.stopPropagation();
                                onJump(ret.invoice, 'memo_return', row, `h-${ret.id}`);
                            }}
                            title={`Jump to Return row (${ret.carat} ct)`}
                        >
                            <span>↳ Ret: {ret.carat} ct</span>
                            <CornerDownRight size={10} className={styles.historyJumpIcon} />
                        </button>
                    ))}

                    {ml.linked_sales?.map((sale) => (
                        <button
                            key={`sale-${sale.id}`}
                            type="button"
                            className={styles.historyJumpPill}
                            onClick={(e) => {
                                e.stopPropagation();
                                onJump(sale.invoice, 'sale', row, `h-${sale.id}`);
                            }}
                            title={`Jump to Sale row (${sale.carat} ct)`}
                        >
                            <span>↳ Sale: {sale.carat} ct</span>
                            <CornerDownRight size={10} className={styles.historyJumpIcon} />
                        </button>
                    ))}
                </span>
            )}

            {/* If this is a Return or Sale row linked to a parent memo, show jump pill ONLY if not already linked in text */}
            {lm && !textHasParentMemo && (
                <span className={styles.memoLifecycleWrap}>
                    <button
                        type="button"
                        className={styles.historyJumpPill}
                        onClick={handleJumpToParentMemo}
                        title={`Jump to parent Memo #${lm.invoice} (Original: ${lm.total_memo_carat} ct)`}
                    >
                        <span>↰ Memo #{lm.invoice} ({lm.total_memo_carat} ct)</span>
                        <CornerDownRight size={10} className={styles.historyJumpIcon} />
                    </button>
                    {lm.status === 'OPEN' ? (
                        <Tag color="warning" className={styles.memoStatusTagSm}>
                            ⏳ {lm.pending_carat} ct Left
                        </Tag>
                    ) : (
                        <Tag color="success" className={styles.memoStatusTagSm}>
                            ✓ Settled
                        </Tag>
                    )}
                </span>
            )}

            {/* Box / Container movement pill */}
            {(() => {
                if (!onSearchSku) return null;
                const isBoxAction = ['unboxing', 'boxing', 'to_box', 'from_box', 'box_add', 'parcel_add', 'from_parcel'].includes(a);
                if (!isBoxAction) return null;

                let targetSku = '';
                let label = '';
                const parensMatch = text.match(/\(([A-Za-z0-9_-]{3,})\)/);
                const fromToMatch = text.match(/(?:from|to)\s+(?:box|parcel)\s+([A-Za-z0-9_-]+)/i);

                if (parensMatch && parensMatch[1] && parensMatch[1] !== currentSku) {
                    targetSku = parensMatch[1];
                    label = `↰ View Stone ${targetSku}`;
                } else if (fromToMatch && fromToMatch[1] && fromToMatch[1] !== currentSku) {
                    targetSku = fromToMatch[1];
                    label = `↰ View Container ${targetSku}`;
                } else if (row?.sku && row.sku !== currentSku) {
                    targetSku = row.sku;
                    label = `↰ View SKU ${targetSku}`;
                }

                if (!targetSku) return null;

                return (
                    <span className={styles.memoLifecycleWrap}>
                        <button
                            type="button"
                            className={styles.historyJumpPill}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSearchSku(targetSku);
                            }}
                            title={`Search & view history for ${targetSku}`}
                            style={{ borderColor: '#93c5fd', color: '#1d4ed8', background: '#eff6ff' }}
                        >
                            <span>{label}</span>
                            <CornerDownRight size={10} className={styles.historyJumpIcon} />
                        </button>
                    </span>
                );
            })()}
        </div>
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

const ExtraMetric = ({ value, label }) => {
    const isPriceOrAmount = typeof label === 'string' && (label.includes('Price') || label.includes('Amount'));
    return (
        <div className={styles.metric}>
            <span className={styles.metricValue} style={isPriceOrAmount ? { color: '#16A34A', fontWeight: 600 } : undefined}>
                {value}
            </span>
            <span className={styles.metricLabel}>{label}</span>
        </div>
    );
};

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

const ChangeHistoryPanel = ({ logs, currentSku, loading }) => {
    const relevantLogs = (logs || []).filter(
        (l) => l.action_type !== 'API_READ' && l.action_type !== 'LOGIN'
    );

    const changeColumns = [
        {
            title: '#',
            key: 'idx',
            width: 45,
            align: 'center',
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Date & Time',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 170,
            render: (val, row) => (
                <span style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {row.created_at_display || formatHistoryDateTime({ date: val })}
                </span>
            ),
        },
        {
            title: 'Action / Module',
            key: 'action_module',
            width: 160,
            render: (_, row) => {
                const mod = String(row.module_name || row.action || '').trim();
                let color = 'default';
                const lower = mod.toLowerCase();
                if (lower.includes('update') || lower === 'stone_update') color = 'cyan';
                else if (lower.includes('price')) color = 'gold';
                else if (lower.includes('hold')) color = lower.includes('unhold') ? 'green' : 'volcano';
                else if (lower.includes('remark')) color = 'purple';
                else if (lower.includes('box') || lower.includes('parcel')) color = 'geekblue';
                else if (lower.includes('stock')) color = 'blue';

                return (
                    <Tag color={color} style={{ fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                        {mod || row.action_type || 'Update'}
                    </Tag>
                );
            },
        },
        {
            title: 'Changed By',
            key: 'changed_by',
            width: 150,
            render: (_, row) => (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                        {row.user_name || 'superadmin'}
                    </span>
                    {row.user_role && (
                        <Tag color="geekblue" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>
                            {row.user_role}
                        </Tag>
                    )}
                </div>
            ),
        },
        {
            title: 'Field(s) Changed',
            key: 'fields_changed',
            width: 160,
            render: (_, row) => {
                if (row.diff_list && row.diff_list.length > 0) {
                    return (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {row.diff_list.map((d, i) => (
                                <Tag key={i} color="blue" style={{ fontSize: 10, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>
                                    {d.field}
                                </Tag>
                            ))}
                        </div>
                    );
                }
                const rawFields = row.changed_fields;
                if (Array.isArray(rawFields) && rawFields.length > 0) {
                    return (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {rawFields.map((f, i) => (
                                <Tag key={i} color="blue" style={{ fontSize: 10, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>
                                    {f}
                                </Tag>
                            ))}
                        </div>
                    );
                }
                return <span style={{ color: '#94a3b8' }}>—</span>;
            },
        },
        {
            title: 'Old Value vs New Value (Changes)',
            key: 'changes_diff',
            width: 340,
            render: (_, row) => {
                const diffs = row.diff_list || [];
                if (diffs.length > 0) {
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {diffs.map((d, i) => (
                                <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', minWidth: 65, textTransform: 'uppercase' }}>
                                        {d.field}:
                                    </span>
                                    <Tag color="error" style={{ textDecoration: 'line-through', margin: 0, fontSize: 11, padding: '0 6px' }}>
                                        {String(d.old != null && d.old !== '' ? d.old : '—')}
                                    </Tag>
                                    <span style={{ color: '#64748b', fontWeight: 'bold' }}>→</span>
                                    <Tag color="success" style={{ margin: 0, fontSize: 11, fontWeight: 700, padding: '0 6px' }}>
                                        {String(d.new != null && d.new !== '' ? d.new : '—')}
                                    </Tag>
                                </div>
                            ))}
                        </div>
                    );
                }
                return (
                    <span style={{ color: '#64748b', fontSize: 12 }}>
                        {row.description || 'Action recorded'}
                    </span>
                );
            },
        },
        {
            title: 'Activity Description & Notes',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
            render: (val) => (
                <span style={{ color: '#334155', fontSize: 12 }}>
                    {val || '—'}
                </span>
            ),
        },
    ];

    if (!relevantLogs.length) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <History size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <div style={{ fontWeight: 600, fontSize: 14 }}>No specification or property changes recorded yet.</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Any stone specification edit, price change, hold, or unboxing will appear here with full Old vs New audit details.</div>
            </div>
        );
    }

    return (
        <div className={styles.changeHistorySection}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1f5f9', padding: '8px 14px', borderRadius: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                    Complete Change & Specification Audit History ({relevantLogs.length} record{relevantLogs.length > 1 ? 's' : ''})
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                    Showing all attribute updates, unboxing, boxing, price edits, and status changes for <strong>{currentSku}</strong>
                </span>
            </div>
            <SkeletonAwareTable
                loading={loading}
                columns={changeColumns}
                dataSource={relevantLogs.map((l, i) => ({ ...l, key: l.id ? `change-${l.id}` : `change-${i}` }))}
                rowKey="key"
                pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '25', '50'] }}
                size="middle"
                scroll={{ x: 'max-content' }}
            />
        </div>
    );
};

const StoneHistory = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [showForm, setShowForm] = useState(true);
    const [activeTab, setActiveTab] = useState('history');
    const [historyRows, setHistoryRows] = useState([]);
    const [oldHistoryRows, setOldHistoryRows] = useState([]);
    const [highlightedRowKey, setHighlightedRowKey] = useState(null);
    const highlightTimerRef = React.useRef(null);
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
    const tableRef = React.useRef(null);
    const tableScrollY = useTableBodyScrollHeight(tableRef, [
        historyRows.length,
        oldHistoryRows.length,
        loading,
        stockSummary,
        activeTab,
    ]);

    const fetchOldHistoryData = async (skuValue, detailObj, showToast = false) => {
        if (!skuValue) return [];
        setOldLoading(true);
        try {
            const res = await api.get(ENDPOINTS.report.stoneDetailOld, { params: { sku: skuValue } });
            const history = res.data?.history || [];
            const basePrice = Number(detailObj?.price) || Number(detailObj?.purchase_price) || 0;
            const baseCarat = Number(detailObj?.polish_carat) || 0;
            let lastPrice = basePrice;
            let lastAmount = Number(detailObj?.amount) || Number((basePrice * baseCarat).toFixed(2)) || 0;

            const resolvedOld = history.map((h, i) => {
                if (h.price != null && h.price !== '' && Number(h.price) > 0) {
                    lastPrice = Number(h.price);
                }
                const rowPrice = h.price != null && h.price !== '' && Number(h.price) > 0
                    ? Number(h.price)
                    : (lastPrice > 0 ? lastPrice : (basePrice > 0 ? basePrice : null));

                let rowAmount = h.amount != null && h.amount !== '' && Number(h.amount) > 0
                    ? Number(h.amount)
                    : null;
                if (rowAmount == null || rowAmount === 0) {
                    const c = Number(h.balance_carat || h.carat || baseCarat || 0);
                    if (c > 0 && rowPrice > 0) {
                        rowAmount = Number((c * rowPrice).toFixed(2));
                    } else if (lastAmount > 0) {
                        rowAmount = lastAmount;
                    } else if (detailObj?.amount) {
                        rowAmount = Number(detailObj.amount);
                    }
                } else {
                    lastAmount = rowAmount;
                }

                return {
                    ...h,
                    price: rowPrice > 0 ? rowPrice : h.price,
                    amount: rowAmount > 0 ? rowAmount : h.amount,
                    key: h.id != null ? `old-${h.id}` : `old-${i}`,
                };
            });
            setOldHistoryRows(resolvedOld);
            if (showToast) {
                if (!history.length) {
                    toastWarning('No old history found for this SKU.');
                } else {
                    toastSuccess(`Loaded ${history.length} old history row(s) into table`);
                }
            }
            return resolvedOld;
        } catch (err) {
            if (showToast) toastApiError(err);
            return [];
        } finally {
            setOldLoading(false);
        }
    };

    const applyDetailResponse = async (res) => {
        const { detail, history, status: st, stock_summary, lineage: lin, activity_logs } = res.data || {};
        if (!detail) return false;
        form.setFieldsValue(mapDetailToForm(detail));
        setStoneDetail(detail);
        setHistoryRows((history || []).map((h, i) => ({ ...h, key: h.id != null ? `h-${h.id}` : `h-${i}` })));
        setOldHistoryRows([]);
        setHighlightedRowKey(null);
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
        if (detail?.sku) {
            fetchOldHistoryData(detail.sku, detail, false);
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
        if (a === 'memo_return' || a === 'consign_return' || a.includes('import')) return 'cyan';
        if (a === 'purchase') return 'purple';
        if (a === 'sale_return' || a === 'lab_return' || a === 'purchase_return' || a === 'sale') return 'green';
        if (a === 'memo') return 'orange';
        if (a === 'consign') return 'magenta';
        if (a === 'export') return 'blue';
        if (a === 'lab') return 'blue';
        if (a.includes('transfer')) return 'geekblue';
        if (a === 'unboxing' || a === 'from_box' || a === 'from_parcel') return 'volcano';
        if (a === 'boxing' || a === 'to_box' || a === 'box_add' || a === 'parcel_add') return 'geekblue';
        if (a === 'stone_update') return 'cyan';
        if (a === 'remark_change') return 'purple';
        if (a === 'price_change') return 'gold';
        if (a === 'hold') return 'volcano';
        if (a === 'unhold') return 'green';
        return 'default';
    };

    const handleJumpToRow = (targetKey, invLabel) => {
        if (!targetKey) return;
        if (activeTab !== 'history') {
            setActiveTab('history');
        }
        setHighlightedRowKey(targetKey);
        if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
        }
        highlightTimerRef.current = setTimeout(() => {
            setHighlightedRowKey(null);
        }, 3800);

        requestAnimationFrame(() => {
            setTimeout(() => {
                const el =
                    document.querySelector(`[data-history-row-key="${targetKey}"]`) ||
                    document.getElementById(`stone-history-row-${targetKey}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                    const tableBody = el.closest('.ant-table-body') || document.querySelector('.ant-table-body');
                    if (tableBody) {
                        const rowTop = el.offsetTop;
                        const targetScroll = Math.max(0, rowTop - (tableBody.clientHeight / 2) + (el.clientHeight / 2));
                        tableBody.scrollTo({ top: targetScroll, behavior: 'smooth' });
                    }
                }
            }, 60);
        });
    };

    const findTargetRow = (invoice, preferredAction, sourceRow) => {
        const inv = String(invoice || '').trim();
        const allRows = [...(historyRows || []), ...(oldHistoryRows || [])];
        if (!allRows.length) return null;

        // Direct parent memo check if sourceRow has linked_memo
        if (sourceRow?.linked_memo) {
            if (sourceRow.linked_memo.parent_row_id) {
                const directKey = `h-${sourceRow.linked_memo.parent_row_id}`;
                const m = allRows.find((r) => r.key === directKey);
                if (m) return m;
            }
            if (sourceRow.linked_memo.invoice) {
                const memoInv = String(sourceRow.linked_memo.invoice).trim().toLowerCase();
                const m = allRows.find(
                    (r) =>
                        String(r.invoice || '').trim().toLowerCase() === memoInv &&
                        ['memo', 'consign', 'in_memo', 'in_consign'].includes(String(r.action || '').toLowerCase().trim())
                );
                if (m) return m;
            }
        }

        // 1. If preferredAction is specified (e.g. 'memo'), look for that first
        if (preferredAction && inv) {
            const prefMatch = allRows.find(
                (r) =>
                    String(r.invoice || '').trim().toLowerCase() === inv.toLowerCase() &&
                    String(r.action || '').toLowerCase().trim() === preferredAction.toLowerCase() &&
                    r.key !== sourceRow?.key
            );
            if (prefMatch) return prefMatch;
        }

        // 2. If source row is a return or sale from memo, prefer the parent memo/consign
        const sourceAction = String(sourceRow?.action || '').toLowerCase().trim();
        if (
            sourceAction === 'memo_return' ||
            sourceAction === 'consign_return' ||
            sourceAction === 'sale' ||
            sourceAction === 'export' ||
            sourceAction === 'close_memo' ||
            sourceAction === 'memo_close'
        ) {
            if (inv) {
                const memoMatch = allRows.find(
                    (r) =>
                        String(r.invoice || '').trim().toLowerCase() === inv.toLowerCase() &&
                        ['memo', 'consign', 'in_memo', 'in_consign'].includes(
                            String(r.action || '').toLowerCase().trim()
                        ) &&
                        r.key !== sourceRow?.key
                );
                if (memoMatch) return memoMatch;
            }

            // Fallback for sale from memo: match memo row for the same party
            const party = String(sourceRow?.party_name || sourceRow?.party || '').trim().toLowerCase();
            if (party) {
                const partyMemo = allRows.find(
                    (r) =>
                        String(r.party_name || r.party || '').trim().toLowerCase() === party &&
                        ['memo', 'consign', 'in_memo', 'in_consign'].includes(String(r.action || '').toLowerCase().trim()) &&
                        r.key !== sourceRow?.key
                );
                if (partyMemo) return partyMemo;
            }
        }

        // 3. If source row is a lab_return, prefer the parent lab
        if (sourceAction === 'lab_return' || sourceAction === 'close_lab') {
            const labMatch = allRows.find(
                (r) =>
                    String(r.invoice || '').trim().toLowerCase() === inv.toLowerCase() &&
                    String(r.action || '').toLowerCase().trim() === 'lab' &&
                    r.key !== sourceRow?.key
            );
            if (labMatch) return labMatch;
        }

        // 4. If source row is a purchase_return, prefer purchase
        if (sourceAction === 'purchase_return') {
            const purchMatch = allRows.find(
                (r) =>
                    String(r.invoice || '').trim().toLowerCase() === inv.toLowerCase() &&
                    ['purchase', 'import', 'in_import'].includes(
                        String(r.action || '').toLowerCase().trim()
                    ) &&
                    r.key !== sourceRow?.key
            );
            if (purchMatch) return purchMatch;
        }

        // 5. If source row is a parent memo, prefer return or sale
        if (sourceAction === 'memo' || sourceAction === 'consign') {
            const childMatch = allRows.find(
                (r) =>
                    String(r.invoice || '').trim().toLowerCase() === inv.toLowerCase() &&
                    ['memo_return', 'consign_return', 'sale', 'export'].includes(
                        String(r.action || '').toLowerCase().trim()
                    ) &&
                    r.key !== sourceRow?.key
            );
            if (childMatch) return childMatch;
        }

        // 6. Otherwise find any other row with this invoice
        const anyOtherMatch = allRows.find(
            (r) =>
                String(r.invoice || '').trim().toLowerCase() === inv.toLowerCase() &&
                r.key !== sourceRow?.key
        );
        if (anyOtherMatch) return anyOtherMatch;

        // 7. Fallback: match any row with that invoice
        return (
            allRows.find(
                (r) => String(r.invoice || '').trim().toLowerCase() === inv.toLowerCase()
            ) || null
        );
    };

    const handleJumpToInvoice = (invoice, preferredAction, sourceRow, directKey) => {
        if (directKey) {
            handleJumpToRow(directKey, invoice);
            return;
        }
        const target = findTargetRow(invoice, preferredAction, sourceRow);
        if (target) {
            handleJumpToRow(target.key, invoice);
        } else {
            toastWarning(`No corresponding history record found for invoice ${invoice}`);
        }
    };

    const historyRowClassName = (row) => {
        if (row?.isOldHistoryHeader) {
            return styles.oldHistoryHeaderRow;
        }
        const classes = [];
        if (highlightedRowKey === row.key) {
            classes.push('stone-row-highlighted', styles.rowHighlighted);
        }
        if (row?.key && String(row.key).startsWith('old-')) {
            classes.push(styles.oldHistoryRow);
        }
        if (row?.is_from_memo) classes.push(styles.rowFromMemo);
        const a = String(row?.action || '').toLowerCase().trim();
        if (a === 'memo_return' || a === 'consign_return') {
            classes.push(
                row?.is_partial_memo_return
                    ? 'stone-row-memo-return-partial'
                    : 'stone-row-memo-return'
            );
        } else if (a === 'memo' || a === 'consign') {
            classes.push('stone-row-memo-out');
        }
        return classes.join(' ');
    };

    const isContainer = stoneDetail?.group_type === 'box' || stoneDetail?.group_type === 'parcel' || Boolean(stoneDetail?.is_container);

    const handleSearchSku = (targetSku) => {
        if (!targetSku) return;
        searchForm.setFieldsValue({ searchSku: targetSku });
        const companyId = (searchParams.get('companyId') || '').trim();
        navigate(`/report/stone-history?sku=${encodeURIComponent(targetSku)}${companyId ? `&companyId=${encodeURIComponent(companyId)}` : ''}`);
    };

    const historyColumns = [
        {
            title: 'Action',
            dataIndex: 'action_label',
            key: 'action',
            width: 140,
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
            width: 200,
            render: (_, row) => (
                <span style={{ whiteSpace: 'nowrap' }}>{formatHistoryDateTime(row)}</span>
            ),
        },
        {
            title: 'Party',
            dataIndex: 'party_name',
            key: 'party',
            width: 320,
            ellipsis: true,
            render: (value, row) => {
                const name = String(value || row.party || '').trim();
                return <span style={{ whiteSpace: 'nowrap' }}>{name || '—'}</span>;
            },
        },
        {
            title: 'Invoice',
            dataIndex: 'invoice',
            key: 'invoice',
            width: 140,
            render: (value, row) =>
                renderInvoiceCell(
                    value,
                    row,
                    [...historyRows, ...oldHistoryRows],
                    handleJumpToInvoice
                ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            width: 800,
            render: (value, row) =>
                renderDescriptionCell(
                    value,
                    row,
                    historyRows,
                    oldHistoryRows,
                    handleJumpToInvoice,
                    handleSearchSku,
                    stoneDetail?.sku
                ),
        },
        {
            title: 'Pcs',
            dataIndex: 'pcs',
            key: 'pcs',
            width: 70,
            align: 'right',
            render: (_, row) => formatQtyCell(signedQty(row, 'pcs', isContainer)),
        },
        {
            title: 'Carat',
            dataIndex: 'carat',
            key: 'carat',
            width: 95,
            align: 'right',
            render: (_, row) => {
                const val = formatQtyCell(signedQty(row, 'carat', isContainer));
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
            render: (value) => {
                const formatted = formatQtyCell(value);
                if (formatted === '—') return formatted;
                return (
                    <span style={{ color: '#16A34A', fontWeight: 600 }}>
                        {formatted}
                    </span>
                );
            },
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 100,
            align: 'right',
            render: (value) => {
                const formatted = formatQtyCell(value);
                if (formatted === '—') return formatted;
                return (
                    <span style={{ color: '#16A34A', fontWeight: 600 }}>
                        {formatted}
                    </span>
                );
            },
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

    const displayedHistoryRows = React.useMemo(() => {
        if (!oldHistoryRows || !oldHistoryRows.length) return historyRows;
        return [
            ...historyRows,
            {
                key: '__old_history_section_header__',
                isOldHistoryHeader: true,
            },
            ...oldHistoryRows,
        ];
    }, [historyRows, oldHistoryRows]);

    const finalHistoryColumns = React.useMemo(() => {
        return historyColumns.map((col, idx) => {
            const origOnCell = col.onCell;
            const origRender = col.render;

            if (idx === 0) {
                return {
                    ...col,
                    onCell: (record) => {
                        if (record?.isOldHistoryHeader) {
                            return {
                                colSpan: historyColumns.length,
                                className: styles.oldHistoryHeaderCellTd,
                            };
                        }
                        return origOnCell ? origOnCell(record) : {};
                    },
                    render: (val, record, rIdx) => {
                        if (record?.isOldHistoryHeader) {
                            return (
                                <div className={styles.tableSectionDivider}>
                                    <div className={styles.tableSectionDividerLeft}>
                                        <History size={15} className={styles.tableSectionDividerIcon} />
                                        <span className={styles.tableSectionDividerTitle}>Old History</span>
                                        <Tag color="blue" className={styles.tableSectionDividerTag}>
                                            Previous Financial Years ({oldHistoryRows.length} records)
                                        </Tag>
                                    </div>
                                    <span className={styles.tableSectionDividerDesc}>
                                        Historical records prior to current financial year
                                    </span>
                                </div>
                            );
                        }
                        return origRender ? origRender(val, record, rIdx) : val;
                    },
                };
            }

            return {
                ...col,
                onCell: (record) => {
                    if (record?.isOldHistoryHeader) {
                        return { colSpan: 0 };
                    }
                    return origOnCell ? origOnCell(record) : {};
                },
                render: (val, record, rIdx) => {
                    if (record?.isOldHistoryHeader) {
                        return null;
                    }
                    return origRender ? origRender(val, record, rIdx) : val;
                },
            };
        });
    }, [historyColumns, oldHistoryRows.length]);

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
        if (!historyRows.length && !oldHistoryRows.length) {
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
                rows: [...historyRows, ...oldHistoryRows].map((row) => ({
                    ...row,
                    date: formatHistoryDate(row),
                    date_display: formatHistoryDateTime(row),
                    pcs: signedQty(row, 'pcs', isContainer),
                    carat: signedQty(row, 'carat', isContainer),
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
        await fetchOldHistoryData(skuValue, stoneDetail, true);
    };

    const handleReset = () => {
        searchForm.resetFields();
        resetAll();
        setHistoryRows([]);
        setOldHistoryRows([]);
        setHighlightedRowKey(null);
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        setStatus('');
        setLastUpdated('');
        setStoneDetail(null);
        setStockSummary(null);
        setLineage(null);
        setActivityLogs([]);
        setHoldInfo(null);
        setHiddenImages({});
        setActiveTab('history');
        setShowForm(true);
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
                                            {oldHistoryRows.length ? `Reload Old (${oldHistoryRows.length})` : 'Load Old'}
                                        </Button>
                                        <ExportExcelButton
                                            size="small"
                                            loading={exporting}
                                            onClick={handleExport}
                                            disabled={!historyRows.length && !oldHistoryRows.length}
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
                                            {(historyRows.length > 0 || oldHistoryRows.length > 0) && (
                                                <Badge
                                                    count={historyRows.length + oldHistoryRows.length}
                                                    style={{ backgroundColor: '#0284c7', marginLeft: 4 }}
                                                />
                                            )}
                                        </span>
                                    ),
                                    children: (
                                        <div className={styles.historyTabContent}>
                                            {stockSummary && (
                                                <div className={styles.stockSummaryContainer}>
                                                    <div className={styles.summaryCardsGrid}>
                                                        <div className={styles.summaryKpiCard}>
                                                            <div className={styles.summaryKpiHeader}>
                                                                <span className={styles.summaryKpiLabel}>Total Inward</span>
                                                                <Tag color="blue" style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}>
                                                                    Purchase / Import
                                                                </Tag>
                                                            </div>
                                                            <div className={styles.summaryKpiValue}>
                                                                {formatQtyCell(stockSummary.total_inward_carat || stockSummary.initial_carat)} ct
                                                            </div>
                                                            <div className={styles.summaryKpiSub}>
                                                                <span>{stockSummary.total_inward_pcs || stockSummary.initial_pcs} pcs</span>
                                                                {stockSummary.additional_inward_carat > 0 && (
                                                                    <Tag color="cyan" style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}>
                                                                        Initial {stockSummary.initial_carat} ct + {stockSummary.additional_inward_carat} ct add
                                                                    </Tag>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className={styles.summaryKpiCard}>
                                                            <div className={styles.summaryKpiHeader}>
                                                                <span className={styles.summaryKpiLabel}>On-Hand Stock</span>
                                                                <Tag color="success" style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}>
                                                                    In Office / Safe
                                                                </Tag>
                                                            </div>
                                                            <div className={styles.summaryKpiValue} style={{ color: '#16a34a' }}>
                                                                {formatQtyCell(stockSummary.onhand_carat)} ct
                                                            </div>
                                                            <div className={styles.summaryKpiSub}>
                                                                <span>{stockSummary.onhand_pcs} pcs available for sale</span>
                                                            </div>
                                                        </div>

                                                        <div className={styles.summaryKpiCard}>
                                                            <div className={styles.summaryKpiHeader}>
                                                                <span className={styles.summaryKpiLabel}>Pending on Memo</span>
                                                                {stockSummary.open_memo_carat > 0 ? (
                                                                    <Tag color="warning" style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}>
                                                                        {stockSummary.active_memos?.length || 1} Active Memo
                                                                    </Tag>
                                                                ) : (
                                                                    <Tag color="default" style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}>
                                                                        None Pending
                                                                    </Tag>
                                                                )}
                                                            </div>
                                                            <div className={styles.summaryKpiValue} style={{ color: stockSummary.open_memo_carat > 0 ? '#d97706' : 'inherit' }}>
                                                                {formatQtyCell(stockSummary.open_memo_carat)} ct
                                                            </div>
                                                            <div className={styles.summaryKpiSub}>
                                                                <span>{stockSummary.open_memo_pcs || 0} pcs with party</span>
                                                            </div>
                                                        </div>

                                                        <div className={styles.summaryKpiCard}>
                                                            <div className={styles.summaryKpiHeader}>
                                                                <span className={styles.summaryKpiLabel}>Total Sold</span>
                                                                <Tag color="purple" style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}>
                                                                    Completed Sales
                                                                </Tag>
                                                            </div>
                                                            <div className={styles.summaryKpiValue}>
                                                                {formatQtyCell(stockSummary.total_sold_carat != null ? stockSummary.total_sold_carat : stockSummary.sold_from_memo_carat)} ct
                                                            </div>
                                                            <div className={styles.summaryKpiSub}>
                                                                <span>
                                                                    {stockSummary.sold_from_memo_carat > 0
                                                                        ? `From Memo: ${stockSummary.sold_from_memo_carat} ct`
                                                                        : 'Direct Sale'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={tableRef} className={styles.historyTableScroll}>
                                                <SkeletonAwareTable
                                                    columns={finalHistoryColumns}
                                                    dataSource={displayedHistoryRows}
                                                    loading={loading}
                                                    size="small"
                                                    bordered
                                                    pagination={false}
                                                    tableLayout="fixed"
                                                    scroll={{ x: historyTableScrollX, y: tableScrollY }}
                                                    rowClassName={historyRowClassName}
                                                    rowKey="key"
                                                    onRow={(record) => ({
                                                        id: `stone-history-row-${record.key}`,
                                                        'data-history-row-key': record.key,
                                                        'data-invoice': record.invoice || '',
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'change_history',
                                    label: (
                                        <span className={styles.tabLabel}>
                                            <History size={14} />
                                            Change History (Old vs New)
                                            {(activityLogs || []).filter((l) => l.action_type !== 'API_READ' && l.action_type !== 'LOGIN').length > 0 && (
                                                <Badge
                                                    count={(activityLogs || []).filter((l) => l.action_type !== 'API_READ' && l.action_type !== 'LOGIN').length}
                                                    style={{ backgroundColor: '#0284c7', marginLeft: 4 }}
                                                />
                                            )}
                                        </span>
                                    ),
                                    children: (
                                        <ChangeHistoryPanel
                                            logs={activityLogs}
                                            currentSku={stoneDetail?.sku}
                                            loading={loading}
                                        />
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
