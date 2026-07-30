import React, { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Input, InputNumber, Modal } from "antd";
import dayjs from "dayjs";
import { CalendarDays, Check, CircleDollarSign, CreditCard, FileText, Hash, Landmark, Percent, ReceiptText, RotateCcw, ShieldCheck, WalletCards, X } from "lucide-react";
import { usePostApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import styles from "../../assets/scss/pages/report/outstandingCalculationModal.module.scss";

const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const InputLabel = ({ children }) => <label className={styles.inputLabel}>{children}</label>;
const InfoItem = ({ icon: IconComponent, label, value, alert }) => <div className={styles.infoItem}><span className={styles.infoIcon}><IconComponent size={17} /></span><div><span>{label}</span><strong className={alert ? styles.alertValue : ""}>{value}</strong></div></div>;
const Stat = ({ icon: IconComponent, label, value, tone }) => <div className={`${styles.stat} ${styles[tone]}`}><span><IconComponent size={19} /></span><div><label>{label}</label><strong>{value}</strong></div></div>;

const OutstandingCalculationModal = ({ open, onClose, data, onSaved }) => {
    const [lessPercent, setLessPercent] = useState(0);
    const [otherLessPercent, setOtherLessPercent] = useState(0);
    const [extraCharge, setExtraCharge] = useState(0);
    const [paymentDate, setPaymentDate] = useState(dayjs());
    const [book, setBook] = useState("");
    const [cheque, setCheque] = useState("");
    const [paymentAmount, setPaymentAmount] = useState(0);
    const { mutate: saveCharge, isPending: isSavingCharge } = usePostApiRequest(ENDPOINTS.report.outstandingCharge, null);
    const { mutate: saveInstallment, isPending: isSavingInstallment } = usePostApiRequest(ENDPOINTS.report.outstandingInstallment, null);

    useEffect(() => {
        if (!open || !data) return;
        setLessPercent(Number(data.less_percent || data.lessPercent || 0));
        setOtherLessPercent(Number(data.other_less_percent || data.otherLessPercent || 0));
        setExtraCharge(Number(data.extra_charge || data.extraCharge || 0));
        setPaymentDate(dayjs());
        setBook("");
        setCheque("");
    }, [open, data]);

    const calculation = useMemo(() => {
        // Use base amount if available, otherwise fallback to final_amount
        const baseAmount = Number(data?.amount || data?.sub_total || data?.total_amount || data?.final_amount) || 0;
        
        const lessAmount = (baseAmount * (Number(lessPercent) || 0)) / 100;
        const afterLess = baseAmount - lessAmount;
        
        const otherLessAmount = (afterLess * (Number(otherLessPercent) || 0)) / 100;
        
        const finalAmount = afterLess - otherLessAmount + (Number(extraCharge) || 0);
        const paidAmount = Number(data?.paid_amount) || 0;
        const dueAmount = finalAmount - paidAmount;
        
        return { 
            baseAmount,
            lessAmount, 
            afterLess, 
            otherLessAmount, 
            finalAmount, 
            dueAmount: dueAmount > 0 ? dueAmount : 0 
        };
    }, [data, lessPercent, otherLessPercent, extraCharge]);

    useEffect(() => {
        setPaymentAmount(calculation.dueAmount);
    }, [calculation.dueAmount]);

    const entryType = data?.type === "purchase" || data?.type === "import" ? data.type : "sale";
    
    const resetCharges = () => {
        setLessPercent(Number(data?.less_percent || data?.lessPercent || 0));
        setOtherLessPercent(Number(data?.other_less_percent || data?.otherLessPercent || 0));
        setExtraCharge(Number(data?.extra_charge || data?.extraCharge || 0));
    };
    
    const resetInstallment = () => {
        setPaymentDate(dayjs());
        setBook("");
        setCheque("");
        setPaymentAmount(calculation.dueAmount);
    };
    
    const handleSaveCharge = () => {
        if (!data?.id) return;
        saveCharge({ 
            id: data.id, 
            type: entryType, 
            lessPercent, 
            otherLessPercent, 
            extraCharge,
            lessAmount: calculation.lessAmount,
            otherLessAmount: calculation.otherLessAmount,
            finalAmount: calculation.finalAmount,
            dueAmount: calculation.dueAmount
        }, {
            onSuccess: () => {
                onSaved?.();
                onClose?.();
            }
        });
    };
    
    const handleSaveInstallment = () => {
        if (!data?.id) return;
        saveInstallment({
            id: data.id,
            type: entryType,
            date: paymentDate?.format("YYYY-MM-DD"),
            book,
            cheque,
            amount: paymentAmount,
            description: `Payment paid of Invoice No:${data?.invoiceno || ""}`,
        }, { 
            onSuccess: () => {
                onSaved?.();
                onClose?.();
            } 
        });
    };


    return <Modal className={styles.modal} open={open} onCancel={onClose} footer={null} width={920} centered destroyOnClose closeIcon={<X size={19} />}>
        {data && <div className={styles.content}>
            <header className={styles.modalHeader}><span className={styles.headerIcon}><CircleDollarSign size={25} /></span><h2>Outstanding Details</h2><span className={styles.entryBadge}>{data.entryno}</span></header>
            <section className={styles.infoCard}>
                <div className={styles.infoGrid}>
                    <InfoItem icon={CalendarDays} label="Date" value={data.date || "-"} />
                    <InfoItem icon={ReceiptText} label="Reference" value={data.reference || "-"} />
                    <InfoItem icon={FileText} label="Invoice No" value={data.invoiceno || "-"} />
                    <InfoItem icon={Hash} label="Entry No" value={data.entryno} />
                    <InfoItem icon={CalendarDays} label="Invoice Date" value={data.invoicedate || "-"} />
                </div>
                <div className={styles.infoBottom}>
                    <span>Terms <b className={styles.termBadge}>{data.terms || 0} Days</b></span><i />
                    <span>Due Date <b>{data.due_date || "-"}</b></span><i />
                    <span>Paid Amount <b>{money(data.paid_amount)}</b></span><i />
                    <span>Due Amount <b className={styles.alertValue}>{money(calculation.dueAmount)}</b></span>
                </div>
            </section>
            <section className={styles.sectionCard}>
                <h3><Percent size={19} /> Adjust Amount</h3>
                <div className={styles.fieldGrid}>
                    <div><InputLabel>Less %</InputLabel><InputNumber value={lessPercent} min={0} max={100} controls={false} prefix="%" suffix="%" onChange={(v) => setLessPercent(v || 0)} /></div>
                    <div><InputLabel>Less Amount</InputLabel><InputNumber value={calculation.lessAmount} controls={false} readOnly prefix="$" /></div>
                    <div><InputLabel>Other Less %</InputLabel><InputNumber value={otherLessPercent} min={0} max={100} controls={false} prefix="%" suffix="%" onChange={(v) => setOtherLessPercent(v || 0)} /></div>
                    <div><InputLabel>Other Less Amount</InputLabel><InputNumber value={calculation.otherLessAmount} controls={false} readOnly prefix="$" /></div>
                    <div><InputLabel>Extra Charges</InputLabel><InputNumber value={extraCharge} min={0} controls={false} prefix="$" onChange={(v) => setExtraCharge(v || 0)} /></div>
                </div>
                <div className={styles.actionRow}><Button type="primary" icon={<Check size={17} />} loading={isSavingCharge} onClick={handleSaveCharge} style={{ background: "var(--color-btn-save-bg)", borderColor: "var(--color-btn-save-bg)" }}>Save Change</Button>
                  <Button
  className={styles.blackBtn}
  style={{
    background: "#000",
    borderColor: "#000",
    color: "#fff",
  }}
  icon={<RotateCcw size={17} color="#fff" />}
  onClick={resetCharges}
>
  Reset
</Button>
                </div>
                <div className={styles.statsRow}>
                    <Stat icon={WalletCards} label="Final Amount" value={money(calculation.finalAmount)} tone="purple" />
                    <Stat icon={CreditCard} label="Paid Amount" value={money(data.paid_amount)} tone="green" />
                    <Stat icon={ReceiptText} label="Due Amount" value={money(calculation.dueAmount)} tone="orange" />
                    <Stat icon={Landmark} label="Adjusted Amount" value={money(calculation.finalAmount)} tone="blue" />
                </div>
            </section>
            <section className={styles.sectionCard}>
                <h3><CalendarDays size={19} /> Save as Installment</h3>
                <div className={styles.installmentGrid}>
                    <div><InputLabel>Date</InputLabel><DatePicker value={paymentDate} onChange={setPaymentDate} format="DD MMM YYYY" /></div>
                    <div><InputLabel>Bank</InputLabel><Input value={book} prefix={<Landmark size={16} />} placeholder="Enter bank" onChange={(e) => setBook(e.target.value)} /></div>
                    <div><InputLabel>Amount</InputLabel><InputNumber value={paymentAmount} min={0} max={calculation.dueAmount} controls={false} prefix="$" onChange={(v) => setPaymentAmount(v || 0)} /></div>
                    <div><InputLabel>Cheque#</InputLabel><Input value={cheque} prefix={<Hash size={16} />} placeholder="Enter cheque no" onChange={(e) => setCheque(e.target.value)} /></div>
                </div>
                <div className={styles.actionRow}><Button type="primary" icon={<Check size={17} />} loading={isSavingInstallment} onClick={handleSaveInstallment} style={{ background: "var(--color-btn-save-bg)", borderColor: "var(--color-btn-save-bg)" }}>Save Installment</Button><Button
                    className={styles.blackBtn}
                    icon={<RotateCcw size={17} />}
                    onClick={resetInstallment}
                >
                    Reset
                </Button></div>
            </section>
            <footer className={styles.footer}><span><ShieldCheck size={25} /><span><b>All changes are secure and logged</b><small>Your data is protected with enterprise-grade security.</small></span></span><Button
                //  icon={<X size={17} />} 
                onClick={onClose} danger>Close</Button></footer>
        </div>}
    </Modal>;
};

export default OutstandingCalculationModal;
