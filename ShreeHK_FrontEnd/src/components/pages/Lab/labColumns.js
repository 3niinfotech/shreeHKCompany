import dayjs from "dayjs";
import { getMasterRowNumberColumn } from "../../../utils/masterColumns";

export const getLabColumns = () => [
    getMasterRowNumberColumn(),
    { title: "Lab Name", dataIndex: "lab", key: "lab" },
    { title: "Date", dataIndex: "date", key: "lab", render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format("DD-MM-YYYY") : (v || "-")) },
    { title: "Report Link", dataIndex: "reportlink", key: "reportlink" },
];
