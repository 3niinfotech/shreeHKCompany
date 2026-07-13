import { getMasterRowNumberColumn } from "../../../utils/masterColumns";

export const getShippingColumns = () => [
    getMasterRowNumberColumn(),
    { title: "Shipping Name", dataIndex: "name", key: "name" },
];
