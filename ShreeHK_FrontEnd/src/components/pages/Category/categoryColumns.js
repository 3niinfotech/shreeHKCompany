import { getMasterRowNumberColumn } from "../../../utils/masterColumns";

export const getCategoryColumns = () => [
    getMasterRowNumberColumn(),
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Parent", dataIndex: "parent", key: "parent" },
];
