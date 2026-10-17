import React from 'react';
import InwardTransactionForm from './InwardTransactionForm';
import modernStyles from '../../../assets/scss/pages/transaction/inwardModern.module.scss';

const InwordImport = () => (
  <InwardTransactionForm
    title="Inward - Import Transaction"
    showRPcs={false}
    showMfgCode={false}
    defaultInwardType="import"
    typeOptions={[
      { value: 'import', label: 'Import' },
      { value: 'purchase', label: 'Purchase' },
      { value: 'memo', label: 'In Memo' },
      { value: 'consign', label: 'In Consignment' },
    ]}
    useModernLayout
    stylesModule={modernStyles}
    showExcelUpload
    skipExistCheck
    initialLineCount={1}
    scrollableTable
  />
);

export default InwordImport;
