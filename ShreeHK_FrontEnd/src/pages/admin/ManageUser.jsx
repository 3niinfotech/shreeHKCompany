import React, { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Tag, Avatar } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { manageUserFromAdmin } from "./Data";
import UserQuickInspectPanel from '../../components/admin/UserQuickInspectPanel';
import { useFetchApi, usePostApiRequest, useDeleteApiRequest } from '../../api/ApiFunction';
const MasterTemplate = lazy(() => import('../../components/common/masterCommon/MasterPageTemplate'));
const ConfirmDeleteModal = lazy(() => import("../../components/common/modals/ConfirmDeleteModal"));
import { ENDPOINTS } from '../../constants/endpoints';
import { resolveUploadUrl } from '../../utils/uploadBaseUrl';

const formatDate = (value) => (value && dayjs(value).isValid() ? dayjs(value).format('DD-MM-YYYY') : '-');
const formatDateTime = (value) => (value && dayjs(value).isValid() ? dayjs(value).format('DD-MM-YYYY HH:mm') : '-');

const toPhotoFileList = (src) => {
    if (!src) return [];
    return [{ uid: '-1', name: 'photo', status: 'done', url: resolveUploadUrl(src) }];
};

const ManageUser = () => {
    const [offset, setOffset] = useState(0);
    const [combinedData, setCombinedData] = useState([]);
    const [editRecord, setEditRecord] = useState(null);

    const { data, isLoading, isFetching, refetch } = useFetchApi(
        'getUsersAdmin',
        ENDPOINTS.admin.users,
        {},
        'GET',
        { refetchInterval: 30000 },
    );

    const { data: rolesData } = useFetchApi('getRolesList', ENDPOINTS.role.list);

    const { mutateAsync: saveUser } = usePostApiRequest(ENDPOINTS.admin.saveUser, 'getUsersAdmin');
    const { mutate: deleteUser, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.admin.deleteUser, 'getUsersAdmin');

    const [deleteModal, setDeleteModal] = useState({ open: false, record: null });
    const [inspectUser, setInspectUser] = useState(null);

    const handleInspectClose = useCallback(() => {
        setInspectUser(null);
    }, []);

    const handleUserRowEvents = useCallback((record) => ({
        onClick: (e) => {
            if (e.target.closest('svg')) return;
            setInspectUser(record);
        },
    }), []);

    const inspectRowClassName = useCallback((record) => (
        inspectUser?.id === record.id ? 'manage-user-inspect-row' : ''
    ), [inspectUser?.id]);

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
        const mapped = manageUserFromAdmin.map((field) => {
            if (field.name === "userroll") return { ...field, options: roleOptions };
            if (field.name === "password") {
                return {
                    ...field,
                    required: !editRecord?.id,
                    placeholder: editRecord?.id
                        ? "Leave blank to keep the current password"
                        : "Minimum 8 characters",
                };
            }
            return field;
        });
        if (editRecord?.id) {
            mapped.unshift({ type: "hidden", name: "id" });
            mapped.push(
                { type: "input", label: "Created By", name: "created_by_name", span: 12, disabled: true },
                { type: "input", label: "Created Date", name: "created_date", span: 12, disabled: true },
                { type: "input", label: "Last Updated", name: "last_updated", span: 12, disabled: true },
            );
        }
        return mapped;
    }, [roleOptions, editRecord?.id]);

    // --- Table Columns Configuration ---
    const columns = [
        {
            title: 'No.',
            dataIndex: 'id',
            key: 'id',
            width: 70,
            render: (text, record, index) => offset + index + 1
        },
        {
            title: 'Photo',
            dataIndex: 'profile_image',
            key: 'profile_image',
            width: 70,
            render: (src, record) => (
                <Avatar src={src ? resolveUploadUrl(src) : undefined}>
                    {(record.fname || record.username || '?').charAt(0).toUpperCase()}
                </Avatar>
            ),
        },
        { title: 'First Name', dataIndex: 'fname', key: 'fname' },
        { title: 'Last Name', dataIndex: 'lname', key: 'lname' },
        { title: 'User Name', dataIndex: 'username', key: 'username' },
        { title: 'Email Id', dataIndex: 'email', key: 'email' },
        { title: 'Mobile No', dataIndex: 'mobileno', key: 'mobileno', ellipsis: true },
        { title: 'Department', dataIndex: 'department', key: 'department', render: (val) => val || '-' },
        { title: 'Designation', dataIndex: 'designation', key: 'designation', render: (val) => val || '-' },
        { title: 'Joining Date', dataIndex: 'joining_date', key: 'joining_date', render: (val) => formatDate(val) },
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
        { title: 'Created By', dataIndex: 'created_by_name', key: 'created_by_name', render: (val) => val || '-' },
        { title: 'Created Date', dataIndex: 'created_at', key: 'created_at', render: (val) => formatDateTime(val) },
        { title: 'Last Updated', dataIndex: 'updated_at', key: 'updated_at', render: (val) => formatDateTime(val) },
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
            password: "", // Security ke liye password khali rakha hai
            department: record.department ?? "",
            designation: record.designation ?? "",
            joining_date: record.joining_date ? dayjs(record.joining_date) : null,
            profile_image: toPhotoFileList(record.profile_image),
            created_by_name: record.created_by_name && record.created_by_name !== '-' ? record.created_by_name : "",
            created_date: formatDateTime(record.created_at) === '-' ? "" : formatDateTime(record.created_at),
            last_updated: formatDateTime(record.updated_at) === '-' ? "" : formatDateTime(record.updated_at),
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
        setEditRecord(record ? mapApiToForm(record) : { is_active: 1, profile_image: [] });
    };

    const handleSave = async (values, mode = "add") => {
        const userId = Number(values?.id ?? editRecord?.id ?? 0);
        const payload = {
            id: mode === "edit" && userId > 0 ? userId : 0,
            fname: values.fname,
            lname: values.lname,
            username: values.username,
            email: values.email,
            mobileno: values.mobileno,
            userroll: values.userroll,
            is_active: values.is_active ?? 1,
            password: values.password,
            department: values.department ?? "",
            designation: values.designation ?? "",
            joining_date: values.joining_date ? dayjs(values.joining_date).format("YYYY-MM-DD") : "",
        };

        const photoFile = Array.isArray(values.profile_image)
            ? values.profile_image.find((item) => item?.originFileObj)?.originFileObj
            : null;

        if (photoFile) {
            const formData = new FormData();
            Object.entries(payload).forEach(([key, value]) => {
                if (value === undefined || value === null) return;
                formData.append(key, value);
            });
            formData.append("profile_image", photoFile);
            return saveUser(formData, {
                onSuccess: () => {
                    setEditRecord(null);
                    setOffset(0);
                }
            });
        }

        return saveUser(payload, {
            onSuccess: () => {
                setEditRecord(null);
                setOffset(0);
            }
        });
    };

    useEffect(() => {
        setCombinedData(data?.Data || []);
    }, [data]);

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
                onRow={handleUserRowEvents}
                rowClassName={inspectRowClassName}
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

            <UserQuickInspectPanel
                user={inspectUser}
                roleName={inspectUser ? (roleMap[inspectUser.userroll] || inspectUser.userroll) : ""}
                visible={Boolean(inspectUser)}
                onClose={handleInspectClose}
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