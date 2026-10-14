import React from 'react';
import { Tag, Tooltip } from 'antd';
import {
    Gem, Info, AlertTriangle, TrendingDown, TrendingUp, CheckCircle2,
    ArrowRight, ShoppingBag, FileSpreadsheet, RefreshCw
} from 'lucide-react';
import styles from '../../assets/scss/pages/report/stoneHistory.module.scss';

const formatNum = (val, dp = 3) => {
    if (val == null || val === '') return '0';
    const n = Number(val);
    if (!Number.isFinite(n)) return String(val);
    if (Number.isInteger(n)) return String(n);
    return String(Number(n.toFixed(dp)));
};

const StockReconciliationCard = ({ stockSummary, stoneDetail, historyRows }) => {
    if (!stockSummary && (!historyRows || historyRows.length === 0)) return null;

    const initialCarat = stockSummary?.initial_carat ?? (stoneDetail?.purchase_carat || stoneDetail?.polish_carat || 0);
    const initialPcs = stockSummary?.initial_pcs ?? (stoneDetail?.purchase_pcs || stoneDetail?.polish_pcs || 1);
    const memoOutCarat = stockSummary?.memo_out_carat ?? 0;
    const memoReturnCarat = stockSummary?.memo_return_carat ?? 0;
    const soldFromMemoCarat = stockSummary?.sold_from_memo_carat ?? 0;
    const directSoldCarat = stockSummary?.direct_sold_carat ?? 0;
    const onhandCarat = stockSummary?.onhand_carat ?? (stoneDetail?.polish_carat || 0);
    const onhandPcs = stockSummary?.onhand_pcs ?? (stoneDetail?.polish_pcs || 0);
    const hasMemoSale = Boolean(stockSummary?.has_from_memo_sale || soldFromMemoCarat > 0);

    return (
        <div className={styles.stockReconciliationWrap}>
            <div className={styles.reconciliationHeader}>
                <div className={styles.reconciliationTitleWrap}>
                    <div className={styles.reconciliationIconBadge}>
                        <Gem size={16} />
                    </div>
                    <div>
                        <div className={styles.reconciliationTitle}>
                            Diamond Stock Flow & Balance Reconciliation
                        </div>
                        <div className={styles.reconciliationSubtitle}>
                            Transparent audit of initial stone inward, open/returned memos, and converted sales.
                        </div>
                    </div>
                </div>
                {hasMemoSale ? (
                    <div className={styles.badgeMemoConverted}>
                        <CheckCircle2 size={13} />
                        <span>Memo Sale Converted</span>
                    </div>
                ) : null}
            </div>

            {/* Pipeline Step Metrics */}
            <div className={styles.reconciliationGrid}>
                {/* 1. Initial Inward */}
                <div className={`${styles.flowStepCard} ${styles.flowStepInitial}`}>
                    <div className={styles.flowStepLabel}>
                        <FileSpreadsheet size={13} />
                        <span>1. Initial Inward</span>
                    </div>
                    <div className={styles.flowStepValue}>
                        {formatNum(initialCarat)} <span className={styles.flowUnit}>ct</span>
                    </div>
                    <div className={styles.flowStepMeta}>
                        {initialPcs} pcs · Purchase / Import
                    </div>
                </div>

                {/* 2. Memo Out */}
                <div className={`${styles.flowStepCard} ${memoOutCarat > 0 ? styles.flowStepMemo : ''}`}>
                    <div className={styles.flowStepLabel}>
                        <TrendingDown size={13} />
                        <span>2. Given on Memo</span>
                    </div>
                    <div className={styles.flowStepValue}>
                        {memoOutCarat > 0 ? `-${formatNum(memoOutCarat)}` : '0'} <span className={styles.flowUnit}>ct</span>
                    </div>
                    <div className={styles.flowStepMeta}>
                        Debited from warehouse stock
                    </div>
                </div>

                {/* 3. Memo Return */}
                <div className={`${styles.flowStepCard} ${memoReturnCarat > 0 ? styles.flowStepReturn : ''}`}>
                    <div className={styles.flowStepLabel}>
                        <TrendingUp size={13} />
                        <span>3. Memo Returned</span>
                    </div>
                    <div className={styles.flowStepValue}>
                        {memoReturnCarat > 0 ? `+${formatNum(memoReturnCarat)}` : '0'} <span className={styles.flowUnit}>ct</span>
                    </div>
                    <div className={styles.flowStepMeta}>
                        Credited back to warehouse
                    </div>
                </div>

                {/* 4. Sale from Memo */}
                {hasMemoSale ? (
                    <div className={`${styles.flowStepCard} ${styles.flowStepSaleFromMemo}`}>
                        <div className={styles.flowStepLabel}>
                            <ShoppingBag size={13} />
                            <span>4. Sale (from Memo)</span>
                            <Tag color="gold" className={styles.flowTag}>Non-Debit</Tag>
                        </div>
                        <div className={styles.flowStepValue}>
                            {formatNum(soldFromMemoCarat)} <span className={styles.flowUnit}>ct</span>
                        </div>
                        <div className={styles.flowStepMeta}>
                            Fulfilled from open memo balance
                        </div>
                    </div>
                ) : null}

                {/* 5. Direct Sale (if any) */}
                {directSoldCarat > 0 ? (
                    <div className={`${styles.flowStepCard} ${styles.flowStepDirectSale}`}>
                        <div className={styles.flowStepLabel}>
                            <ShoppingBag size={13} />
                            <span>Direct Sale</span>
                        </div>
                        <div className={styles.flowStepValue}>
                            -{formatNum(directSoldCarat)} <span className={styles.flowUnit}>ct</span>
                        </div>
                        <div className={styles.flowStepMeta}>
                            Sold from warehouse on-hand
                        </div>
                    </div>
                ) : null}

                {/* 6. Current On-Hand */}
                <div className={`${styles.flowStepCard} ${styles.flowStepOnhand}`}>
                    <div className={styles.flowStepLabel}>
                        <CheckCircle2 size={13} />
                        <span>Current On-Hand (B.Carat)</span>
                    </div>
                    <div className={styles.flowStepValueHighlight}>
                        {formatNum(onhandCarat)} <span className={styles.flowUnitHighlight}>ct</span>
                    </div>
                    <div className={styles.flowStepMetaHighlight}>
                        {onhandPcs} pcs available in vault
                    </div>
                </div>
            </div>

            {/* Explanatory Calculation Banner */}
            {hasMemoSale ? (
                <div className={styles.mathNoticeBanner}>
                    <div className={styles.mathNoticeHeader}>
                        <Info size={15} className={styles.mathNoticeIcon} />
                        <span className={styles.mathNoticeTitle}>
                            Diamond Accounting Verification Rule (Why B.Carat is {formatNum(onhandCarat)} ct, Not {formatNum(onhandCarat - soldFromMemoCarat)} ct)
                        </span>
                    </div>
                    <div className={styles.mathNoticeBody}>
                        <div className={styles.mathFormulaLine}>
                            <span className={styles.formulaPill}>Formula</span>
                            <code>
                                {formatNum(initialCarat)} (Initial) - {formatNum(memoOutCarat)} (Memo) + {formatNum(memoReturnCarat)} (Memo Return) = <strong>{formatNum(onhandCarat)} ct On-Hand</strong>
                            </code>
                        </div>
                        <div className={styles.mathNoticeExplanation}>
                            💡 <strong>Important Note for Diamond Calculation:</strong> The <strong>{formatNum(soldFromMemoCarat)} ct</strong> sale was converted <i>directly from the open client memo</i>. Because those carats were <u>already debited</u> from main stock when the stone was given on Memo (Step 2), this sale does <strong>not</strong> deduct from the on-hand stock again. <strong>Do not subtract the {formatNum(soldFromMemoCarat)} ct sale twice manually!</strong>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default StockReconciliationCard;
