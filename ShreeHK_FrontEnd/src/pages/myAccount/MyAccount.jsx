import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Row, Col, Card, Avatar, Typography, Tabs,
    Form, Input, Button, Divider,
    Badge, Switch, List, Space, Tag
} from 'antd';
import {
    UserOutlined, MailOutlined, LockOutlined,
    CameraOutlined, SafetyCertificateOutlined,
    BellOutlined, GlobalOutlined, PhoneOutlined,
    CrownOutlined, IdcardOutlined, BankOutlined,
    TeamOutlined, SafetyOutlined, CalendarOutlined,
    HistoryOutlined, RightOutlined, ControlOutlined
} from '@ant-design/icons';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import { resolveUploadUrl } from '../../utils/uploadBaseUrl';
import useThemeColors from '../../hooks/useThemeColors';
import { cssVar } from '../../theme';
import styles from '../../assets/scss/pages/myAccount.module.scss';

const { Title, Text } = Typography;

const MyAccount = () => {
    const navigate = useNavigate();
    const theme = useThemeColors();
    const [form] = Form.useForm();
    const [securityForm] = Form.useForm();
    const [previewUrl, setPreviewUrl] = useState(null);
    const [address, setAddress] = useState("Loading...");
    const [selectedFile, setSelectedFile] = useState(null);
    // ─── API Hooks ───────────────────────────────────────────
    const { data: profileData, isLoading: isProfileLoading, refetch } = useFetchApi('GetAdminProfile', ENDPOINTS.profile.me);
    const { mutate: updateProfile, isLoading: isUpdating } = usePostApiRequest(ENDPOINTS.profile.update);
    const { mutate: changePassword, isLoading: isChangingPass } = usePostApiRequest(ENDPOINTS.profile.changePassword);

    const profile = profileData?.data;
    const isSuperAdmin = profile?.roll === 1;

    const adminShortcuts = [
        {
            key: 'company',
            title: 'Company',
            subtitle: 'Tenant & company details',
            path: '/admin/tenant-company',
            icon: <BankOutlined />,
            iconColor: 'var(--color-primary)',
            iconBg: 'var(--color-primary-light)',
        },
        {
            key: 'users',
            title: 'Manage Users',
            subtitle: 'User accounts & access',
            path: '/admin/manage-user',
            icon: <TeamOutlined />,
            iconColor: '#10b981',
            iconBg: 'rgba(16, 185, 129, 0.12)',
        },
        {
            key: 'roll',
            title: 'Roll',
            subtitle: 'Roles & permission matrix',
            path: '/admin/roll',
            icon: <SafetyOutlined />,
            iconColor: '#f59e0b',
            iconBg: 'rgba(245, 158, 11, 0.12)',
        },
        {
            key: 'fiscal-year',
            title: 'Fiscal Year',
            subtitle: 'Financial year setup',
            path: '/admin/fiscal-year',
            icon: <CalendarOutlined />,
            iconColor: '#6366f1',
            iconBg: 'rgba(99, 102, 241, 0.12)',
        },
        {
            key: 'activity-history',
            title: 'Activity History',
            subtitle: 'Audit logs & system activity',
            path: '/admin/activity-history',
            icon: <HistoryOutlined />,
            iconColor: '#ec4899',
            iconBg: 'rgba(236, 72, 153, 0.12)',
        },
    ];

    // Sync API data → Form fields
    useEffect(() => {
        if (profileData?.status && profile) {
            form.setFieldsValue({
                fname: profile.first_name,
                lname: profile.last_name,
                email: profile.user_email,
                phone: profile.mobile,
                designation: profile.designation,
                address: profile.address,
            });
        }
    }, [profileData, form]);

    useEffect(() => {
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
    }, [previewUrl]);

    // Geolocation
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
                    );
                    const data = await res.json();
                    setAddress(data.display_name);
                } catch {
                    setAddress("Location unavailable");
                }
            }, () => setAddress("Permission Denied!"));
        } else {
            setAddress("Geolocation not supported");
        }
    }, []);

    // ─── Handlers ────────────────────────────────────────────
    const onProfileFinish = (values) => {
        const formData = new FormData();

        Object.keys(values).forEach(key => {
            formData.append(key, values[key] || '');
        });

        if (selectedFile) {
            formData.append('profile_image', selectedFile);
        }

        updateProfile(formData, {
            onSuccess: (res) => {
                if (res.status) {
                    setSelectedFile(null);
                    refetch();
                }
            },
        });
    };

    const onPasswordFinish = (values) => {
        changePassword(values, {
            onSuccess: (res) => {
                if (res.status) {
                    securityForm.resetFields();
                }
            },
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) return;

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    // ─── Tab Items ───────────────────────────────────────────
    const tabItems = [
        {
            key: '1',
            label: 'Profile Information',
            children: (
                <Form form={form} layout="vertical" onFinish={onProfileFinish}>
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item label="First Name" name="fname" rules={[{ required: true, message: 'First name required' }]}>
                                <Input prefix={<UserOutlined />} placeholder="Enter first name" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item label="Last Name" name="lname">
                                <Input prefix={<UserOutlined />} placeholder="Enter last name" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item label="Email Address" name="email" rules={[{ type: 'email', required: true }]}>
                                <Input
                                    prefix={<MailOutlined />}
                                    placeholder="Enter email"
                                    disabled={!isSuperAdmin}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item label="Mobile Number" name="phone">
                                <Input prefix={<PhoneOutlined />} placeholder="+91 98765 43210" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item label="Designation" name="designation">
                                <Input prefix={<IdcardOutlined />} placeholder="Enter designation (e.g. Sales Manager)" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={24}>
                            <Form.Item label="Address" name="address">
                                <Input.TextArea placeholder="Enter address" rows={3} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={isUpdating}
                        style={{ background: cssVar('color-primary') }}
                    >
                        Save Changes
                    </Button>
                </Form>
            ),
        },
        {
            key: '2',
            label: 'Security',
            children: (
                <div style={{ maxWidth: '400px' }}>
                    <Title level={5}>Change Password</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                        Enter your current password to set a new one.
                    </Text>
                    <Form form={securityForm} layout="vertical" onFinish={onPasswordFinish}>
                        <Form.Item
                            label="Current Password"
                            name="oldPass"
                            rules={[{ required: true, message: 'Current password required' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Enter current password" />
                        </Form.Item>
                        <Form.Item
                            label="New Password"
                            name="newPass"
                            rules={[
                                { required: true, message: 'New password required' },
                                { min: 3, message: 'Minimum 3 characters' }
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Enter new password" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" danger loading={isChangingPass}>
                            Update Password
                        </Button>
                    </Form>
                </div>
            ),
        },
        {
            key: '3',
            label: 'Notifications',
            children: (
                <List
                    itemLayout="horizontal"
                    dataSource={[
                        { title: 'Email Alerts', desc: 'Receive daily inventory reports', icon: <MailOutlined /> },
                        { title: 'Push Notifications', desc: 'New transaction alerts', icon: <BellOutlined /> },
                    ]}
                    renderItem={(item) => (
                        <List.Item actions={[<Switch defaultChecked />]}>
                            <List.Item.Meta avatar={item.icon} title={item.title} description={item.desc} />
                        </List.Item>
                    )}
                />
            ),
        },
    ];

    return (
        <div style={{ padding: '24px', background: cssVar('color-bg-page'), minHeight: '90vh' }}>
            <Row gutter={[24, 24]}>

                {/* ── Left: Profile Card ── */}
                <Col xs={24} md={8}>
                    <Card
                        bordered={false}
                        style={{ textAlign: 'center', borderRadius: '12px' }}
                        loading={isProfileLoading}
                    >
                        {/* Avatar */}
                        <div
                            style={{
                                position: 'relative',
                                display: 'inline-block',
                                cursor: 'pointer',
                            }}
                            onClick={() => document.getElementById('profile-upload-input').click()}
                        >
                            <div style={{
                                borderRadius: '50%',
                                padding: 4,
                                background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryMedium}, ${theme.info})`,
                                display: 'inline-block',
                            }}>
                                <Avatar
                                    size={120}
                                    icon={<UserOutlined />}
                                    src={previewUrl || resolveUploadUrl(profile?.profile_image)}
                                    style={{ border: `3px solid ${cssVar('color-text-inverse')}` }}
                                />
                            </div>

                            <input
                                type="file"
                                id="profile-upload-input"
                                hidden
                                accept="image/*"
                                onChange={handleImageChange}
                            />

                            <div style={{
                                position: 'absolute',
                                bottom: 6,
                                right: 6,
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: theme.primary,
                                border: `2.5px solid ${cssVar('color-text-inverse')}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: cssVar('shadow-md'),
                                transition: 'transform 0.2s, background 0.2s',
                            }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.background = theme.primaryMedium; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = theme.primary; }}
                            >
                                <CameraOutlined style={{ color: cssVar('color-text-inverse'), fontSize: 16 }} />
                            </div>
                        </div>

                        {/* Name + Role & Designation Badges */}
                        <Title level={3} style={{ marginTop: '16px', marginBottom: 8 }}>
                            {profile?.first_name
                                ? `${profile.first_name} ${profile.last_name || ''}`.trim()
                                : profile?.user_name || 'Admin User'}
                        </Title>

                        <Space size={6} wrap style={{ marginBottom: 12, justifyContent: 'center', flexDirection: 'column' }}>
                            {isSuperAdmin
                                ? <Tag icon={<CrownOutlined />} color="gold" style={{ padding: '2px 10px', borderRadius: '12px', fontWeight: 600 }}>Super Admin</Tag>
                                : <Tag color="blue" style={{ padding: '2px 10px', borderRadius: '12px', fontWeight: 600 }}>{profile?.role_name || 'Admin'}</Tag>
                            }
                            {profile?.designation && (
                                <Tag icon={<IdcardOutlined />} color="cyan" style={{ padding: '2px 10px', borderRadius: '12px', fontWeight: 600 }}>
                                    {profile.designation}
                                </Tag>
                            )}
                        </Space>

                        <Divider />

                        {/* Extra Info */}
                        <div style={{ textAlign: 'left' }}>
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <div>
                                    <MailOutlined style={{ color: cssVar('color-info') }} /> <Text strong> Email:</Text>{' '}
                                    <Text>{profile?.user_email || '—'}</Text>
                                </div>
                                <div>
                                    <PhoneOutlined style={{ color: cssVar('color-success') }} /> <Text strong> Mobile:</Text>{' '}
                                    <Text>{profile?.mobile || '—'}</Text>
                                </div>
                                <div>
                                    <GlobalOutlined style={{ color: cssVar('color-warning') }} /> <Text strong> Location:</Text>{' '}
                                    <Text style={{ fontSize: 12 }}>{address}</Text>
                                </div>
                                <div>
                                    <SafetyCertificateOutlined style={{ color: cssVar('color-primary') }} /> <Text strong> Status:</Text>{' '}
                                    <Badge status="success" text="Active Account" />
                                </div>
                            </Space>
                        </div>
                    </Card>
                </Col>

                {/* ── Right: Tabs Card ── */}
                <Col xs={24} md={16}>
                    <Card
                        bordered={false}
                        style={{ borderRadius: '12px', minHeight: '450px' }}
                        loading={isProfileLoading}
                    >
                        <Tabs defaultActiveKey="1" items={tabItems} />
                    </Card>
                </Col>

            </Row>

            {/* ── Admin Shortcuts Card ── */}
            <div className={styles.adminShortcutCard}>
                <div className={styles.shortcutHeader}>
                    <div className={styles.shortcutTitleGroup}>
                        <div className={styles.shortcutTitleIcon}>
                            <ControlOutlined />
                        </div>
                        <div>
                            <Title level={4} className={styles.shortcutMainTitle}>
                                Admin Shortcuts
                            </Title>
                            <Text className={styles.shortcutSubtitle}>
                                Quick navigation access to system administration modules
                            </Text>
                        </div>
                    </div>
                </div>

                <div className={styles.shortcutGrid}>
                    {adminShortcuts.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={styles.shortcutButton}
                            onClick={() => navigate(item.path)}
                            aria-label={`Open ${item.title}`}
                        >
                            <span
                                className={styles.shortcutIcon}
                                style={{ color: item.iconColor, background: item.iconBg }}
                            >
                                {item.icon}
                            </span>

                            <span className={styles.shortcutContent}>
                                <span className={styles.shortcutLabel}>{item.title}</span>
                                <span className={styles.shortcutSublabel}>{item.subtitle}</span>
                            </span>

                            <span className={styles.shortcutArrow}>
                                <RightOutlined />
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MyAccount;