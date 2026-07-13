import React from 'react';
import { Row, Col } from 'antd';
import styles from '../../../assets/scss/pages/accountings/mybalance.module.scss';
import BalanceBook from './BalanceBook';
import CurrancyRate from './CurrancyRate';
import BankTransfer from './BankTransfer';
import Live_Rate from './Live_Rate';

const MyBalance = () => {
    return (
        <div className={styles.container}>
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                    <BalanceBook />
                </Col>
                <Col xs={24} lg={12}>
                    <CurrancyRate />
                </Col>
                <Col xs={24} lg={12}>
                    <BankTransfer />
                </Col>
                <Col xs={24} lg={12}>
                    <Live_Rate />
                </Col>
            </Row>
        </div>
    );
};

export default MyBalance;
