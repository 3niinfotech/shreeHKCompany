import React from 'react';
import InwardTransactionForm from './InwardTransactionForm';
import modernStyles from '../../../assets/scss/pages/transaction/inwardModern.module.scss';

const InConsignment = () => (
  <InwardTransactionForm
    title="Inward - In Consignment Transaction"
    showRPcs={false}
    defaultInwardType="consign"
    typeOptions={[{ value: 'consign', label: 'In Consignment' }]}
    useModernLayout
    stylesModule={modernStyles}
  />
);

export default InConsignment;
