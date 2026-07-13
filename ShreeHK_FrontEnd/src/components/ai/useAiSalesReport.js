import { useState, useCallback } from "react";
import { message } from "antd";
import { fetchSalesReport } from "../../api/services/aiService";

export default function useAiSalesReport() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);

  const runSalesReport = useCallback(async (salesData) => {
    setLoading(true);
    setError("");
    setResult("");
    setPanelOpen(true);
    try {
      const res = await fetchSalesReport({ salesData });
      if (res?.success) {
        setResult(res.data);
      } else {
        const msg = res?.message || "AI unavailable, try again";
        setError(msg);
        message.error(msg);
      }
    } catch {
      const msg = "AI unavailable, try again";
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
    runSalesReport,
  };
}
