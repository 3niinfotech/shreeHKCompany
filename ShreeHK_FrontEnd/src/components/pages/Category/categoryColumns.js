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
        render: (parentId, record) => {
            if (!parentId || Number(parentId) === 0) return "-";
            // Prefer API parent_name (survives search filters that omit the parent row)
            if (record?.parent_name) return record.parent_name;
            const parentRow = dataSource.find((r) => Number(r.id) === Number(parentId));
            return parentRow ? parentRow.name : "-";
        }
    }
];
