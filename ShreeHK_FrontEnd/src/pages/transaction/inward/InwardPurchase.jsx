import React from 'react';
import InwardTransactionForm from './InwardTransactionForm';
import modernStyles from '../../../assets/scss/pages/transaction/inwardModern.module.scss';

const InwardPurchase = () => (
  <InwardTransactionForm
    title="Inward - Purchase Transaction"
    showRPcs={true}
    defaultInwardType="purchase"
    typeOptions={[{ value: 'purchase', label: 'Purchase' }]}
    useModernLayout
    stylesModule={modernStyles}
  />
);

export default InwardPurchase;
