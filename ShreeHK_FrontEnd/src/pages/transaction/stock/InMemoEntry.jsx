import React from 'react';
import InwardEntryForm from './InwardEntryForm';

const InMemoEntry = () => (
  <InwardEntryForm
    title="Inward - Memo Transaction"
    defaultInwardType="memo"
    showRPcs
    initialLineCount={4}
    visibleRowCount={4}
    scrollableTable
  />
);

export default InMemoEntry;
