import React from "react";
import dayjs from "dayjs";
import { getMasterRowNumberColumn } from "../../../utils/masterColumns";

export const getLabColumns = () => [
    getMasterRowNumberColumn(),
    { title: "Lab Name", dataIndex: "lab", key: "lab" },
    { title: "Date", dataIndex: "date", key: "date", render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format("DD-MM-YYYY") : (v || "-")) },
    {
        title: "Report Link",
        dataIndex: "reportlink",
        key: "reportlink",
        render: (v) => {
            if (!v) return "-";
            const href = /^https?:\/\//i.test(v) ? v : `https://${v}`;
            return React.createElement(
                "a",
                {
                    href,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    style: { color: "var(--color-primary, #1677ff)", textDecoration: "underline", wordBreak: "break-all" },
                },
                v
            );
        },
    },
];
