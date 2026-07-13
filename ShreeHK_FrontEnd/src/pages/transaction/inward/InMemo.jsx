import React from 'react';
import InwardTransactionForm from './InwardTransactionForm';
import modernStyles from '../../../assets/scss/pages/transaction/inwardModern.module.scss';

const InMemo = () => (
  <InwardTransactionForm
    title="Inward - In Memo Transaction"
    showRPcs={false}
    defaultInwardType="memo"
    typeOptions={[{ value: 'memo', label: 'In Memo' }]}
    useModernLayout
    stylesModule={modernStyles}
  />
);

export default InMemo;
