import React from 'react';
import InwardEntryForm from './InwardEntryForm';

const PurchaseEntry = () => (
  <InwardEntryForm
    title="Inward - Purchase Transaction"
    defaultInwardType="purchase"
    showRPcs
    initialLineCount={7}
    visibleRowCount={7}
    scrollableTable
  />
);

export default PurchaseEntry;
