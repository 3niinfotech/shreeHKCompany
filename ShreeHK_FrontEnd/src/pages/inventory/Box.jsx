import InventoryToolbarListPage from "../../components/inventory/InventoryToolbarListPage";
import { mapInventoryRowCamel } from "../../utils/inventoryApiFilters";
import { boxParcelColumns } from "./inventoryBoxParcelColumns.jsx";
import "../../assets/scss/pages/inventory/box.module.scss";

const BoxInventory = () => (
    <InventoryToolbarListPage
        title="Box Inventory"
        queryKey="BoxInventory"
        baseFilters={{ type: ["box"], available: "On Hand Stock" }}
        mapRow={mapInventoryRowCamel}
        columns={boxParcelColumns}
        searchPlaceholder="Search Boxes..."
    />
);

export default BoxInventory;
