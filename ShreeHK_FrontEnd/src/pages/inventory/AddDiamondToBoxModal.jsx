import React, { useMemo, useState } from "react";
import { Modal, Button, Radio, Row, Col, Input, Select, Table, Typography } from "antd";
import { cssVar } from "../../theme";
import { SkuLink } from "../../hooks/useSkuModalAction";

const { Text } = Typography;

const AddDiamondToBoxModal = ({
    visible,
    onCancel,
    onSave,
    selectedRows = [],
    containerType = "box",
    containerOptions = [],
    loading = false,
}) => {
    const [mode, setMode] = useState("existing");
    const [boxId, setBoxId] = useState(undefined);
    const [newSku, setNewSku] = useState("");
    const [remark, setRemark] = useState("");

    const label = containerType === "parcel" ? "Parcel" : "Box";

    const dataSource = useMemo(() => selectedRows.map((row) => ({
        key: row.id,
        sku: row.sku,
        pcs: row.pcs ?? row.polish_pcs ?? 1,
        carats: row.carat ?? row.polish_carat ?? 0,
        price: row.price ?? 0,
        amount: row.amount ?? 0,
    })), [selectedRows]);

    const totals = dataSource.reduce(
        (acc, row) => ({
            pcs: acc.pcs + Number(row.pcs || 0),
            carats: acc.carats + Number(row.carats || 0),
            amount: acc.amount + Number(row.amount || 0),
        }),
        { pcs: 0, carats: 0, amount: 0 },
    );

    const columns = [
        { title: "SKU", dataIndex: "sku", key: "sku", align: "center", render: (text, record) => <SkuLink sku={text} record={record} /> },
        { title: "Pcs", dataIndex: "pcs", key: "pcs", align: "center" },
        { title: "Carats", dataIndex: "carats", key: "carats", align: "center" },
        { title: "Price", dataIndex: "price", key: "price", align: "center" },
        { title: "Amount", dataIndex: "amount", key: "amount", align: "center" },
    ];

    const handleSave = () => {
        onSave({
            mode,
            boxId: mode === "existing" ? boxId : undefined,
            parcelId: mode === "existing" ? boxId : undefined,
            newBoxSku: mode === "new" ? newSku : undefined,
            newParcelSku: mode === "new" ? newSku : undefined,
            remark,
            stoneIds: selectedRows.map((r) => r.id),
        });
    };

    return (
        <Modal
            title={`Add ${selectedRows.length} stone(s) to ${label}`}
            open={visible}
            onCancel={onCancel}
            width={800}
            footer={[
                <Button key="close" onClick={onCancel}>Close</Button>,
                <Button key="save" type="primary" loading={loading} onClick={handleSave}>
                    Save
                </Button>,
            ]}
        >
            <div style={{ textAlign: "center", marginBottom: 24 ,marginTop:24}}>
                <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} buttonStyle="solid">
                    <Radio.Button value="existing">Use Existing {label}</Radio.Button>
                    <Radio.Button value="new">Create New {label}</Radio.Button>
                </Radio.Group>
            </div>

            {mode === "existing" ? (
                <Row gutter={16} align="middle" style={{ marginBottom: 20 }}>
                    <Col span={3}><Text strong>Select {label}</Text></Col>
                    <Col span={18}>
                        <Select
                            placeholder={`Choose ${label.toLowerCase()}...`}
                            style={{ width: "50%" }}
                            value={boxId}
                            onChange={setBoxId}
                            options={containerOptions}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Col>
                </Row>
            ) : (
                <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col span={12}>
                        <Text type="secondary">New {label} SKU</Text>
                        <Input
                            placeholder={`${label} SKU`}
                            value={newSku}
                            onChange={(e) => setNewSku(e.target.value)}
                            style={{ marginTop: 5 }}
                        />
                    </Col>
                    <Col span={12}>
                        <Text type="secondary">Remark</Text>
                        <Input
                            placeholder="Remark"
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            style={{ marginTop: 5 }}
                        />
                    </Col>
                </Row>
            )}

            <Table
                columns={columns}
                dataSource={dataSource}
                pagination={false}
                bordered
                size="small"
                summary={() => (
                    <Table.Summary.Row style={{ backgroundColor: cssVar("color-bg-muted"), fontWeight: "bold" }}>
                        <Table.Summary.Cell index={0} align="center">Total</Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="center">{totals.pcs}</Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="center">{totals.carats.toFixed(2)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="center">—</Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="center">{totals.amount.toFixed(2)}</Table.Summary.Cell>
                    </Table.Summary.Row>
                )}
            />
        </Modal>
    );
};

export default AddDiamondToBoxModal;
