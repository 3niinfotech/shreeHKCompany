import React, { useState } from "react";
import { Button } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import InventoryToolbarListPage from "../../components/inventory/InventoryToolbarListPage";
import PairManagementModal from "../../components/inventory/PairManagementModal";
import { mapInventoryRowCamel } from "../../utils/inventoryApiFilters";
import { renderLocationWithFlag } from "../../components/inventory/LocationWithFlag";
import { cssVar } from "../../theme";
import "../../assets/scss/pages/inventory/box.module.scss";

const pairColumns = [
    { title: "Mfg.Code", dataIndex: "mfgCode", key: "mfgCode", width: 110, fixed: "left" },
    { title: "Sku", dataIndex: "sku", key: "sku", width: 110, fixed: "left" },
    { title: "Pair", dataIndex: "pair", key: "pair", width: 80 },
    { title: "Location", dataIndex: "loc", key: "loc", width: 120, render: renderLocationWithFlag },
    { title: "Shape", dataIndex: "shape", key: "shape", width: 100 },
    { title: "Carat", dataIndex: "carat", key: "carat", width: 80, align: "right" },
    { title: "Color", dataIndex: "colorDetail", key: "colorDetail", width: 80 },
    { title: "Clarity", dataIndex: "clarity", key: "clarity", width: 90 },
    { title: "Lab", dataIndex: "lab", key: "lab", width: 70 },
    { title: "Rap", dataIndex: "rapPrice", key: "rapPrice", width: 90, align: "right" },
    { title: "Price", dataIndex: "price", key: "price", width: 90, align: "right" },
    { title: "Amount", dataIndex: "amount", key: "amount", width: 110, align: "right" },
    { title: "Certificate", dataIndex: "certificate", key: "certificate", width: 120 },
    { title: "Remark", dataIndex: "remark", key: "remark", width: 150 },
];

const Pair = () => {
    const [pairModalOpen, setPairModalOpen] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <>
            <InventoryToolbarListPage
                key={refreshKey}
                title="Pair Inventory"
                queryKey={`PairInventory_${refreshKey}`}
                baseFilters={{ pair: "pair", available: "On Hand Stock" }}
                mapRow={mapInventoryRowCamel}
                columns={pairColumns}
                searchPlaceholder="Search Pairs..."
                onSelectedRowsChange={(rows) => setSelectedRows(rows || [])}
                extraToolbarActions={
                    <Button
                        size="small"
                        icon={<LinkOutlined />}
                        onClick={() => setPairModalOpen(true)}
                        style={{ color: cssVar("color-primary") }}
                    >
                        Manage Pairs
                    </Button>
                }
            />
            <PairManagementModal
                open={pairModalOpen}
                selectedRows={selectedRows}
                onClose={() => setPairModalOpen(false)}
                onSuccess={() => setRefreshKey((k) => k + 1)}
            />
        </>
    );
};

export default Pair;
