import { getMasterRowNumberColumn } from "../../../utils/masterColumns";

export const getLabColumns = () => [
    getMasterRowNumberColumn(),
    { title: "Lab Name", dataIndex: "lab", key: "lab" },
    { title: "Date", dataIndex: "date", key: "lab" },
    { title: "Report Link", dataIndex: "reportlink", key: "reportlink" },
];
