import { Typography } from "antd";
import { renderLocationWithFlag } from "../../components/inventory/LocationWithFlag";
import { SkuLink } from "../../hooks/useSkuModalAction";

const { Text } = Typography;

export const boxParcelColumns = [
    { title: "Mfg.Code", dataIndex: "mfgCode", key: "mfgCode", minWidth: 90, width: 90 },
    {
        title: "Sku", dataIndex: "sku", key: "sku", minWidth: 110, width: 110,
        render: (text, record) => <SkuLink sku={text} record={record} />,
    },
    { title: "Lab", dataIndex: "lab", key: "lab", minWidth: 80, width: 80 },
    { title: "Certificate", dataIndex: "certificate", key: "certificate", minWidth: 120, width: 120 },
    { title: "Shape", dataIndex: "shape", key: "shape", minWidth: 100, width: 100 },
    { title: "Polish Pcs", dataIndex: "pcs", key: "pcs", minWidth: 90, width: 90, align: "right" },
    { title: "Polish Carat", dataIndex: "carat", key: "carat", minWidth: 100, width: 100, align: "right" },
    { title: "Type", dataIndex: "type", key: "type", minWidth: 100, width: 100 },
    { title: "Main Color", dataIndex: "color", key: "color", minWidth: 110, width: 110 },
    { title: "Clarity", dataIndex: "clarity", key: "clarity", minWidth: 80, width: 80 },
    { title: "Cost", dataIndex: "cost", key: "cost", minWidth: 90, width: 90, align: "right" },
    { title: "Rap Price", dataIndex: "rapPrice", key: "rapPrice", minWidth: 90, width: 90, align: "right" },
    { title: "Price", dataIndex: "price", key: "price", minWidth: 90, width: 90, align: "right" },
    { title: "Amount", dataIndex: "amount", key: "amount", minWidth: 110, width: 110, align: "right" },
    { title: "Location", dataIndex: "loc", key: "loc", minWidth: 100, width: 100, render: renderLocationWithFlag },
    { title: "Remark", dataIndex: "remark", key: "remark", minWidth: 140 },
];

export const singleStoneColumns = [
    { title: "Mfg.Code", dataIndex: "mfgCode", key: "mfgCode", minWidth: 90, width: 90 },
    {
        title: "Sku", dataIndex: "sku", key: "sku", minWidth: 110, width: 110,
        render: (text, record) => <SkuLink sku={text} record={record} />,
    },
    { title: "Lab", dataIndex: "lab", key: "lab", minWidth: 80, width: 80 },
    { title: "Certificate", dataIndex: "certificate", key: "certificate", minWidth: 120, width: 120 },
    { title: "Shape", dataIndex: "shape", key: "shape", minWidth: 100, width: 100 },
    { title: "Polish Pcs", dataIndex: "pcs", key: "pcs", minWidth: 90, width: 90, align: "right" },
    { title: "Polish Carat", dataIndex: "carat", key: "carat", minWidth: 100, width: 100, align: "right" },
    { title: "Type", dataIndex: "type", key: "type", minWidth: 100, width: 100 },
    { title: "Main Color", dataIndex: "color", key: "color", minWidth: 120, width: 120 },
    { title: "Clarity", dataIndex: "clarity", key: "clarity", minWidth: 80, width: 80 },
    { title: "Cost", dataIndex: "cost", key: "cost", minWidth: 90, width: 90, align: "right" },
    { title: "Rap Price", dataIndex: "rapPrice", key: "rapPrice", minWidth: 90, width: 90, align: "right" },
    { title: "Price", dataIndex: "price", key: "price", minWidth: 90, width: 90, align: "right" },
    { title: "Amount", dataIndex: "amount", key: "amount", minWidth: 110, width: 110, align: "right", render: (val) => <Text strong>{val}</Text> },
    { title: "Location", dataIndex: "loc", key: "loc", minWidth: 100, width: 100, render: renderLocationWithFlag },
    { title: "Remark", dataIndex: "remark", key: "remark", minWidth: 140 },
];
