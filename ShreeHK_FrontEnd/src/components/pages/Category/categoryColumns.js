import { getMasterRowNumberColumn } from "../../../utils/masterColumns";

// export const getCategoryColumns = () => [
//     getMasterRowNumberColumn(),
//     { title: "Name", dataIndex: "name", key: "name" },
//     { title: "Parent", dataIndex: "parent", key: "parent" },
// ];

export const getCategoryColumns = (dataSource = []) => [
    getMasterRowNumberColumn(),
    { title: "Name", dataIndex: "name", key: "name" },
    {
        title: "Parent",
        dataIndex: "parent",
        key: "parent",
        render: (parentId) => {
            const parentRow = dataSource.find((r) => r.id === parentId);
            return parentRow ? parentRow.name : "-";
        }
    }
];
