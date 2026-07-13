import React from 'react';
import { Form } from 'antd';
import { ArrowLeftRight, Repeat, RotateCcw } from 'lucide-react';
import DynamicForm from '../../../hooks/DynamicFormField';
import useFormHandleChange from '../../../hooks/useFormHandleChange';
import styles from '../../../assets/scss/pages/accountings/mybalance.module.scss';

const bankTransferFields = [
    { name: 'from_book', label: 'From Book', type: 'select', required: true, span: 12, options: [{ value: 'cash', label: 'Cash' }] },
    { name: 'to_book', label: 'To Book', type: 'select', required: true, span: 12, options: [{ value: 'bank', label: 'HDFC Bank' }] },
    { name: 'amount', label: 'Amount', type: 'number', required: true, span: 12 },
    { name: 'rate', label: 'Rate', type: 'number', required: true, span: 12 },
    { name: 'date', label: 'Date', type: 'date', required: true, span: 24 },
];

const BankTransfer = () => {
    const { form, resetAll } = useFormHandleChange();

    const onFinish = (values) => {
        console.log('Transfer Data:', values);
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                    <div className={styles.cardIcon}>
                        <ArrowLeftRight size={20} />
                    </div>
                    <div className={styles.cardTitleGroup}>
                        <span className={styles.cardTitle}>Bank Transfer</span>
                        <span className={styles.cardSubtitle}>Transfer funds between books</span>
                    </div>
                </div>
            </div>

            <div className={styles.formBody}>
                <Form form={form} layout="vertical" onFinish={onFinish} requiredMark>
                    <DynamicForm fields={bankTransferFields} />
                    <div className={styles.formFooterInline}>
                        <button type="button" className={styles.btnReset} onClick={resetAll}>
                            <RotateCcw size={14} /> Reset
                        </button>
                        <button type="submit" className={styles.btnTransfer}>
                            <Repeat size={14} /> Transfer
                        </button>
                    </div>
                </Form>
            </div>
        </div>
    );
};

export default BankTransfer;
