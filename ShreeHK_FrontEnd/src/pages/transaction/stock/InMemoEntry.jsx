import React from 'react';
import InwardEntryForm from './InwardEntryForm';

const InMemoEntry = () => (
  <InwardEntryForm
    title="Inward - Memo Transaction"
    defaultInwardType="memo"
    showRPcs
    initialLineCount={7}
    visibleRowCount={7}
    scrollableTable
  />
);

export default InMemoEntry;
