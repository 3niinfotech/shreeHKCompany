import React, { useState } from 'react';
import { SkeletonBlock } from '../../../components/common/skeleton';
import { Activity, RefreshCw } from 'lucide-react';
import styles from '../../../assets/scss/pages/accountings/mybalance.module.scss';
import { cssVar } from '../../../theme';

const initialRates = [
    { id: 1, currency: 'USD - US Dollar', flag: '🇺🇸', usd: '83.25', hkd: '10.65', status: 'LIVE', updatedAt: '25 May 2026, 10:30 AM' },
    { id: 2, currency: 'EUR - Euro', flag: '🇪🇺', usd: '7.81', hkd: '1.00', status: 'LIVE', updatedAt: '25 May 2026, 10:30 AM' },
];

const LiveRates = () => {
    const [rates, setRates] = useState(initialRates);
    const [loading, setLoading] = useState(false);

    const handleRefresh = () => {
        setLoading(true);
        setTimeout(() => {
            const now = new Date();
            const timeStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            const updatedRates = rates.map(item => ({
                ...item,
                usd: (parseFloat(item.usd) + (Math.random() * 0.1)).toFixed(2),
                hkd: (parseFloat(item.hkd) + (Math.random() * 0.05)).toFixed(2),
                updatedAt: timeStr,
            }));
            setRates(updatedRates);
            setLoading(false);
        }, 800);
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                    <div className={styles.cardIcon}>
                        <Activity size={20} />
                    </div>
                    <div className={styles.cardTitleGroup}>
                        <span className={styles.cardTitle}>Live Rates</span>
                        <span className={styles.cardSubtitle}>Live exchange rates</span>
                    </div>
                </div>
                <div className={styles.cardActions}>
                    <button className={styles.btnRefresh} onClick={handleRefresh} disabled={loading}>
                        <RefreshCw size={14} className={loading ? styles.spinning : ''} /> Refresh
                    </button>
                </div>
            </div>

            <div className={styles.cardBody}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: 50 }}>No.</th>
                            <th>Currency</th>
                            <th style={{ width: 60, textAlign: 'center' }}>Flag</th>
                            <th style={{ textAlign: 'right' }}>USD</th>
                            <th style={{ textAlign: 'right' }}>HKD</th>
                            <th style={{ textAlign: 'center' }}>Status</th>
                            <th style={{ textAlign: 'right' }}>Updated At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={`sk-${i}`}>
                                    <td><SkeletonBlock width={24} height={12} /></td>
                                    <td><SkeletonBlock width="60%" height={12} /></td>
                                    <td style={{ textAlign: 'center' }}><SkeletonBlock width={20} height={14} /></td>
                                    <td style={{ textAlign: 'right' }}><SkeletonBlock width={56} height={12} /></td>
                                    <td style={{ textAlign: 'right' }}><SkeletonBlock width={56} height={12} /></td>
                                    <td style={{ textAlign: 'center' }}><SkeletonBlock width={48} height={12} /></td>
                                    <td style={{ textAlign: 'right' }}><SkeletonBlock width={72} height={12} /></td>
                                </tr>
                            ))
                        ) : (
                            rates.map((row, i) => (
                                <tr key={row.id}>
                                    <td>{i + 1}</td>
                                    <td>{row.currency}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={styles.flagEmoji}>{row.flag}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{row.usd}</td>
                                    <td style={{ textAlign: 'right' }}>{row.hkd}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={styles.statusLive}>{row.status}</span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontSize: 12, color: cssVar('color-text-muted') }}>
                                        {row.updatedAt}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LiveRates;
