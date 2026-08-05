import React from 'react';
import { useNavigate } from 'react-router-dom';
import { buildStoneHistoryUrl, buildTransferHistoryUrl } from '../utils/inventorySkuNavigation';
import { Modal, Button, Typography, Tag } from 'antd';
import {
    DatabaseOutlined, HistoryOutlined,
    EditOutlined, SwapOutlined, CloseOutlined
} from '@ant-design/icons';
import '../assets/scss/hooks/useSkuModal.scss';

const { Text } = Typography;

const SkuActionModal = ({ visible, skuData, onClose, onAction }) => {
    const navigate = useNavigate();

    // Check if skuData exists to avoid crashes
    if (!skuData) return null;

    const actionCards = [
        { key: 'inventory', label: 'Inventory', icon: <DatabaseOutlined />, redirect: '/transaction/stone-update' },
        { key: 'history', label: 'History', icon: <HistoryOutlined /> },
        { key: 'update', label: 'Update Stock', icon: <EditOutlined />, redirect: '/transaction/stone-update' },
        { key: 'transfer', label: 'Inter Transfer', icon: <SwapOutlined /> },
    ];

    const handleCardClick = (item) => {
        if (item.redirect) {
            onClose();
            const separator = item.redirect.includes('?') ? '&' : '?';
            navigate(`${item.redirect}${separator}skuupdate=${encodeURIComponent(skuData.sku)}`);
            return;
        }
        if (item.key === 'history') {
            onClose();
            navigate(buildStoneHistoryUrl(skuData.sku));
            return;
        }
        if (item.key === 'transfer') {
            onClose();
            navigate(buildTransferHistoryUrl(skuData.sku));
            return;
        }
        onAction(item.key, skuData);
    };

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            footer={null}
            centered
            width={505}
            closable={false}
            className="sku-action-modal"
            destroyOnClose={true}
            transitionName=""
            maskTransitionName=""
        >
            <div className="sku-action-modal__header">
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>
                    What you want to do with
                </Text>

                <div className="sku-title" style={{ margin: '0' }}>{skuData.sku}</div>

                <Tag color="blue" style={{ borderRadius: '4px', fontWeight: 'bold', marginTop: '6px' }}>
                    AVAILABLE
                </Tag>
            </div>

            <div className="sku-action-modal__body">
                <div className="sku-action-modal__grid">
                    {actionCards.map((item) => (
                        <div
                            key={item.key}
                            className="sku-action-modal__card"
                            onClick={() => handleCardClick(item)}
                        >
                            <div className="icon-wrapper">
                                {item.icon}
                            </div>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="sku-action-modal__footer">
                <Button
                    type="text"
                    icon={<CloseOutlined />}
                    className="cancel-btn"
                    onClick={onClose}
                    style={{ background: "red", color: "white" }}
                >
                    Cancel & Return
                </Button>
            </div>
        </Modal>
    );
};

export default SkuActionModal;