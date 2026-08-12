import { Table, Typography } from "antd";
import WarningActionModal from "../components/common/modals/WarningActionModal";
import { cssVar } from "../theme";
import { SkuLink } from "./useSkuModalAction";

const { Text } = Typography;

const EXIST_COLUMNS = [
    { title: "No.", width: 50, render: (_, __, index) => index + 1 },
    { title: "SKU", dataIndex: "sku", width: 140, render: (text, record) => <SkuLink sku={text} record={record} /> },
    { title: "Pcs", dataIndex: "polish_pcs", width: 70, align: "right" },
    { title: "Carat", dataIndex: "polish_carat", width: 80, align: "right" },
    { title: "Price", dataIndex: "price", width: 90, align: "right" },
    { title: "Amount", dataIndex: "amount", width: 100, align: "right" },
];

const ValidationTableModal = ({ isVisible, onClose, onSave, existData = [], loading = false }) => {
    const duplicates = Array.isArray(existData) ? existData : [];
    const hasDuplicates = duplicates.length > 0;

    return (
        <WarningActionModal
            isVisible={isVisible}
            onClose={onClose}
            onSave={onSave}
            saveLoading={loading}
        >
            {hasDuplicates ? (
                <div>
                    <Text type="danger" strong style={{ display: "block", marginBottom: 12 }}>
                        These SKU(s) already exist in stock:
                    </Text>
                    <Table
                        columns={EXIST_COLUMNS}
                        dataSource={duplicates.map((row, index) => ({ ...row, key: row.sku || index }))}
                        pagination={false}
                        size="small"
                        scroll={{ x: "max-content" }}
                    />
                    <Text type="secondary" style={{ display: "block", marginTop: 12 }}>
                        You can still save — duplicate SKUs will get a suffix (e.g. SKU-1).
                    </Text>
                </div>
            ) : (
                <div style={{ marginBottom: "20px" }}>
                    <Text type="success" strong style={{ fontSize: "18px", color: cssVar("color-success") }}>
                        Data does not exist!
                    </Text>
                </div>
            )}
        </WarningActionModal>
    );
};

export default ValidationTableModal;
