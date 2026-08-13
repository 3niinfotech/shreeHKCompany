import { useEffect, useState } from "react";
import { Modal, Spin, Typography } from "antd";
import { toastError } from "../../utils/toastNotify";
import { fetchCustomerInsight } from "../../api/services/aiService";
import { pickApiMessage } from "../../utils/apiToast";
import styles from "../../assets/scss/components/ai/aiComponents.module.scss";

const { Text } = Typography;

const AICustomerSuggestModal = ({ open, onClose, customerId, customerName }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    if (!open || !customerId) return;

    const load = async () => {
      setLoading(true);
      setResult("");
      try {
        const res = await fetchCustomerInsight({ customerId });
        if (res?.success) {
          setResult(res.data);
        } else {
          const msg = pickApiMessage(res);
          if (msg) toastError(msg);
        }
      } catch (err) {
        const msg = pickApiMessage(err?.response?.data);
        if (msg) toastError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, customerId]);

  return (
    <Modal
      title={`AI Suggest — ${customerName || "Customer"}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      {loading ? (
        <Spin />
      ) : result ? (
        <div className={styles.panelBody}>{result}</div>
      ) : (
        <Text type="secondary">No recommendations available.</Text>
      )}
    </Modal>
  );
};

export default AICustomerSuggestModal;
