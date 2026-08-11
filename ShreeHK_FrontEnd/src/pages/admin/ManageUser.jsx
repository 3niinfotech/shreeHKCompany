import React, { lazy, useEffect, useMemo, useState } from 'react';
import { Button, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { manageUserFromAdmin } from "./Data";
const MasterTemplate = lazy(() => import('../../components/common/masterCommon/MasterPageTemplate'));
const ConfirmDeleteModal = lazy(() => import("../../components/common/modals/ConfirmDeleteModal"));
import { useFetchApi, usePostApiRequest, useDeleteApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import Loader from '../../components/common/Loader';

const ManageUser = () => {
    const [offset, setOffset] = useState(0);
    const [combinedData, setCombinedData] = useState([]);
    const [editRecord, setEditRecord] = useState(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const { data, isLoading, isFetching, refetch } = useFetchApi(
        'getUsersAdmin',
        ENDPOINTS.admin.users,
        {},
        'GET',
        { refetchInterval: 30000 },
    );

    const { data: rolesData } = useFetchApi('getRolesList', ENDPOINTS.role.list);

    const { mutate: saveUser } = usePostApiRequest(ENDPOINTS.admin.saveUser, 'getUsersAdmin');
    const { mutate: deleteUser, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.admin.deleteUser, 'getUsersAdmin');

    const [deleteModal, setDeleteModal] = useState({ open: false, record: null });

    const roleOptions = useMemo(() => {
        if (!rolesData?.data) return [];
        return rolesData.data.map((r) => ({ key: r.id, label: r.name, value: r.id }));
    }, [rolesData]);

    const roleMap = useMemo(() => {
        const map = {};
        if (rolesData?.data) {
            rolesData.data.forEach((r) => { map[r.id] = r.name; });
        }
        return map;
    }, [rolesData]);

    const formFields = useMemo(() => {
        return manageUserFromAdmin.map((field) =>
            field.name === "userroll" ? { ...field, options: roleOptions } : field
        );
    }, [roleOptions]);

    // --- Table Columns Configuration ---
    const columns = [
        {
            title: 'No.',
            dataIndex: 'id',
            key: 'id',
            width: 70,
            render: (text, record, index) => offset + index + 1
        },
        { title: 'First Name', dataIndex: 'fname', key: 'fname' },
        { title: 'Last Name', dataIndex: 'lname', key: 'lname' },
        { title: 'User Name', dataIndex: 'username', key: 'username' },
        { title: 'Email Id', dataIndex: 'email', key: 'email' },
        { title: 'Mobile No', dataIndex: 'mobileno', key: 'mobileno', ellipsis: true },
        { title: 'User Role', dataIndex: 'userroll', key: 'userroll', render: (val) => roleMap[val] || val },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            width: 110,
            render: (val) => {
                const active = Number(val) !== 0;
                return (
                    <Tag color={active ? 'green' : 'red'}>
                        {active ? 'Active' : 'Inactive'}
                    </Tag>
                );
            },
        },
        {
            title: 'Online',
            dataIndex: 'is_online',
            key: 'is_online',
            width: 100,
            render: (val) => (
                <Tag color={val ? 'green' : 'default'}>
                    {val ? 'Online' : 'Offline'}
                </Tag>
            ),
        },
    ];

    // Mapping API data to Form Fields
    const mapApiToForm = (record) => {
        if (!record) return null;
        return {
            id: record.id,
            fname: record.fname ?? "",
            lname: record.lname ?? "",
            username: record.username ?? "",
            email: record.email ?? "",
            mobileno: record.mobileno ?? "",
            userroll: record.userroll ?? "",
            is_active: Number(record.is_active) !== 0 ? 1 : 0,
            password: "" // Security ke liye password khali rakha hai
        };
    };

    // Mapping Form Values to API Payload (Backend expects these keys)
    // const mapFormToApi = (values) => {
    //     return {
    //         fname: values.fname,
    //         lname: values.lname,
    //         username: values.username,
    //         email: values.email,
    //         mobileno: values.mobileno,
    //         userroll: values.userroll,
    //         password: values.password,
    //     };
    // };

    const openDelete = (record) => {
        setDeleteModal({ open: true, record });
    };

    const closeDelete = () => {
        setDeleteModal({ open: false, record: null });
    };

    const handleDelete = () => {
        deleteUser(deleteModal.record?.id, {
            onSuccess: () => {
                closeDelete();
                setOffset(0);
            }
        });
    };

    const handleEdit = (record) => {
        setEditRecord(record ? mapApiToForm(record) : { is_active: 1 });
    };

    const handleSave = (values) => {
        const payload = {
            id: editRecord?.id || 0,
            fname: values.fname,
            lname: values.lname,
            username: values.username,
            email: values.email,
            mobileno: values.mobileno,
            userroll: values.userroll,
            is_active: values.is_active ?? 1,
            password: values.password,
        };

        saveUser(payload, {
            onSuccess: () => {
                setEditRecord(null);
                setOffset(0);
            }
        });
    };

    useEffect(() => {
        if (data?.Data) {
            if (offset === 0) {
                setCombinedData(data.Data);
            } else {
                setCombinedData((prev) => [...prev, ...data.Data]);
            }

            if (isInitialLoading) {
                setIsInitialLoading(false);
            }
        }
    }, [data, offset]);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const fullHeight = document.documentElement.scrollHeight;

            if (fullHeight - (scrollTop + windowHeight) < 200) {
                if (!isFetching && combinedData.length < (data?.TotalItems || 0)) {
                    setOffset((prev) => prev + 1);
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isFetching, combinedData.length, data?.TotalItems]);

    if (isInitialLoading) {
        return <Loader />;
    }

    return (
        <>
            <MasterTemplate
                title="Manage Users"
                columns={columns}
                onDelete={openDelete}
                dataSource={combinedData}
                loading={isLoading && offset === 0}
                formFields={formFields}
                onEdit={handleEdit}
                onSave={handleSave}
                initialValues={editRecord}
                extraHeaderActions={(
                    <Button
                        icon={<ReloadOutlined />}
                        loading={isLoading || isFetching}
                        onClick={async () => {
                            setOffset(0);
                            const result = await refetch();
                            if (result?.data?.Data) {
                                setCombinedData(result.data.Data);
                            }
                        }}
                    >
                        Refresh
                    </Button>
                )}
            />

            <ConfirmDeleteModal
                open={deleteModal.open}
                title="Permanently Delete This User"
                entityName={`${deleteModal.record?.fname} ${deleteModal.record?.lname}`}
                loading={isDeleting}
                onCancel={closeDelete}
                onConfirm={handleDelete}
            />
        </>
    )
}

export default ManageUser;