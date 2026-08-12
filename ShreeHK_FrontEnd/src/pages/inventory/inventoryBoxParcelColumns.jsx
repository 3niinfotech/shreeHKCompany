import { Typography } from "antd";
import { renderLocationWithFlag } from "../../components/inventory/LocationWithFlag";
import { SkuLink } from "../../hooks/useSkuModalAction";

const { Text } = Typography;

export const boxParcelColumns = [
    { title: "Mfg.Code", dataIndex: "mfgCode", key: "mfgCode", width: 110, fixed: "left" },
    {
        title: "Sku", dataIndex: "sku", key: "sku", width: 110, fixed: "left",
        render: (text, record) => <SkuLink sku={text} record={record} />,
    },
    { title: "Lab", dataIndex: "lab", key: "lab", width: 80 },
    { title: "Certificate", dataIndex: "certificate", key: "certificate", width: 120 },
    { title: "Shape", dataIndex: "shape", key: "shape", width: 100 },
    { title: "Polish Pcs", dataIndex: "pcs", key: "pcs", width: 100, align: "right" },
    { title: "Polish Carat", dataIndex: "carat", key: "carat", width: 110, align: "right" },
    { title: "Type", dataIndex: "type", key: "type", width: 100 },
    { title: "Main Color", dataIndex: "color", key: "color", width: 100 },
    { title: "Clarity", dataIndex: "clarity", key: "clarity", width: 100 },
    { title: "Cost", dataIndex: "cost", key: "cost", width: 100, align: "right" },
    { title: "Rap Price", dataIndex: "rapPrice", key: "rapPrice", width: 100, align: "right" },
    { title: "Price", dataIndex: "price", key: "price", width: 100, align: "right" },
    { title: "Amount", dataIndex: "amount", key: "amount", width: 120, align: "right" },
    { title: "Location", dataIndex: "loc", key: "loc", width: 120, render: renderLocationWithFlag },
    { title: "Remark", dataIndex: "remark", key: "remark", width: 150 },
];

export const singleStoneColumns = [
    { title: "Mfg.Code", dataIndex: "mfgCode", key: "mfgCode", width: 80, fixed: "left" },
    {
        title: "Sku", dataIndex: "sku", key: "sku", width: 100, fixed: "left",
        render: (text, record) => <SkuLink sku={text} record={record} />,
    },
    { title: "Lab", dataIndex: "lab", key: "lab", width: 80 },
    { title: "Certificate", dataIndex: "certificate", key: "certificate", width: 120 },
    { title: "Shape", dataIndex: "shape", key: "shape", width: 100 },
    { title: "Polish Pcs", dataIndex: "pcs", key: "pcs", width: 80, align: "right" },
    { title: "Polish Carat", dataIndex: "carat", key: "carat", width: 90, align: "right" },
    { title: "Type", dataIndex: "type", key: "type", width: 120 },
    { title: "Main Color", dataIndex: "color", key: "color", width: 190 },
    { title: "Clarity", dataIndex: "clarity", key: "clarity", width: 65 },
    { title: "Cost", dataIndex: "cost", key: "cost", width: 100, align: "right" },
    { title: "Rap Price", dataIndex: "rapPrice", key: "rapPrice", width: 100, align: "right" },
    { title: "Price", dataIndex: "price", key: "price", width: 100, align: "right" },
    { title: "Amount", dataIndex: "amount", key: "amount", width: 100, align: "right", render: (val) => <Text strong>{val}</Text> },
    { title: "Location", dataIndex: "loc", key: "loc", width: 80, render: renderLocationWithFlag },
    { title: "Remark", dataIndex: "remark", key: "remark", width: 150 },
];
