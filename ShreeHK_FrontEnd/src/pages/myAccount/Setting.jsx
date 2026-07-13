import React, { useState } from 'react';

import { Layout, Menu, Form, Input, Button, Switch, Divider, Space, Typography, Table, Tag, message } from 'antd';

import {

    SettingOutlined,

    LockOutlined,

    GlobalOutlined,

    SaveOutlined,
    DatabaseOutlined

} from '@ant-design/icons';

import ApplicationViewToggle from '../../components/settings/ApplicationViewToggle';
import ThemeModeToggle from '../../components/settings/ThemeModeToggle';
import styles from '../../assets/scss/pages/settings.module.scss';

const { Content, Sider } = Layout;

const { Title, Text } = Typography;

const Settings = () => {

    const [activeTab, setActiveTab] = useState('general');

    const onFinish = (values) => {

        message.success('Settings updated successfully!');

        console.log('Success:', values);

    };

    return (

        <div className="page-shell">
        <Layout className={`settingsPage ${styles.settingsLayout}`}>

            <Sider width={250} theme="light" className={styles.settingsSider}>

                <Menu

                    mode="inline"

                    selectedKeys={[activeTab]}

                    onClick={(e) => setActiveTab(e.key)}

                    className={styles.settingsMenu}

                    items={[

                        { key: 'general', icon: <SettingOutlined />, label: 'General Configuration' },

                        { key: 'inventory', icon: <DatabaseOutlined />, label: 'Inventory Rules' },

                        { key: 'security', icon: <LockOutlined />, label: 'Security & Access' },

                        { key: 'localization', icon: <GlobalOutlined />, label: 'Currency & Units' },

                    ]}

                />

            </Sider>

            <Content className={styles.settingsContent}>

                {activeTab === 'general' && (

                    <div className={styles.sectionWrap}>

                        <Title level={4}>General Configuration</Title>

                        <Text type="secondary">Manage your diamond inventory system core details.</Text>

                        <Divider />



                        <Form layout="vertical" onFinish={onFinish} initialValues={{ company: 'Diamond ERP', prefix: 'DIA-' }}>

                            <Space direction="vertical" size="large" className={styles.fullWidth}>

                                <Form.Item label="Company Display Name" name="company" rules={[{ required: true }]}>

                                    <Input placeholder="e.g. 3ni Infotech" className={styles.inputMd} />

                                </Form.Item>



                                <Form.Item label="Stock ID Prefix" name="prefix">

                                    <Input className={styles.inputSm} />

                                </Form.Item>

                                <Form.Item label="Automatic RFID Sync" valuePropName="checked">

                                    <Switch defaultChecked />

                                    <Text className={styles.inlineHint} type="secondary">Sync inventory status with scanners every 5 minutes</Text>

                                </Form.Item>

                                <Divider />

                                <ApplicationViewToggle />

                                <Divider />

                                <ThemeModeToggle />

                                <Button type="primary" icon={<SaveOutlined />} htmlType="submit" size="large">

                                    Save Changes

                                </Button>

                            </Space>

                        </Form>

                    </div>

                )}

                {activeTab === 'inventory' && (
                    <div className={styles.sectionWrap}>
                        <Title level={4}>Inventory Rules</Title>
                        <Text type="secondary">Configure stock validation and operational preferences.</Text>
                        <Divider />
                        <Form
                            layout="vertical"
                            onFinish={onFinish}
                            initialValues={{ allowNegativeStock: false, autoHoldOnMismatch: true, defaultLotPrefix: 'LOT-' }}
                        >
                            <Space direction="vertical" size="large" className={styles.fullWidth}>
                                <Form.Item label="Default Lot Prefix" name="defaultLotPrefix">
                                    <Input className={styles.inputSm} />
                                </Form.Item>
                                <Form.Item label="Allow Negative Stock" name="allowNegativeStock" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                                <Form.Item label="Auto Hold On Stock Mismatch" name="autoHoldOnMismatch" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                                <Button type="primary" icon={<SaveOutlined />} htmlType="submit">
                                    Save Inventory Rules
                                </Button>
                            </Space>
                        </Form>
                    </div>
                )}

                {activeTab === 'security' && (

                    <div className={styles.sectionWrap}>

                        <Title level={4}>Security & Permissions</Title>

                        <Text type="secondary">Control who can view or edit sensitive stone data.</Text>

                        <Divider />

                        <Table
                            scroll={{ x: 640 }}

                            pagination={false}

                            dataSource={[

                                { key: '1', role: 'Super Admin', access: 'All Modules', status: 'Active' },

                                { key: '2', role: 'Sales Team', access: 'Inventory View Only', status: 'Restricted' },

                            ]}

                            columns={[

                                { title: 'Role Name', dataIndex: 'role', key: 'role' },

                                { title: 'Access Level', dataIndex: 'access', key: 'access' },

                                { title: 'Status', dataIndex: 'status', key: 'status', render: (text) => <Tag color={text === 'Active' ? 'green' : 'orange'}>{text}</Tag> },

                                { title: 'Action', key: 'action', render: () => <Button type="link">Edit</Button> },

                            ]}

                        />

                    </div>

                )}

                {activeTab === 'localization' && (
                    <div className={styles.sectionWrap}>
                        <Title level={4}>Currency & Units</Title>
                        <Text type="secondary">Set display formats used across inventory and reports.</Text>
                        <Divider />
                        <Form
                            layout="vertical"
                            onFinish={onFinish}
                            initialValues={{ currency: 'USD', caratPrecision: '2', weightUnit: 'carat' }}
                        >
                            <Space direction="vertical" size="large" className={styles.fullWidth}>
                                <Form.Item label="Default Currency" name="currency">
                                    <Input className={styles.inputSm} />
                                </Form.Item>
                                <Form.Item label="Carat Precision" name="caratPrecision">
                                    <Input className={styles.inputSm} />
                                </Form.Item>
                                <Form.Item label="Weight Unit" name="weightUnit">
                                    <Input className={styles.inputSm} />
                                </Form.Item>
                                <Button type="primary" icon={<SaveOutlined />} htmlType="submit">
                                    Save Localization
                                </Button>
                            </Space>
                        </Form>
                    </div>
                )}

            </Content>

        </Layout>

        </div>

    );

};

export default Settings;