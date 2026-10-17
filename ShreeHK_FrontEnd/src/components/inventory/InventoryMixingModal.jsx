import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Modal,
  Button,
  Radio,
  Select,
  Input,
  InputNumber,
  Table,
  Space,
  Tag,
  Spin,
  Segmented,
} from "antd";
import {
  Boxes,
  Package,
  CircleCheck,
  Undo2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  addStonesToBox,
  addStonesToParcel,
  fetchContainerChildren,
  postMixingUnbox,
  postMixingSeparate,
} from "../../api/services/productService";
import { useFetchApi } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../api/endpoints";
import { toastSuccess, toastError, toastWarning } from "../../utils/toastNotify";
import styles from "../../assets/scss/components/inventoryMixingModal.module.scss";

const MODES = [
  { label: "Add to Box", value: "to_box", icon: <Boxes size={14} /> },
  { label: "Add to Parcel", value: "to_parcel", icon: <Package size={14} /> },
  { label: "Box to Single", value: "box_to_single", icon: <Undo2 size={14} /> },
  { label: "Parcel to Single", value: "parcel_to_single", icon: <Undo2 size={14} /> },
];

/**
 * Universal Stock Mixing & Packaging Modal
 * Handles exact core diamond business flows:
 * 1. Add to Box (Single -> Box: Add to Existing or Create New Box)
 * 2. Add to Parcel (Single -> Parcel: Add to Existing or Create New Parcel)
 * 3. Box to Single (Box -> Single: Assign/Unbox stones or separate carats back to Single stock)
 * 4. Parcel to Single (Parcel -> Single: Assign/Unbox stones or separate carats back to Single stock)
 */
const InventoryMixingModal = ({
  open,
  onClose,
  selectedRows = [],
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  // Identify any container row selected in the inventory table
  const selectedBoxRow = useMemo(
    () => selectedRows.find((r) => r.groupType && r.groupType.toLowerCase() === "box"),
    [selectedRows]
  );
  const selectedParcelRow = useMemo(
    () => selectedRows.find((r) => r.groupType && r.groupType.toLowerCase() === "parcel"),
    [selectedRows]
  );
  const singleRows = useMemo(
    () => selectedRows.filter((r) => !r.groupType || r.groupType.toLowerCase() === "single"),
    [selectedRows]
  );

  const [activeMode, setActiveMode] = useState("to_box");
  const [sourceContainerId, setSourceContainerId] = useState(undefined);

  // On open, intelligently pre-select mode & container based on table selection
  useEffect(() => {
    if (open) {
      if (selectedBoxRow) {
        setActiveMode("box_to_single");
        setSourceContainerId(selectedBoxRow.id);
      } else if (selectedParcelRow) {
        setActiveMode("parcel_to_single");
        setSourceContainerId(selectedParcelRow.id);
      } else {
        setActiveMode("to_box");
        setSourceContainerId(undefined);
      }
    }
  }, [open, selectedBoxRow, selectedParcelRow]);

  // Mode change handler
  const handleModeChange = (mode) => {
    setActiveMode(mode);
    if (mode === "box_to_single") {
      setSourceContainerId(selectedBoxRow?.id || undefined);
    } else if (mode === "parcel_to_single") {
      setSourceContainerId(selectedParcelRow?.id || undefined);
    }
  };

  // Destination Options for to_box and to_parcel
  const [destMode, setDestMode] = useState("existing");
  const [targetContainerId, setTargetContainerId] = useState(undefined);
  const [newSku, setNewSku] = useState("");
  const [newRemark, setNewRemark] = useState("");

  // Child stones inside container (for box_to_single and parcel_to_single)
  const [childStones, setChildStones] = useState([]);
  const [selectedChildKeys, setSelectedChildKeys] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  // State for bulk lot separation into single stone (when childStones is empty)
  const [sepCarat, setSepCarat] = useState(1);
  const [sepPcs, setSepPcs] = useState(1);
  const [sepSku, setSepSku] = useState("");
  const [sepPrice, setSepPrice] = useState(0);
  const [sepRemark, setSepRemark] = useState("");

  // Fetch Existing Boxes
  const { data: boxListData } = useFetchApi(
    "BoxOptionsMixing",
    ENDPOINTS.product.inventory,
    { limit: 200, offset: 0, type: ["box"], available: "On Hand Stock" },
    "GET",
    { enabled: open }
  );

  // Fetch Existing Parcels
  const { data: parcelListData } = useFetchApi(
    "ParcelOptionsMixing",
    ENDPOINTS.product.inventory,
    { limit: 200, offset: 0, type: ["parcel"], available: "On Hand Stock" },
    "GET",
    { enabled: open }
  );

  const boxOptions = useMemo(() => {
    const rows = boxListData?.Data || [];
    return rows.map((b) => ({
      value: b.id,
      label: `${b.sku} (${b.polish_carat || 0} ct, ${b.polish_pcs || 0} pcs)`,
      raw: b,
    }));
  }, [boxListData]);

  const parcelOptions = useMemo(() => {
    const rows = parcelListData?.Data || [];
    return rows.map((p) => ({
      value: p.id,
      label: `${p.sku} (${p.polish_carat || 0} ct)`,
      raw: p,
    }));
  }, [parcelListData]);

  // Current selected source container details
  const currentContainer = useMemo(() => {
    if (!sourceContainerId) return null;
    const isBox = activeMode === "box_to_single";
    const list = isBox ? (boxListData?.Data || []) : (parcelListData?.Data || []);
    const found = list.find((item) => Number(item.id) === Number(sourceContainerId));
    if (found) return found;
    if (isBox && selectedBoxRow && Number(selectedBoxRow.id) === Number(sourceContainerId)) {
      return selectedBoxRow;
    }
    if (!isBox && selectedParcelRow && Number(selectedParcelRow.id) === Number(sourceContainerId)) {
      return selectedParcelRow;
    }
    return null;
  }, [sourceContainerId, activeMode, boxListData, parcelListData, selectedBoxRow, selectedParcelRow]);

  // Initialize bulk separation values whenever container changes
  useEffect(() => {
    if (currentContainer) {
      const containerPrice = Number(currentContainer.price || 0);
      setSepPrice(containerPrice);
      const containerCarat = Number(
        currentContainer.polish_carat ?? currentContainer.polishCarat ?? currentContainer.carat ?? 0
      );
      setSepCarat(containerCarat > 1 ? 1 : containerCarat);
      setSepPcs(1);
      setSepSku("");
      setSepRemark("");
    }
  }, [currentContainer]);

  // Load child stones when container is selected in unboxing modes
  const loadContainerChildren = useCallback(async (containerId) => {
    if (!containerId) {
      setChildStones([]);
      setSelectedChildKeys([]);
      return;
    }
    setLoadingChildren(true);
    try {
      const res = await fetchContainerChildren(containerId);
      if (res?.ok) {
        const children = res.children || [];
        setChildStones(children);
        setSelectedChildKeys(children.map((c) => c.id));
      } else {
        setChildStones([]);
        setSelectedChildKeys([]);
      }
    } catch (err) {
      toastError(err.message || "Failed to load container child stones");
      setChildStones([]);
      setSelectedChildKeys([]);
    } finally {
      setLoadingChildren(false);
    }
  }, []);

  useEffect(() => {
    if (open && (activeMode === "box_to_single" || activeMode === "parcel_to_single")) {
      if (sourceContainerId) {
        loadContainerChildren(sourceContainerId);
      } else {
        setChildStones([]);
        setSelectedChildKeys([]);
      }
    }
  }, [open, activeMode, sourceContainerId, loadContainerChildren]);

  // Calculate selected single stones totals (for Add to Box / Add to Parcel)
  const singleTotals = useMemo(() => {
    return singleRows.reduce(
      (acc, r) => {
        const pcs = Number(r.polishPcs ?? r.pcs ?? 1);
        const carat = Number(r.polishCarat ?? r.carat ?? 0);
        const amount = Number(r.amount ?? 0);
        return {
          pcs: acc.pcs + pcs,
          carat: acc.carat + carat,
          amount: acc.amount + amount,
        };
      },
      { pcs: 0, carat: 0, amount: 0 }
    );
  }, [singleRows]);

  const avgSinglePrice = singleTotals.carat > 0 ? Number((singleTotals.amount / singleTotals.carat).toFixed(2)) : 0;

  // Submit Handler
  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      // 1 & 2: Add to Box / Add to Parcel
      if (activeMode === "to_box" || activeMode === "to_parcel") {
        if (!singleRows.length) {
          toastWarning("Please select at least one single diamond from the table");
          setSubmitting(false);
          return;
        }

        const stoneIds = singleRows.map((r) => Number(r.id));

        if (destMode === "existing" && !targetContainerId) {
          toastWarning(`Please select an existing ${activeMode === "to_box" ? "Box" : "Parcel"}`);
          setSubmitting(false);
          return;
        }

        if (activeMode === "to_box") {
          const res = await addStonesToBox({
            mode: destMode,
            boxId: destMode === "existing" ? targetContainerId : undefined,
            newBoxSku: destMode === "new" ? newSku : undefined,
            remark: newRemark,
            stoneIds,
          });
          if (res?.ok) {
            toastSuccess(res.message || "Stones mixed into Box successfully");
            finishSuccess();
          } else {
            toastError(res?.message || "Failed to add stones to Box");
          }
        } else {
          const res = await addStonesToParcel({
            mode: destMode,
            parcelId: destMode === "existing" ? targetContainerId : undefined,
            newParcelSku: destMode === "new" ? newSku : undefined,
            remark: newRemark,
            stoneIds,
          });
          if (res?.ok) {
            toastSuccess(res.message || "Stones mixed into Parcel successfully");
            finishSuccess();
          } else {
            toastError(res?.message || "Failed to add stones to Parcel");
          }
        }
      } else {
        // 3 & 4: Box to Single / Parcel to Single
        const containerLabel = activeMode === "box_to_single" ? "Box" : "Parcel";

        if (!sourceContainerId) {
          toastWarning(`Please select a ${containerLabel} to assign single stones from`);
          setSubmitting(false);
          return;
        }

        if (childStones.length > 0) {
          // Unbox pre-existing child stones
          if (!selectedChildKeys.length) {
            toastWarning("Please select at least one stone to assign to Single stock");
            setSubmitting(false);
            return;
          }
          const res = await postMixingUnbox({
            containerId: sourceContainerId,
            stoneIds: selectedChildKeys,
          });
          if (res?.ok) {
            toastSuccess(res.message || `Stones unboxed from ${containerLabel} back to Single stock successfully`);
            finishSuccess();
          } else {
            toastError(res?.message || "Unboxing failed");
          }
        } else {
          // Bulk lot: separate carat weight into a new single stone
          const numCarat = Number(sepCarat || 0);
          if (numCarat <= 0) {
            toastWarning("Please enter a valid carat weight greater than 0");
            setSubmitting(false);
            return;
          }
          const maxCarat = Number(
            currentContainer?.polish_carat ?? currentContainer?.polishCarat ?? currentContainer?.carat ?? 0
          );
          if (numCarat > maxCarat + 0.001) {
            toastWarning(`Cannot assign ${numCarat} ct: Exceeds available container carat (${maxCarat} ct)`);
            setSubmitting(false);
            return;
          }

          const res = await postMixingSeparate({
            containerId: sourceContainerId,
            records: [
              {
                polish_pcs: Number(sepPcs || 1),
                polish_carat: numCarat,
                sku: sepSku?.trim() || undefined,
                price: Number(sepPrice || currentContainer?.price || 0),
                amount: Number((numCarat * Number(sepPrice || currentContainer?.price || 0)).toFixed(2)),
                remark: sepRemark?.trim() || undefined,
              },
            ],
          });
          if (res?.ok) {
            toastSuccess(res.message || `Single stone separated and assigned from ${containerLabel} successfully`);
            finishSuccess();
          } else {
            toastError(res?.message || "Separation failed");
          }
        }
      }
    } catch (err) {
      toastError(err.message || "An error occurred during operation");
    } finally {
      setSubmitting(false);
    }
  };

  const finishSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
    queryClient.invalidateQueries({ queryKey: ["myInventorySummary"] });
    queryClient.invalidateQueries({ queryKey: ["BoxOptions"] });
    queryClient.invalidateQueries({ queryKey: ["ParcelOptions"] });
    queryClient.invalidateQueries({ queryKey: ["BoxOptionsMixing"] });
    queryClient.invalidateQueries({ queryKey: ["ParcelOptionsMixing"] });
    onSuccess?.();
    onClose?.();
  };

  // Child table columns for unboxing
  const childColumns = [
    { title: "SKU", dataIndex: "sku", key: "sku", width: 120 },
    { title: "Carat", dataIndex: "carat", key: "carat", width: 80, align: "right" },
    { title: "Shape", dataIndex: "shape", key: "shape", width: 80 },
    { title: "Color", dataIndex: "color", key: "color", width: 70 },
    { title: "Clarity", dataIndex: "clarity", key: "clarity", width: 80 },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      width: 80,
      align: "right",
      render: (v) => <span className="inventory-finance-value inventory-price-value">${Number(v || 0).toLocaleString()}</span>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 90,
      align: "right",
      render: (v) => <span className="inventory-finance-value inventory-amount-value">${Number(v || 0).toLocaleString()}</span>,
    },
  ];

  const submitButtonLabel = useMemo(() => {
    if (activeMode === "to_box") return "Mix into Box";
    if (activeMode === "to_parcel") return "Mix into Parcel";
    const label = activeMode === "box_to_single" ? "Box" : "Parcel";
    if (childStones.length > 0) {
      return `Assign ${selectedChildKeys.length} Stone(s) to Single`;
    }
    return `Assign Single Stone from ${label}`;
  }, [activeMode, childStones.length, selectedChildKeys.length]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={780}
      title={
        <span>
          <Boxes size={18} style={{ verticalAlign: "middle", marginRight: 8, color: "#1e3a8a" }} />
          Stock Mixing & Packaging
        </span>
      }
      footer={null}
      destroyOnClose
      closable={false}
      maskClosable={false}
      mask={{ closable: false }}
      className={styles.mixingModal}
    >
      {/* Operation Segmented Modes — ALL 4 MODES ARE ALWAYS VISIBLE */}
      <div className={styles.modeTabs}>
        <Segmented
          options={MODES}
          value={activeMode}
          onChange={handleModeChange}
          block
          size="middle"
          style={{ marginTop: "5px" }}
        />
      </div>

      {/* Stock Summary Strip (Only for Add to Box / Add to Parcel) */}
      {(activeMode === "to_box" || activeMode === "to_parcel") && (
        <div className={styles.summaryCard}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Selected Items</span>
            <span className={styles.statValue}>
              {singleRows.length} {singleRows.length === 1 ? "Stone" : "Stones"}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Pcs</span>
            <span className={styles.statValue}>{singleTotals.pcs}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Carat</span>
            <span className={styles.statValue}>{singleTotals.carat.toFixed(2)} ct</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Avg Price / ct</span>
            <span className={styles.statValue}>${avgSinglePrice.toFixed(2)}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Amount</span>
            <span className={styles.statValue}>${singleTotals.amount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Form Content Area */}
      <div className={styles.formSection}>
        {/* MODE: ADD TO BOX */}
        {activeMode === "to_box" && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <span style={{ fontWeight: 600, marginRight: 12 }}>Destination:</span>
              <Radio.Group
                value={destMode}
                onChange={(e) => setDestMode(e.target.value)}
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="existing">Add to Existing Box</Radio.Button>
                <Radio.Button value="new">Create New Box</Radio.Button>
              </Radio.Group>
            </div>

            {destMode === "existing" ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
                  Select Target Box:
                </div>
                <Select
                  placeholder="Search & select Box SKU..."
                  style={{ width: "100%" }}
                  showSearch
                  optionFilterProp="label"
                  value={targetContainerId}
                  onChange={setTargetContainerId}
                  options={boxOptions}
                />
              </div>
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                    New Box SKU:
                  </div>
                  <Input
                    placeholder="Leave blank for auto-generated SKU"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                    Remark:
                  </div>
                  <Input
                    placeholder="Optional remarks"
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                  />
                </div>
              </Space>
            )}
          </Space>
        )}

        {/* MODE: ADD TO PARCEL */}
        {activeMode === "to_parcel" && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <span style={{ fontWeight: 600, marginRight: 12 }}>Destination:</span>
              <Radio.Group
                value={destMode}
                onChange={(e) => setDestMode(e.target.value)}
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="existing">Add to Existing Parcel</Radio.Button>
                <Radio.Button value="new">Create New Parcel</Radio.Button>
              </Radio.Group>
            </div>

            {destMode === "existing" ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
                  Select Target Parcel:
                </div>
                <Select
                  placeholder="Search & select Parcel SKU..."
                  style={{ width: "100%" }}
                  showSearch
                  optionFilterProp="label"
                  value={targetContainerId}
                  onChange={setTargetContainerId}
                  options={parcelOptions}
                />
              </div>
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                    New Parcel SKU:
                  </div>
                  <Input
                    placeholder="Leave blank for auto-generated SKU"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                    Remark:
                  </div>
                  <Input
                    placeholder="Optional remarks"
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                  />
                </div>
              </Space>
            )}
          </Space>
        )}

        {/* MODE: BOX TO SINGLE (Assign / Unbox from Box) */}
        {activeMode === "box_to_single" && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
                Select Source Box:
              </div>
              <Select
                placeholder="Search & select Box SKU to assign single stones from..."
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="label"
                value={sourceContainerId}
                onChange={setSourceContainerId}
                options={boxOptions}
              />
            </div>

            {currentContainer && (
              <div className={styles.containerBanner}>
                <div className={styles.bannerMain}>
                  <span>Source Box:</span>
                  <Tag color="blue" style={{ fontSize: 13, fontWeight: 700 }}>
                    {currentContainer.sku}
                  </Tag>
                </div>
                <div className={styles.bannerStats}>
                  <span>
                    Available:{" "}
                    <strong>
                      {Number(currentContainer.polish_carat ?? currentContainer.polishCarat ?? currentContainer.carat ?? 0).toFixed(2)} ct
                    </strong>
                  </span>
                  <span>
                    Pcs:{" "}
                    <strong>
                      {currentContainer.polish_pcs ?? currentContainer.polishPcs ?? currentContainer.pcs ?? 1}
                    </strong>
                  </span>
                  <span>
                    Rate: <strong>${Number(currentContainer.price || 0).toLocaleString()}</strong>
                  </span>
                </div>
              </div>
            )}

            {sourceContainerId && (
              <>
                {loadingChildren ? (
                  <div style={{ textAlign: "center", padding: "30px 0" }}>
                    <Spin tip="Loading stones inside Box..." />
                  </div>
                ) : childStones.length > 0 ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0" }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Stones inside this Box:</span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        Selected to Assign: <b>{selectedChildKeys.length}</b> of {childStones.length} stones
                      </span>
                    </div>
                    <div className={styles.childTableWrap}>
                      <Table
                        dataSource={childStones}
                        columns={childColumns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        rowSelection={{
                          selectedRowKeys: selectedChildKeys,
                          onChange: setSelectedChildKeys,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className={styles.separateGrid}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                          Carat Weight: *
                        </div>
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0.01}
                          max={Number(currentContainer?.polish_carat ?? currentContainer?.polishCarat ?? 999)}
                          step={0.01}
                          value={sepCarat}
                          onChange={setSepCarat}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                          Pcs:
                        </div>
                        <InputNumber
                          style={{ width: "100%" }}
                          min={1}
                          value={sepPcs}
                          onChange={setSepPcs}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                          New Single SKU:
                        </div>
                        <Input
                          placeholder="Auto-generated if blank"
                          value={sepSku}
                          onChange={(e) => setSepSku(e.target.value)}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                          Price / ct ($):
                        </div>
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          value={sepPrice}
                          onChange={setSepPrice}
                        />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                          Remark:
                        </div>
                        <Input
                          placeholder="Optional remarks"
                          value={sepRemark}
                          onChange={(e) => setSepRemark(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </Space>
        )}

        {/* MODE: PARCEL TO SINGLE (Assign / Unbox from Parcel) */}
        {activeMode === "parcel_to_single" && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
                Select Source Parcel:
              </div>
              <Select
                placeholder="Search & select Parcel SKU to assign single stones from..."
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="label"
                value={sourceContainerId}
                onChange={setSourceContainerId}
                options={parcelOptions}
              />
            </div>

            {currentContainer && (
              <div className={styles.containerBanner}>
                <div className={styles.bannerMain}>
                  <span>Source Parcel:</span>
                  <Tag color="cyan" style={{ fontSize: 13, fontWeight: 700 }}>
                    {currentContainer.sku}
                  </Tag>
                </div>
                <div className={styles.bannerStats}>
                  <span>
                    Available:{" "}
                    <strong>
                      {Number(currentContainer.polish_carat ?? currentContainer.polishCarat ?? currentContainer.carat ?? 0).toFixed(2)} ct
                    </strong>
                  </span>
                  <span>
                    Pcs:{" "}
                    <strong>
                      {currentContainer.polish_pcs ?? currentContainer.polishPcs ?? currentContainer.pcs ?? 1}
                    </strong>
                  </span>
                  <span>
                    Rate: <strong>${Number(currentContainer.price || 0).toLocaleString()}</strong>
                  </span>
                </div>
              </div>
            )}

            {sourceContainerId && (
              <>
                {loadingChildren ? (
                  <div style={{ textAlign: "center", padding: "30px 0" }}>
                    <Spin tip="Loading stones inside Parcel..." />
                  </div>
                ) : childStones.length > 0 ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0" }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Stones inside this Parcel:</span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        Selected to Assign: <b>{selectedChildKeys.length}</b> of {childStones.length} stones
                      </span>
                    </div>
                    <div className={styles.childTableWrap}>
                      <Table
                        dataSource={childStones}
                        columns={childColumns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        rowSelection={{
                          selectedRowKeys: selectedChildKeys,
                          onChange: setSelectedChildKeys,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className={styles.separateGrid}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                          Carat Weight: *
                        </div>
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0.01}
                          max={Number(currentContainer?.polish_carat ?? currentContainer?.polishCarat ?? 999)}
                          step={0.01}
                          value={sepCarat}
                          onChange={setSepCarat}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                          Pcs:
                        </div>
                        <InputNumber
                          style={{ width: "100%" }}
                          min={1}
                          value={sepPcs}
                          onChange={setSepPcs}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                          New Single SKU:
                        </div>
                        <Input
                          placeholder="Auto-generated if blank"
                          value={sepSku}
                          onChange={(e) => setSepSku(e.target.value)}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                          Price / ct ($):
                        </div>
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          value={sepPrice}
                          onChange={setSepPrice}
                        />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                          Remark:
                        </div>
                        <Input
                          placeholder="Optional remarks"
                          value={sepRemark}
                          onChange={(e) => setSepRemark(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </Space>
        )}
      </div>

      {/* Modal Actions Footer */}
      <div className={styles.modalFooter}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="primary"
          onClick={handleConfirm}
          loading={submitting}
          style={{ background: "#1e3a8a", borderColor: "#1e3a8a", fontWeight: 600 }}
          icon={<CircleCheck size={15} strokeWidth={2.25} />}
        >
          {submitButtonLabel}
        </Button>
      </div>
    </Modal>
  );
};

export default React.memo(InventoryMixingModal);
