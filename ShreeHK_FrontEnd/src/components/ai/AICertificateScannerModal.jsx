import React, { useState } from 'react';
import { Modal, Upload, Button, Tag, Spin, Card, Typography, Space } from 'antd';
import { Sparkles, UploadCloud, CheckCircle2, AlertCircle, FileSearch, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '../../api/axiosInstance';

const { Text, Title } = Typography;

export default function AICertificateScannerModal({ open, onClose, onApplyScanData }) {
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState(null);

  const handleCustomRequest = async ({ file, onSuccess, onError }) => {
    setLoading(true);
    setScannedData(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result;
        try {
          const res = await axiosInstance.post('/ai/ocr/certificate', {
            imageBase64: base64Data,
            mimeType: file.type || 'image/jpeg',
          });

          if (res.data?.success && res.data?.data) {
            setScannedData(res.data.data);
            toast.success('Certificate scanned successfully!');
            onSuccess('ok');
          } else {
            throw new Error(res.data?.message || 'Failed to parse certificate.');
          }
        } catch (apiErr) {
          toast.error(apiErr.response?.data?.message || apiErr.message || 'OCR Scan Failed');
          onError(apiErr);
        } finally {
          setLoading(false);
        }
      };
    } catch (err) {
      toast.error('File reading error');
      setLoading(false);
      onError(err);
    }
  };

  const handleApply = () => {
    if (scannedData && onApplyScanData) {
      onApplyScanData(scannedData);
      toast.success('Certificate specifications applied to inward line item!');
      setScannedData(null);
      setFileList([]);
      onClose();
    }
  };

  const handleClose = () => {
    setScannedData(null);
    setFileList([]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={650}
      title={
        <Space size={8}>
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <Text className="font-semibold text-lg">AI Diamond Certificate OCR Reader</Text>
        </Space>
      }
    >
      <div className="py-3 flex flex-col gap-4">
        <Text type="secondary" className="text-sm">
          Upload a GIA, IGI, or HRD diamond grading certificate (JPG, PNG, PDF). Vision AI will automatically extract diamond specifications.
        </Text>

        <Upload.Dragger
          multiple={false}
          fileList={fileList}
          customRequest={handleCustomRequest}
          onChange={({ fileList: newFileList }) => setFileList(newFileList.slice(-1))}
          showUploadList={false}
          accept="image/*,.pdf"
          disabled={loading}
          style={{ padding: '20px', background: '#fafafa', borderRadius: '8px', border: '2px dashed #e2e8f0' }}
        >
          <div className="flex flex-col items-center gap-2 py-4">
            {loading ? (
              <Spin size="large" />
            ) : (
              <>
                <UploadCloud className="w-10 h-10 text-emerald-600 mb-1" />
                <Text className="font-medium text-base">Click or Drag Certificate Scan Here</Text>
                <Text type="secondary" className="text-xs">Supports GIA, IGI, HRD Certificate Images or PDFs</Text>
              </>
            )}
          </div>
        </Upload.Dragger>

        {scannedData && (
          <Card
            size="small"
            style={{ borderColor: '#10b981', backgroundColor: '#f0fdf4' }}
            title={
              <Space>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <Text className="font-semibold text-emerald-800">Extracted Stone Specifications</Text>
                <Tag color="emerald">{scannedData.lab || 'GIA'}</Tag>
              </Space>
            }
          >
            <div className="grid grid-cols-3 gap-3 text-xs py-1">
              <div>
                <Text type="secondary" block>Report No:</Text>
                <Text strong>{scannedData.reportNo || '-'}</Text>
              </div>
              <div>
                <Text type="secondary" block>Shape:</Text>
                <Text strong>{scannedData.shape || '-'}</Text>
              </div>
              <div>
                <Text type="secondary" block>Carat Weight:</Text>
                <Text strong>{scannedData.pCarat ? `${scannedData.pCarat} ct` : '-'}</Text>
              </div>
              <div>
                <Text type="secondary" block>Color / Clarity:</Text>
                <Text strong>{scannedData.color || '-'} / {scannedData.clarity || '-'}</Text>
              </div>
              <div>
                <Text type="secondary" block>Cut / Polish / Symm:</Text>
                <Text strong>{scannedData.cut || '-'} / {scannedData.polish || '-'} / {scannedData.symm || '-'}</Text>
              </div>
              <div>
                <Text type="secondary" block>Fluorescence:</Text>
                <Text strong>{scannedData.floIntensity || 'NON'}</Text>
              </div>
              <div>
                <Text type="secondary" block>Depth / Table:</Text>
                <Text strong>{scannedData.depthPer || '-'}% / {scannedData.tablePer || '-'}%</Text>
              </div>
              <div className="col-span-2">
                <Text type="secondary" block>Measurements:</Text>
                <Text strong>{scannedData.measurements || '-'}</Text>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t pt-3">
              <Button onClick={handleClose}>Cancel</Button>
              <Button
                type="primary"
                icon={<ArrowRight className="w-4 h-4 inline" />}
                onClick={handleApply}
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                Apply to Inward Entry Form
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
}
