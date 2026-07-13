import React from "react";
import { Modal, Descriptions, Tag } from "antd";

const OutstandingCalculationModal = ({ open, onClose, data }) => {
    return (
        <Modal
            title={`Outstanding Details - ${data?.entryno || ""}`}
            open={open}
            onCancel={onClose}
            footer={null}
            width={650}
        >
            {data && (
                <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="Entry No">
                        {data.entryno}
                    </Descriptions.Item>

                    <Descriptions.Item label="Company">
                        {data.name || "-"}
                    </Descriptions.Item>

                    <Descriptions.Item label="Invoice No">
                        {data.invoiceno}
                    </Descriptions.Item>

                    <Descriptions.Item label="Invoice Date">
                        {data.invoicedate}
                    </Descriptions.Item>

                    <Descriptions.Item label="Due Date">
                        {data.due_date}
                    </Descriptions.Item>

                    <Descriptions.Item label="Term">
                        <Tag color="blue">{data.terms || 0} Days</Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="Paid Amount">
                        ₹ {Number(data.paid_amount || 0).toLocaleString()}
                    </Descriptions.Item>

                    <Descriptions.Item label="Due Amount">
                        ₹ {Number(data.due_amount || 0).toLocaleString()}
                    </Descriptions.Item>

                    <Descriptions.Item label="Final Amount">
                        <b>₹ {Number(data.final_amount || 0).toLocaleString()}</b>
                    </Descriptions.Item>
                </Descriptions>
            )}
        </Modal>
    );
};

export default OutstandingCalculationModal;