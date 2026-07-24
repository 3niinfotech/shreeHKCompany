

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Table, Button, Input, Select, Card, Typography, Space, Tooltip, Popconfirm, Form, Spin
} from 'antd';
import {
    PlusOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    SearchOutlined
} from '@ant-design/icons';
import DynamicFormField from "../../hooks/DynamicFormField"
import { BaseModal } from "../../components/common/modals";
import { useDeleteApiRequest, useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import { ConfirmDeleteModal } from "../../components/common/modals";
import styles from '../../assets/scss/pages/accountings/PartyWiseTransaction.module.scss';
import AICustomerSuggestModal from '../../components/ai/AICustomerSuggestModal';
import PageHeroHeader from '../../components/common/PageHeroHeader';
import { TeamOutlined } from '@ant-design/icons';
import { Sparkles } from 'lucide-react';
import { cssVar } from '../../theme';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';

const { Title, Text } = Typography;
const { Option } = Select;
const formFields = [
    {
        name: 'under_group',
        label: 'Under Group*',
        type: 'select',
        placeholder: 'Select Under Group',
        rules: [{ required: true, message: 'Please select under group' }],
        options: [
            { label: 'Office Expense', value: 'Office Expense' },
            { label: 'Test', value: 'Test' },
            { label: 'Testing', value: 'Testing' },
        ],
    },
    {
        name: 'under_subgroup',
        label: 'Under Sub Group*',
        type: 'select',
        placeholder: 'Select Sub Group',
        rules: [{ required: true, message: 'Please select sub group' }],
        options: [
            { label: 'Office Expense', value: 'Office Expense' },
            { label: 'Test', value: 'Test' },
            { label: 'Testing', value: 'Testing' },
        ],
    },
    {
        name: 'name',
        label: 'Company Name*',
        type: 'text',
        placeholder: 'Enter Company Name',
        rules: [{ required: true, message: 'Company name is required' }],
    },
    {
        name: 'contact_number',
        label: 'Contact Number*',
        type: 'text',
        placeholder: 'Enter Contact Number',
        rules: [{ required: true, message: 'Contact number is required' }],
    },
    {
        name: 'country',
        label: 'Country*',
        type: 'text',
        placeholder: 'Enter Country',
        initialValue: 'India',
    },
    {
        name: 'address',
        label: 'Address*',
        type: 'textarea',
        placeholder: 'Enter Full Address',
        rules: [{ required: true, message: 'Address is required' }],
        colSpan: 24, // Full width for address
    },
];

const LIMIT = 100;

const PartyWiseTransaction = ({ pageTitle = 'Party Wise Transaction' }) => {
    const [form] = Form.useForm();
    const [searchText, setSearchText] = useState('');
    const [selectedRowKey, setSelectedRowKey] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [allData, setAllData] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ open: false, record: null });
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [scrollFetching, setScrollFetching] = useState(false);
    const [aiSuggestTarget, setAiSuggestTarget] = useState(null);
    const tableRef = useRef(null);
    const tableScrollY = useTableBodyScrollHeight(tableRef, [allData.length, searchText]);

    // API Hooks
    const { data, isLoading: isFetching, isFetching: isRefetching, refetch } = useFetchApi(
        `GetPartyWiseTransaction_${offset}`,
        ENDPOINTS.partyWise.list,
        { limit: LIMIT, offset }
    );
    const { mutate: saveParty, isLoading: isSubmitting } = usePostApiRequest(ENDPOINTS.partyWise.save, 'SaveParty');
    const { mutate: partydelete, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.partyWise.delete, 'deleteparty');

    useEffect(() => {
        if (data?.Data) {
            const newRecords = Array.isArray(data.Data) ? data.Data : [data.Data];
            if (newRecords.length > 0) {
                setAllData(prev => {
                    if (offset === 0) return newRecords;
                    const existingIds = new Set(prev.map(item => item.id));
                    return [...prev, ...newRecords.filter(item => !existingIds.has(item.id))];
                });
                if (newRecords.length < LIMIT) setHasMore(false);
            } else {
                setHasMore(false);
            }
            setScrollFetching(false);
        }
    }, [data, offset]);

    const handleTableScroll = useCallback((e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50 && !scrollFetching && !isRefetching && hasMore) {
            setScrollFetching(true);
            setOffset(prev => prev + LIMIT);
        }
    }, [scrollFetching, isRefetching, hasMore]);

    const resetAndRefetch = () => {
        setOffset(0);
        setAllData([]);
        setHasMore(true);
        refetch();
    };

    // Handle Modal Open (Add / Edit)
    const showModal = (record = null) => {
        if (record) {
            setEditingId(record.id);
            form.setFieldsValue({
                under_group: record.under_group,
                under_subgroup: record.under_subgroup,
                name: record.name,
                address: record.address,
                country: record.country || 'India',
                email: record.email,
                contact_number: record.contact_number,
                contact_person: record.contact_person
            });
        } else {
            setEditingId(null);
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    const handleInternalSave = () => {
        form.validateFields().then((values) => {
            const payload = { ...values, id: editingId };
            saveParty(payload, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    resetAndRefetch();
                },
            });
        });
    };

    const handleDelete = () => {
        const id = deleteModal.record?.id;
        if (!id) return;

        partydelete(id, {
            onSuccess: () => {
                closeDelete();
                resetAndRefetch();
            },
        });
    };

    const openDelete = (record) => {
        setDeleteModal({ open: true, record });
    };

    const closeDelete = () => {
        setDeleteModal({ open: false, record: null });
    };

    const columns = [
        {
            title: 'Sr.No',
            key: 'srNo',
            width: 70,
            align: 'center',
            render: (_, __, index) => index + 1
        },
        { title: 'Group', dataIndex: 'under_group', key: 'under_group' },
        { title: 'Sub Group', dataIndex: 'under_subgroup', key: 'under_subgroup' },
        {
            title: 'Party',
            dataIndex: 'name',
            width: 250,
            key: 'name',
            render: (text, record) => (
                <Text style={{ color: record.id === selectedRowKey ? cssVar('color-text-inverse') : 'inherit', fontWeight: 500 }}>
                    {text}
                </Text>
            )
        },
        { title: 'Contact Number', dataIndex: 'contact_number', key: 'contact_number' },
        {
            title: 'Address',
            dataIndex: 'address',
            key: 'address',
            ellipsis: true,
            width: 300
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'center',
            width: 150,
            render: (_, record) => (
                <Space size="middle">
                    {/* <Tooltip title="AI Suggest">
                        <Sparkles
                            size={16}
                            style={{ color: record.id === selectedRowKey ? cssVar('color-text-inverse') : cssVar('color-chart-violet'), cursor: 'pointer' }}
                            onClick={() => setAiSuggestTarget(record)}
                        />
                    </Tooltip> */}
                    <EyeOutlined
                        style={{ color: record.id === selectedRowKey ? cssVar('color-text-inverse') : cssVar('color-info'), cursor: 'pointer' }}
                        onClick={() => setSelectedRowKey(record.id === selectedRowKey ? null : record.id)}
                    />
                    <EditOutlined
                        style={{ color: record.id === selectedRowKey ? cssVar('color-text-inverse') : cssVar('color-success'), cursor: 'pointer' }}
                        onClick={() => showModal(record)}
                    />
                    <Popconfirm title="Delete Party" onConfirm={() => handleDelete(record.id)}>
                        <DeleteOutlined
                            style={{ color: cssVar('color-error'), cursor: 'pointer' }}
                            onClick={() => openDelete(record)}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className={styles.pageContainer}>
            <PageHeroHeader
                breadcrumb="ACCOUNTING"
                title={pageTitle}
                icon={<TeamOutlined />}
                actions={(
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
                        Add New Party
                    </Button>
                )}
            />

            <Card className={styles.tableCard}>
                <div ref={tableRef} className="erp-table-container">
                <Table
                    columns={columns}
                    dataSource={allData}
                    rowKey="id"
                    loading={isFetching && offset === 0}
                    pagination={false}
                    bordered
                    size="small"
                    scroll={{ y: tableScrollY }}
                    onScroll={handleTableScroll}
                    rowClassName={(record) => record.id === selectedRowKey ? styles.activeRow : ''}
                    footer={() => (
                        <div style={{ textAlign: 'center', padding: 4, fontSize: 12, color: cssVar('color-text-muted') }}>
                            {(isRefetching || scrollFetching) ? <Spin size="small" /> :
                                hasMore ? 'Scroll down for more...' : `Total ${allData.length} records`}
                        </div>
                    )}
                />
                </div>
            </Card>

            {/* FORM MODAL INTEGRATION */}
            <BaseModal
                title={editingId ? "Edit Party" : "Add New Party"}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleInternalSave}
                loading={isSubmitting}
                width={800}
                saveBtnText={editingId ? "Update" : "Save"}
                content={
                    <Form
                        form={form}
                        layout="vertical"
                        key={editingId ? editingId : 'add'}
                    >
                        <DynamicFormField
                            fields={formFields}
                            forceFullWidth={formFields.length <= 2}
                        />
                    </Form>
                }
            />
            <ConfirmDeleteModal
                open={deleteModal.open}
                title="Delete Category"
                entityName={deleteModal.record?.name}
                loading={isDeleting}
                onCancel={closeDelete}
                onConfirm={handleDelete}
            />

            {/* <AICustomerSuggestModal
                open={!!aiSuggestTarget}
                onClose={() => setAiSuggestTarget(null)}
                customerId={aiSuggestTarget?.id}
                customerName={aiSuggestTarget?.name}
            /> */}
        </div>
    );
};

export default PartyWiseTransaction;