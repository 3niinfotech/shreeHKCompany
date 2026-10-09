import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Input, InputNumber, Modal, Select, Table } from "antd";
import dayjs from "dayjs";
import {
  CalendarDays,
  Check,
  CircleDollarSign,
  CreditCard,
  FileText,
  Hash,
  Landmark,
  ListOrdered,
  Percent,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { useFetchApi, usePostApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../api/endpoints";
import styles from "../../assets/scss/pages/report/outstandingCalculationModal.module.scss";

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const defaultDescription = (data) =>
  `Payment paid of Invoice No:${data?.invoiceno || ""}`;

const InputLabel = ({ children }) => <label className={styles.inputLabel}>{children}</label>;
const InfoItem = ({ icon: Icon, label, value, alert }) => (
  <div className={styles.infoItem}>
    <span className={styles.infoIcon}>{Icon && <Icon size={17} />}</span>
    <div>
      <span>{label}</span>
      <strong className={alert ? styles.alertValue : ""}>{value}</strong>
    </div>
  </div>
);
const Stat = ({ icon: Icon, label, value, tone }) => (
  <div className={`${styles.stat} ${styles[tone]}`}>
    <span>{Icon && <Icon size={19} />}</span>
    <div>
      <label>{label}</label>
      <strong>{value}</strong>
    </div>
  </div>
);

const OutstandingCalculationModal = ({ open, onClose, data, onSaved }) => {
  const [lessPercent, setLessPercent] = useState(0);
  const [otherLessPercent, setOtherLessPercent] = useState(0);
  const [extraCharge, setExtraCharge] = useState(0);
  const [paymentDate, setPaymentDate] = useState(dayjs());
  const [book, setBook] = useState(undefined);
  const [cheque, setCheque] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [otherParty, setOtherParty] = useState(undefined);
  const [transactions, setTransactions] = useState([]);

  const { data: bookData } = useFetchApi("accBooks", ENDPOINTS.accountingTxn.books);
  const { data: companyData } = useFetchApi("GetCompany", ENDPOINTS.company.options);

  const { mutate: saveCharge, isPending: isSavingCharge } = usePostApiRequest(
    ENDPOINTS.report.outstandingCharge,
    null,
  );
  const { mutate: saveInstallment, isPending: isSavingInstallment } = usePostApiRequest(
    ENDPOINTS.report.outstandingInstallment,
    null,
  );
  const { mutate: fetchRecords, isPending: isLoadingRecords } = usePostApiRequest(
    ENDPOINTS.report.outstandingRecords,
    null,
    { showToast: false },
  );

  const bookOptions = useMemo(() => {
    const list = bookData?.Data || [];
    return list.map((b) => {
      if (b && typeof b === "object" && b.value != null) {
        return { value: String(b.value), label: String(b.label ?? b.value) };
      }
      const name = b?.name ?? String(b);
      return { value: name, label: name };
    });
  }, [bookData]);

  const bookLabelMap = useMemo(() => {
    const map = {};
    bookOptions.forEach((opt) => {
      map[String(opt.value)] = opt.label;
    });
    return map;
  }, [bookOptions]);

  const partyOptions = useMemo(() => {
    const list = companyData?.Data || [];
    return list.map((item) => ({
      label: item.name,
      value: item.id != null ? String(item.id) : String(item.name),
    }));
  }, [companyData]);

  const partyLabelMap = useMemo(() => {
    const map = {};
    partyOptions.forEach((opt) => {
      map[String(opt.value)] = opt.label;
      map[String(opt.label)] = opt.label;
    });
    return map;
  }, [partyOptions]);

  const entryType =
    data?.type === "purchase" || data?.type === "import"
      ? data.type
      : data?.type === "export"
        ? "export"
        : "sale";

  const loadTransactions = useCallback(() => {
    if (!data?.id) return;
    fetchRecords(
      { id: data.id, type: entryType },
      {
        onSuccess: (res) => {
          const rows = res?.data?.records || res?.Data?.records || [];
          setTransactions(Array.isArray(rows) ? rows : []);
        },
        onError: () => setTransactions([]),
      },
    );
  }, [data?.id, entryType, fetchRecords]);

  useEffect(() => {
    if (!open || !data) return;
    setLessPercent(Number(data.less_percent || data.lessPercent || 0));
    setOtherLessPercent(Number(data.other_less_percent || data.otherLessPercent || 0));
    setExtraCharge(Number(data.extra_charge || data.extraCharge || 0));
    setPaymentDate(dayjs());
    setBook(undefined);
    setCheque("");
    setDescription(defaultDescription(data));
    setOtherParty(undefined);
    setTransactions([]);
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when modal opens / row changes
  }, [open, data?.id, data?.type]);

  const calculation = useMemo(() => {
    const baseAmount =
      Number(data?.amount || data?.sub_total || data?.total_amount || data?.final_amount) || 0;

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
      dueAmount: dueAmount > 0 ? dueAmount : 0,
    };
  }, [data, lessPercent, otherLessPercent, extraCharge]);

  useEffect(() => {
    setPaymentAmount(calculation.dueAmount);
  }, [calculation.dueAmount]);

  const transactionTotal = useMemo(
    () => transactions.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [transactions],
  );

  const transactionColumns = useMemo(
    () => [
      {
        title: "No",
        key: "no",
        width: 50,
        align: "center",
        render: (_, __, index) => index + 1,
      },
      {
        title: "Date",
        dataIndex: "display_date",
        key: "date",
        width: 100,
        render: (value, row) => {
          if (value) return value;
          const raw = row.date;
          return raw && dayjs(raw).isValid() ? dayjs(raw).format("DD-MM-YYYY") : "-";
        },
      },
      {
        title: "Account",
        dataIndex: "account_name",
        key: "account",
        width: 140,
        ellipsis: true,
        render: (value, row) => value || row.under_subgroup || row.type || "-",
      },
      {
        title: "Party",
        key: "party",
        width: 160,
        ellipsis: true,
        render: (_, row) =>
          row.party_name
          || partyLabelMap[String(row.party ?? "")]
          || row.party
          || "-",
      },
      {
        title: "Description",
        key: "description",
        ellipsis: true,
        render: (_, row) => {
          const bookName = bookLabelMap[String(row.book ?? "")] || row.book || "";
          const desc = row.description || "";
          if (bookName && desc) return `${bookName} - ${desc}`;
          return bookName || desc || "-";
        },
      },
      {
        title: "Amount",
        dataIndex: "amount",
        key: "amount",
        width: 110,
        align: "right",
        render: (value) => money(value),
      },
    ],
    [bookLabelMap, partyLabelMap],
  );

  const resetCharges = () => {
    setLessPercent(Number(data?.less_percent || data?.lessPercent || 0));
    setOtherLessPercent(Number(data?.other_less_percent || data?.otherLessPercent || 0));
    setExtraCharge(Number(data?.extra_charge || data?.extraCharge || 0));
  };

  const resetInstallment = () => {
    setPaymentDate(dayjs());
    setBook(undefined);
    setCheque("");
    setPaymentAmount(calculation.dueAmount);
    setDescription(defaultDescription(data));
    setOtherParty(undefined);
  };

  const handleSaveCharge = () => {
    if (!data?.id) return;
    saveCharge(
      {
        id: data.id,
        type: entryType,
        lessPercent,
        otherLessPercent,
        extraCharge,
        lessAmount: calculation.lessAmount,
        otherLessAmount: calculation.otherLessAmount,
        finalAmount: calculation.finalAmount,
        dueAmount: calculation.dueAmount,
      },
      {
        onSuccess: () => {
          onSaved?.();
          onClose?.();
        },
      },
    );
  };

  const handleSaveInstallment = () => {
    if (!data?.id) return;
    saveInstallment(
      {
        id: data.id,
        type: entryType,
        date: paymentDate?.format("YYYY-MM-DD"),
        book: book || "",
        cheque,
        amount: paymentAmount,
        description: description || defaultDescription(data),
        other_party: otherParty || "",
      },
      {
        onSuccess: () => {
          onSaved?.();
          onClose?.();
        },
      },
    );
  };

  return (
    <Modal
      className={styles.modal}
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      centered
      destroyOnClose
      closeIcon={<X size={19} />}
    >
      {data && (
        <div className={styles.content}>
          <header className={styles.modalHeader}>
            <span className={styles.headerIcon}>
              <CircleDollarSign size={25} />
            </span>
            <h2>Outstanding Details</h2>
            <span className={styles.entryBadge}>{data.entryno}</span>
          </header>

          <section className={styles.infoCard}>
            <div className={styles.infoGrid}>
              <InfoItem icon={CalendarDays} label="Date" value={data.date || "-"} />
              <InfoItem icon={ReceiptText} label="Reference" value={data.reference || "-"} />
              <InfoItem icon={FileText} label="Invoice No" value={data.invoiceno || "-"} />
              <InfoItem icon={Hash} label="Entry No" value={data.entryno} />
              <InfoItem icon={CalendarDays} label="Invoice Date" value={data.invoicedate || "-"} />
            </div>
            <div className={styles.infoBottom}>
              <span>
                Terms <b className={styles.termBadge}>{data.terms || 0} Days</b>
              </span>
              <i />
              <span>
                Due Date <b>{data.due_date || "-"}</b>
              </span>
              <i />
              <span>
                Paid Amount <b>{money(data.paid_amount)}</b>
              </span>
              <i />
              <span>
                Due Amount <b className={styles.alertValue}>{money(calculation.dueAmount)}</b>
              </span>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <h3>
              <Percent size={19} /> Adjust Amount
            </h3>
            <div className={styles.fieldGrid}>
              <div>
                <InputLabel>Less %</InputLabel>
                <InputNumber
                  value={lessPercent}
                  min={0}
                  max={100}
                  controls={false}
                  prefix="%"
                  suffix="%"
                  onChange={(v) => setLessPercent(v || 0)}
                />
              </div>
              <div>
                <InputLabel>Less Amount</InputLabel>
                <InputNumber value={calculation.lessAmount} controls={false} readOnly prefix="$" />
              </div>
              <div>
                <InputLabel>Other Less %</InputLabel>
                <InputNumber
                  value={otherLessPercent}
                  min={0}
                  max={100}
                  controls={false}
                  prefix="%"
                  suffix="%"
                  onChange={(v) => setOtherLessPercent(v || 0)}
                />
              </div>
              <div>
                <InputLabel>Other Less Amount</InputLabel>
                <InputNumber value={calculation.otherLessAmount} controls={false} readOnly prefix="$" />
              </div>
              <div>
                <InputLabel>Extra Charges</InputLabel>
                <InputNumber
                  value={extraCharge}
                  min={0}
                  controls={false}
                  prefix="$"
                  onChange={(v) => setExtraCharge(v || 0)}
                />
              </div>
            </div>
            <div className={styles.actionRow}>
              <Button className={styles.btnReset} icon={<RotateCcw size={17} />} onClick={resetCharges}>
                Reset
              </Button>
              <Button
                type="primary"
                className={styles.btnSave}
                icon={<Check size={17} />}
                loading={isSavingCharge}
                onClick={handleSaveCharge}
              >
                Save Change
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
            <h3>
              <ListOrdered size={19} /> Transactions
            </h3>
            <Table
              className={styles.txnTable}
              size="small"
              bordered
              rowKey={(row) => row.id || `${row.date}-${row.amount}-${row.description}`}
              loading={isLoadingRecords}
              columns={transactionColumns}
              dataSource={transactions}
              pagination={false}
              scroll={{ y: 180 }}
              locale={{ emptyText: "No Transaction found." }}
              summary={() =>
                transactions.length ? (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={5} align="right">
                        <b>Total</b>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right">
                        <b>{money(transactionTotal)}</b>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                ) : null
              }
            />
          </section>

          <section className={styles.sectionCard}>
            <h3>
              <CalendarDays size={19} /> Save as Installment
            </h3>
            <div className={styles.installmentGrid}>
              <div>
                <InputLabel>Date</InputLabel>
                <DatePicker value={paymentDate} onChange={setPaymentDate} format="DD-MM-YYYY" />
              </div>
              <div>
                <InputLabel>Book</InputLabel>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select book"
                  value={book}
                  options={bookOptions}
                  onChange={setBook}
                  suffixIcon={<Landmark size={14} />}
                />
              </div>
              <div>
                <InputLabel>Amount</InputLabel>
                <InputNumber
                  value={paymentAmount}
                  min={0}
                  max={calculation.dueAmount}
                  controls={false}
                  prefix="$"
                  onChange={(v) => setPaymentAmount(v || 0)}
                />
              </div>
              <div>
                <InputLabel>Cheque#</InputLabel>
                <Input
                  value={cheque}
                  prefix={<Hash size={16} />}
                  placeholder="Enter cheque no"
                  onChange={(e) => setCheque(e.target.value)}
                />
              </div>
              <div>
                <InputLabel>Other Party</InputLabel>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select other party"
                  value={otherParty}
                  options={partyOptions}
                  onChange={setOtherParty}
                />
              </div>
              <div className={styles.installmentFull}>
                <InputLabel>Description</InputLabel>
                <Input.TextArea
                  rows={2}
                  value={description}
                  placeholder="Enter description"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.actionRow}>
              <Button className={styles.btnReset} icon={<RotateCcw size={17} />} onClick={resetInstallment}>
                Reset
              </Button>
              <Button
                type="primary"
                className={styles.btnSave}
                icon={<Check size={17} />}
                loading={isSavingInstallment}
                onClick={handleSaveInstallment}
              >
                Save Installment
              </Button>
            </div>
          </section>

          <footer className={styles.footer}>
            <span>
              <ShieldCheck size={25} />
              <span>
                <b>All changes are secure and logged</b>
                <small>Your data is protected with enterprise-grade security.</small>
              </span>
            </span>
            <Button onClick={onClose} danger>
              Close
            </Button>
          </footer>
        </div>
      )}
    </Modal>
  );
};

export default OutstandingCalculationModal;
