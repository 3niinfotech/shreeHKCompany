import { renderLocationWithFlag } from "../../components/inventory/LocationWithFlag";
import { SkuLink } from "../../hooks/useSkuModalAction";
import { mapInventoryRowCamel } from "../../utils/inventoryApiFilters";

const numCol = (dataIndex, title, w = 80) => ({
    title,
    dataIndex,
    key: dataIndex,
    width: w,
    align: "right",
});

export const getCategorizeInventoryColumns = () => [
    { title: "Type", dataIndex: "group_type", key: "group_type", width: 88, ellipsis: true },
    {
        title: "Sku",
        dataIndex: "sku",
        key: "sku",
        width: 100,
        ellipsis: true,
        fixed: "left",
        render: (text, record) => (
            <SkuLink sku={text} record={mapInventoryRowCamel(record)} />
        ),
    },
    { title: "Lab", dataIndex: "lab", key: "lab", width: 64, ellipsis: true },
    { title: "Certificate.", dataIndex: "report_no", key: "report_no", width: 118, ellipsis: true },
    { title: "Shape", dataIndex: "shape", key: "shape", width: 88, ellipsis: true },
    numCol("polish_pcs", "Pcs", 64),
    numCol("polish_carat", "Carat", 72),
    { title: "Full Color", dataIndex: "main_color", key: "main_color", width: 96, ellipsis: true },
    { title: "Argyle Color", dataIndex: "argyle_color", key: "argyle_color", width: 110, ellipsis: true },
    { title: "In House Cla", dataIndex: "in_house_clarity", key: "in_house_clarity", width: 110, ellipsis: true },
    { title: "Clarity", dataIndex: "clarity", key: "clarity", width: 80, ellipsis: true },
    numCol("rap_price", "Rap", 88),
    numCol("cost", "Cost", 88),
    numCol("price", "Price", 88),
    numCol("amount", "Amount", 96),
    { title: "Size", dataIndex: "size", key: "size", width: 72, ellipsis: true },
    { title: "Fluorescence", dataIndex: "f_intensity", key: "f_intensity", width: 110, ellipsis: true },
    { title: "Cut", dataIndex: "cut", key: "cut", width: 72, ellipsis: true },
    { title: "Polish", dataIndex: "polish", key: "polish", width: 72, ellipsis: true },
    { title: "Symm", dataIndex: "symmentry", key: "symmentry", width: 72, ellipsis: true },
    numCol("table_pc", "Table", 72),
    numCol("depth_pc", "Depth", 72),
    { title: "Msurmnt", dataIndex: "mesurment", key: "mesurment", width: 100, ellipsis: true },
    { title: "Gridle", dataIndex: "gridle", key: "gridle", width: 88, ellipsis: true },
    { title: "Mining", dataIndex: "mining", key: "mining", width: 88, ellipsis: true },
    { title: "Origin", dataIndex: "origin", key: "origin", width: 88, ellipsis: true },
    { title: "Intensity", dataIndex: "intensity", key: "intensity", width: 96, ellipsis: true },
    { title: "Overtone", dataIndex: "overtone", key: "overtone", width: 88, ellipsis: true },
    { title: "Color", dataIndex: "color", key: "color", width: 72, ellipsis: true },
    {
        title: "LOC",
        dataIndex: "location",
        key: "location",
        width: 110,
        ellipsis: true,
        render: (val, record) => renderLocationWithFlag(val || record.loc),
    },
    { title: "Package", dataIndex: "package", key: "package", width: 88, ellipsis: true },
    { title: "BGM", dataIndex: "bgm", key: "bgm", width: 72, ellipsis: true },
    { title: "Eye Clean", dataIndex: "eyeclean", key: "eyeclean", width: 96, ellipsis: true },
    { title: "Group", dataIndex: "main_group", key: "main_group", width: 88, ellipsis: true },
    { title: "Sub Group", dataIndex: "sub_group", key: "sub_group", width: 96, ellipsis: true },
    { title: "Remark", dataIndex: "remark", key: "remark", width: 140, ellipsis: true },
];
