import { getMasterRowNumberColumn } from "../../../utils/masterColumns";

export const getOriginColumns = () => [
    getMasterRowNumberColumn(),
    {
        title: "Name",
        dataIndex: "name",
        key: "name",
    },
];
