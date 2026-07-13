import { useState, useCallback } from "react";
import { message } from "antd";
import { fetchStockAlert } from "../../api/services/aiService";

export default function useAiStockAlert() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);

  const runStockAlert = useCallback(async () => {
    setLoading(true);
    setError("");
    setResult("");
    setPanelOpen(true);
    try {
      const res = await fetchStockAlert();
      if (res?.success) {
        setResult(res.data);
      } else {
        const msg = res?.message || "AI unavailable, try again";
        setError(msg);
        message.error(msg);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "AI unavailable, try again";
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    result,
    error,
    panelOpen,
    setPanelOpen,
    runStockAlert,
  };
}
