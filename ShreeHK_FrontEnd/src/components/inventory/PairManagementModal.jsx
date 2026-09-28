import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Alert, Table, Button, Space, Tag, Spin, Tooltip } from "antd";
import { LinkOutlined, DisconnectOutlined, ThunderboltOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { toastWarning, toastSuccess, toastApiSuccess, toastApiError } from "../../utils/toastNotify";
import { api } from "../../api/client/axiosInstance";
import { ENDPOINTS } from "../../api/endpoints";
import { SkuLink } from "../../hooks/useSkuModalAction";

/**
 * Smart Pair Management & AI Match Finder Modal.
 */
const PairManagementModal = ({ open, selectedRows = [], onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [matchingCandidates, setMatchingCandidates] = useState([]);
  const [fetchingMatches, setFetchingMatches] = useState(false);

  const singleSelectedStone = selectedRows.length === 1 ? selectedRows[0] : null;

  // Auto-fetch pair candidates when 1 stone is selected
  useEffect(() => {
    if (!open || !singleSelectedStone?.id) {
      setMatchingCandidates([]);
      return;
    }

    let isMounted = true;
    const fetchMatches = async () => {
      setFetchingMatches(true);
      try {
        const res = await api.get("/product/pair/suggest", {
          params: { productId: singleSelectedStone.id, caratTolerance: 0.04 },
        });
        if (isMounted && res.data?.status !== false) {
          setMatchingCandidates(res.data?.candidates || []);
        }
      } catch (e) {
        console.warn("Auto pair search error:", e?.message);
      } finally {
        if (isMounted) setFetchingMatches(false);
      }
    };

    fetchMatches();
    return () => {
      isMounted = false;
    };
  }, [open, singleSelectedStone]);

  const handlePairDirect = async (targetId, partnerId, pairLabel = "pair") => {
    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.product.pairAssign, {
        id1: targetId,
        id2: partnerId,
        pairName: pairLabel.trim() || "pair",
      });
      if (res.data?.status === false) {
        toastApiError({ response: { data: res.data } });
        return;
      }
      toastApiSuccess(res.data);
      form.resetFields();
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePair = async (values) => {
    if (selectedRows.length !== 2) {
      toastWarning("Select exactly two stones to pair");
      return;
    }
    await handlePairDirect(selectedRows[0].id, selectedRows[1].id, values.pairName);
  };

  const handleUnpair = async () => {
    if (!selectedRows.length) {
      toastWarning("Select stones to unpair");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.product.pairUnpair, {
        ids: selectedRows.map((r) => r.id),
      });
      if (res.data?.status === false) {
        toastApiError({ response: { data: res.data } });
        return;
      }
      toastApiSuccess(res.data);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LinkOutlined style={{ color: "var(--color-primary, #1e3a8a)" }} />
          <span>Smart Pair Management & Match Engine</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={selectedRows.length === 1 ? 760 : 540}
      destroyOnClose
    >
      {selectedRows.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="No Stones Selected"
          description="Please select 1 stone to find matching pairs automatically, or select 2 stones to pair manually."
          style={{ marginBottom: 16 }}
        />
      ) : selectedRows.length === 1 ? (
        <div style={{ marginBottom: 16 }}>
          <Alert
            type="info"
            showIcon
            icon={<ThunderboltOutlined />}
            message={`Finding Matches for SKU: ${singleSelectedStone.sku}`}
            description={`${singleSelectedStone.shape || "-"} · ${singleSelectedStone.carat || singleSelectedStone.polishCarat || "-"} ct · ${singleSelectedStone.colorDetail || singleSelectedStone.color || "-"} · ${singleSelectedStone.clarity || "-"}`}
            style={{ marginBottom: 14 }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <strong style={{ fontSize: 13 }}>Smart Matched Pair Candidates:</strong>
            {fetchingMatches ? <Spin size="small" /> : <Tag color="blue">{matchingCandidates.length} available</Tag>}
          </div>

          <Table
            size="small"
            pagination={{ pageSize: 5, size: "small" }}
            rowKey="id"
            loading={fetchingMatches}
            dataSource={matchingCandidates}
            locale={{ emptyText: "No matching single stones found in available inventory." }}
            columns={[
              {
                title: "SKU",
                dataIndex: "sku",
                key: "sku",
                width: 95,
                render: (text, record) => <SkuLink sku={text} record={record} />,
              },
              {
                title: "Carat",
                dataIndex: "polish_carat",
                key: "carat",
                width: 75,
                render: (v) => <strong>{v} ct</strong>,
              },
              {
                title: "Color/Clarity",
                key: "grade",
                width: 110,
                render: (_, r) => `${r.color || "-"} / ${r.clarity || "-"}`,
              },
              {
                title: "Cut/Pol/Sym",
                key: "make",
                width: 100,
                render: (_, r) => `${r.cut || "-"}/${r.polish || "-"}/${r.symmentry || "-"}`,
              },
              {
                title: "Match Score",
                dataIndex: "matchScore",
                key: "matchScore",
                width: 105,
                align: "center",
                render: (score) => (
                  <Tag
                    color={score >= 90 ? "green" : score >= 75 ? "blue" : "orange"}
                    style={{ fontWeight: 600, borderRadius: 10 }}
                  >
                    {score}% Match
                  </Tag>
                ),
              },
              {
                title: "Action",
                key: "action",
                width: 110,
                align: "right",
                render: (_, partner) => (
                  <Button
                    type="primary"
                    size="small"
                    loading={loading}
                    icon={<LinkOutlined />}
                    onClick={() => handlePairDirect(singleSelectedStone.id, partner.id)}
                  >
                    Pair Now
                  </Button>
                ),
              },
            ]}
          />
        </div>
      ) : selectedRows.length === 2 ? (
        <>
          <Alert
            type="success"
            showIcon
            message="2 Stones Selected for Pairing"
            description="Verify the two selected diamonds below and click 'Create Pair'."
            style={{ marginBottom: 16 }}
          />
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            dataSource={selectedRows}
            columns={[
              {
                title: "SKU",
                dataIndex: "sku",
                key: "sku",
                render: (text, record) => <SkuLink sku={text} record={record} />,
              },
              {
                title: "Carat",
                dataIndex: "polishCarat",
                key: "carat",
                render: (v, r) => <strong>{v ?? r.polish_carat ?? r.carat} ct</strong>,
              },
              {
                title: "Shape",
                dataIndex: "shape",
                key: "shape",
              },
              {
                title: "Color / Clarity",
                key: "colorClarity",
                render: (_, r) => `${r.colorDetail || r.color || "-"} / ${r.clarity || "-"}`,
              },
            ]}
            style={{ marginBottom: 16 }}
          />
        </>
      ) : (
        <Alert
          type="warning"
          showIcon
          message={`${selectedRows.length} stones selected`}
          description="To unpair, click 'Unpair Selected'. To create pairs, select exactly 2 stones."
          style={{ marginBottom: 16 }}
        />
      )}

      {selectedRows.length === 2 ? (
        <Form form={form} layout="vertical" onFinish={handlePair}>
          <Form.Item name="pairName" label="Pair Label (Optional)" initialValue="pair">
            <Input placeholder="e.g. Earring Pair, Studs Pair" />
          </Form.Item>
          <Space style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<LinkOutlined />}
              style={{ background: "var(--color-primary, #1e3a8a)" }}
            >
              Create Pair
            </Button>
          </Space>
        </Form>
      ) : selectedRows.length > 2 ? (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button onClick={onClose}>Close</Button>
          <Button danger loading={loading} icon={<DisconnectOutlined />} onClick={handleUnpair}>
            Unpair Selected ({selectedRows.length})
          </Button>
        </div>
      ) : null}
    </Modal>
  );
};

export default PairManagementModal;
