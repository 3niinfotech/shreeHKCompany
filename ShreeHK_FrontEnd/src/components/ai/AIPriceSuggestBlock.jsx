import { useState } from "react";
import { Button } from "antd";
import { toastError } from "../../utils/toastNotify";
import { Sparkles } from "lucide-react";
import { fetchPriceSuggest } from "../../api/services/aiService";
import { pickApiMessage } from "../../utils/apiToast";
import styles from "../../assets/scss/components/ai/aiComponents.module.scss";

const AIPriceSuggestBlock = ({ getFormValues }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleSuggest = async () => {
    const values = getFormValues?.() || {};
    const { shape, color, clarity, cost } = values;
    const carat = values.carat ?? values.polish_carat;

    if (!shape && !carat && !color && !clarity) return;

    setLoading(true);
    setResult("");
    try {
      const res = await fetchPriceSuggest({
        shape,
        carat,
        color,
        clarity,
        purchasePrice: cost,
      });
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

  return (
    <div className={styles.priceBlock}>
      <Button
        icon={<Sparkles size={16} />}
        onClick={handleSuggest}
        loading={loading}
      >
        AI Price Suggest
      </Button>
      {result ? (
        <div className={styles.priceResult}>
          <strong>AI suggestion — verify before saving:</strong>
          <br />
          {result}
        </div>
      ) : null}
    </div>
  );
};

export default AIPriceSuggestBlock;
