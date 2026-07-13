import InventoryToolbarListPage from "../../components/inventory/InventoryToolbarListPage";
import { mapInventoryRowCamel } from "../../utils/inventoryApiFilters";
import { boxParcelColumns } from "./inventoryBoxParcelColumns.jsx";
import "../../assets/scss/pages/inventory/box.module.scss";

const Parcel = () => (
    <InventoryToolbarListPage
        title="Parcel Inventory"
        queryKey="ParcelInventory"
        baseFilters={{ type: ["parcel"], available: "On Hand Stock" }}
        mapRow={mapInventoryRowCamel}
        columns={boxParcelColumns}
        searchPlaceholder="Search Parcels..."
    />
);

export default Parcel;
