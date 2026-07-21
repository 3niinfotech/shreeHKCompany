// import React, { useEffect, useState } from 'react';
// import { Form, Input, Button, Space } from 'antd';
// import { usePostApiRequest } from '../../../api/ApiFunction';
// import { ENDPOINTS } from '../../../constants/endpoints';
// import { BaseModal } from '../../common/modals';
// import { cssVar } from '../../../theme';

// const GiaReturnModal = ({ open, record, productIds, products, onClose, onSuccess }) => {
//   const [form] = Form.useForm();
//   const [records, setRecords] = useState({});
//   const { mutate: saveReturn, isPending } = usePostApiRequest(ENDPOINTS.transactionStock.gia.return, 'TransactionGiaStock');

//   useEffect(() => {
//     if (!open || !productIds?.length) return;
//     const initial = {};
//     productIds.forEach((id) => {
//       const p = products.find((row) => row.id === id) || {};
//       initial[id] = {
//         mfg_code: p.mfg_code || '',
//         sku: p.sku || '',
//         report: p.report_no || '',
//         intensity: p.intensity || '',
//         overtone: p.overtone || '',
//         color: p.color || '',
//       };
//     });
//     setRecords(initial);
//   }, [open, productIds, products]);

//   const updateField = (id, field, value) => {
//     setRecords((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], [field]: value },
//     }));
//   };

//   const handleSave = () => {
//     saveReturn(
//       { outid: record?.id, record: records },
//       { onSuccess: () => onSuccess?.() }
//     );
//   };

//   return (
//     <BaseModal
//       open={open}
//       onCancel={onClose}
//       title="Received from Lab"
//       width={900}
//       footer={(
//         <Space>
//           <Button onClick={onClose}>Close</Button>
//           <Button type="primary" loading={isPending} onClick={handleSave}>Save Return</Button>
//         </Space>
//       )}
//     >
//       <Form form={form} layout="vertical">
//         {productIds.map((id) => {
//           const rec = records[id] || {};
//           return (
//             <div key={id} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16, borderBottom: `1px solid ${cssVar('color-border')}`, paddingBottom: 12 }}>
//               <Form.Item label="Mfg. Code">
//                 <Input value={rec.mfg_code} onChange={(e) => updateField(id, 'mfg_code', e.target.value)} />
//               </Form.Item>
//               <Form.Item label="SKU">
//                 <Input value={rec.sku} onChange={(e) => updateField(id, 'sku', e.target.value)} />
//               </Form.Item>
//               <Form.Item label="Report No.">
//                 <Input value={rec.report} onChange={(e) => updateField(id, 'report', e.target.value)} placeholder="Leave empty for no certificate" />
//               </Form.Item>
//               <Form.Item label="Intensity">
//                 <Input value={rec.intensity} onChange={(e) => updateField(id, 'intensity', e.target.value)} />
//               </Form.Item>
//               <Form.Item label="Overtone">
//                 <Input value={rec.overtone} onChange={(e) => updateField(id, 'overtone', e.target.value)} />
//               </Form.Item>
//               <Form.Item label="Color">
//                 <Input value={rec.color} onChange={(e) => updateField(id, 'color', e.target.value)} />
//               </Form.Item>
//             </div>
//           );
//         })}
//       </Form>
//     </BaseModal>
//   );
// };

// export default GiaReturnModal;


import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Space } from 'antd';
import { usePostApiRequest } from '../../../api/ApiFunction';
import { ENDPOINTS } from '../../../constants/endpoints';
import { BaseModal } from '../../common/modals';
import { cssVar } from '../../../theme';

const GiaReturnModal = ({ open, record, productIds, products, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [records, setRecords] = useState({});
  const { mutate: saveReturn, isPending } = usePostApiRequest(ENDPOINTS.transactionStock.gia.return, 'TransactionGiaStock');

  useEffect(() => {
    if (!open || !productIds?.length) return;
    const initial = {};
    productIds.forEach((id) => {
      const p = products.find((row) => row.id === id) || {};
      initial[id] = {
        mfg_code: p.mfg_code || '',
        sku: p.sku || '',
        report: p.report_no || '',
        intensity: p.intensity || '',
        overtone: p.overtone || '',
        color: p.color || '',
      };
    });
    setRecords(initial);
  }, [open, productIds, products]);

  const updateField = (id, field, value) => {
    setRecords((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = () => {
    saveReturn(
      { outid: record?.id, record: records },
      { onSuccess: () => onSuccess?.() }
    );
  };

  return (
    <BaseModal
      isOpen={open}
      onClose={onClose}
      title="Received from Lab"
      width={900}
      footer={(
        <Space>
          <Button onClick={onClose}>Close</Button>
          <Button type="primary" loading={isPending} onClick={handleSave}>Save Return</Button>
        </Space>
      )}
      content={(
        <Form form={form} layout="vertical">
          {productIds.map((id) => {
            const rec = records[id] || {};
            return (
              <div key={id} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16, borderBottom: `1px solid ${cssVar('color-border')}`, paddingBottom: 12 }}>
                <Form.Item label="Mfg. Code">
                  <Input value={rec.mfg_code} onChange={(e) => updateField(id, 'mfg_code', e.target.value)} />
                </Form.Item>
                <Form.Item label="SKU">
                  <Input value={rec.sku} onChange={(e) => updateField(id, 'sku', e.target.value)} />
                </Form.Item>
                <Form.Item label="Report No.">
                  <Input value={rec.report} onChange={(e) => updateField(id, 'report', e.target.value)} placeholder="Leave empty for no certificate" />
                </Form.Item>
                <Form.Item label="Intensity">
                  <Input value={rec.intensity} onChange={(e) => updateField(id, 'intensity', e.target.value)} />
                </Form.Item>
                <Form.Item label="Overtone">
                  <Input value={rec.overtone} onChange={(e) => updateField(id, 'overtone', e.target.value)} />
                </Form.Item>
                <Form.Item label="Color">
                  <Input value={rec.color} onChange={(e) => updateField(id, 'color', e.target.value)} />
                </Form.Item>
              </div>
            );
          })}
        </Form>
      )}
    />
  );
};

export default GiaReturnModal;