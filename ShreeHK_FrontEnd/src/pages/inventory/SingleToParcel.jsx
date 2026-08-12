import React, { useMemo, useState } from "react";
import {
  Table, Typography, Space, Input, Button, message,
} from "antd";
import { GiftOutlined, ReloadOutlined } from "@ant-design/icons";
import { Search, PackagePlus } from "lucide-react";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import useInventoryList from "../../hooks/useInventoryList";
import { mapInventoryRowCamel } from "../../utils/inventoryApiFilters";
import { singleStoneColumns } from "./inventoryBoxParcelColumns.jsx";
import AddDiamondToBoxModal from "./AddDiamondToBoxModal";
import { useFetchApi } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import { addStonesToParcel } from "../../api/services/productService";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import useTableSkeleton from "../../components/common/skeleton/useTableSkeleton";
import styles from "../../assets/scss/pages/inventory/singleToBoxModern.module.scss";

const { Text } = Typography;

const SingleToParcel = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    tableData,
    isLoading,
    isFetchingMore,
    totalItems,
    tableWrapRef,
    tableScrollY,
    refresh,
  } = useInventoryList({
    queryKey: "SingleToParcel",
    baseFilters: { type: ["single"], available: "On Hand Stock" },
    searchText,
    mapRow: mapInventoryRowCamel,
  });

  const { data: parcelListData } = useFetchApi(
    "ParcelOptions",
    ENDPOINTS.product.inventory,
    { limit: 200, offset: 0, type: ["parcel"], available: "On Hand Stock" },
  );

  const containerOptions = useMemo(() => {
    const rows = parcelListData?.Data || [];
    return rows.map((p) => ({ value: p.id, label: `${p.sku} (${p.polish_carat} ct)` }));
  }, [parcelListData]);

  const selectedRows = tableData.filter((r) => selectedRowKeys.includes(r.id));

  const handleOpenModal = () => {
    if (!selectedRowKeys.length) {
      message.warning("Select some rows first");
      return;
    }
    setIsModalOpen(true);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      const res = await addStonesToParcel({
        ...payload,
        parcelId: payload.boxId || payload.parcelId,
        newParcelSku: payload.newBoxSku || payload.newParcelSku,
      });
      if (res?.ok) {
        toastApiSuccess(res);
        setIsModalOpen(false);
        setSelectedRowKeys([]);
        refresh();
      } else {
        toastApiError({ response: { data: res } });
      }
    } catch (err) {
      toastApiError(err);
    } finally {
      setSaving(false);
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  const selectedTotals = selectedRows.reduce(
    (acc, r) => ({
      pcs: acc.pcs + Number(r.pcs || 0),
      carat: acc.carat + Number(r.carat || 0),
      amount: acc.amount + Number(r.amount || 0),
    }),
    { pcs: 0, carat: 0, amount: 0 },
  );

  const {
    columns: tableColumns,
    dataSource: skeletonData,
    tableLoading,
    showSkeleton,
  } = useTableSkeleton({
    columns: singleStoneColumns,
    dataSource: tableData,
    loading: isLoading || isFetchingMore,
    rowCount: 10,
    rowKey: "_skeletonKey",
  });

  return (
    <div className={styles.pageContainer}>
      <PageHeroHeader
        breadcrumb="INVENTORY"
        title="Singal To Parcel"
        icon={<GiftOutlined />}
        actions={(
          <Space wrap>
            <Input
              placeholder="Enter Sku..."
              prefix={<Search size={16} />}
              className={styles.searchInput}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={refresh} loading={isLoading || isFetchingMore}>
              Refresh
            </Button>
          </Space>
        )}
      />

      <div className={styles.toolbarCard}>
        <Space size="large" className={styles.statsRow}>
          <Text>Total Record: <b>{totalItems || tableData.length}</b></Text>
          <Text className={styles.selectedCount}>Selected: <b>{selectedRowKeys.length}</b></Text>
          <Text>Pcs: <b>{selectedTotals.pcs}</b></Text>
          <Text>Carats: <b>{selectedTotals.carat.toFixed(2)}</b></Text>
        </Space>
        <Button
          type="primary"
          icon={<PackagePlus size={16} />}
          onClick={handleOpenModal}
          className={styles.actionBtn}
        >
          ADD TO PARCEL
        </Button>
      </div>

      <div ref={tableWrapRef} className={`${styles.tableWrap} erp-table-container`}>
        <Table
          rowSelection={showSkeleton ? undefined : rowSelection}
          columns={tableColumns}
          dataSource={skeletonData}
          rowKey={showSkeleton ? "_skeletonKey" : "id"}
          loading={tableLoading}
          size="small"
          bordered
          className={styles.modernTable}
          scroll={{ x: 1800, y: tableScrollY }}
          pagination={false}
        />
      </div>

      <AddDiamondToBoxModal
        visible={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onSave={handleSave}
        selectedRows={selectedRows}
        containerType="parcel"
        containerOptions={containerOptions}
        loading={saving}
      />
    </div>
  );
};

export default SingleToParcel;
