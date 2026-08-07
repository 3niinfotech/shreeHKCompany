import React, { useState, useMemo } from 'react';
import {
    Card,
    Row,
    Col,
    Table,
    Tag,
    Select,
    Input,
    Button,
    Modal,
    Form,
    DatePicker,
    Space,
    Popconfirm,
    Segmented,
    Empty,
    Progress,
    Tooltip,
    Checkbox
} from 'antd';
import {
    NotebookPen,
    Plus,
    Search,
    Filter,
    CheckCircle2,
    Clock,
    AlertCircle,
    Calendar,
    Edit2,
    Trash2,
    List,
    Kanban,
    ArrowLeft,
    CheckSquare,
    RotateCcw
} from 'lucide-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useFetchApi, usePostApiRequest, usePutApiRequest, useDeleteApiRequest } from '../api/ApiFunction';
import { ENDPOINTS } from '../constants/endpoints';
import { toast } from 'sonner';
import '../assets/scss/pages/dashboard.scss';
import PageHeroHeader from '../components/common/PageHeroHeader';
import useAuthStore from '../store/Auth.Store';

export default function TaskManager() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const isSuperAdmin = user?.roll === 1 || Number(user?.roll) === 1;

    const { data: apiResponse, isLoading } = useFetchApi('quickNotes', ENDPOINTS.quickNotes.list);
    const { data: usersRes } = useFetchApi('usersList', ENDPOINTS.admin.users, {}, 'GET', { enabled: isSuperAdmin });

    const createMutation = usePostApiRequest(ENDPOINTS.quickNotes.create, 'quickNotes');
    const updateMutation = usePutApiRequest(ENDPOINTS.quickNotes.update, 'quickNotes');
    const deleteMutation = useDeleteApiRequest(ENDPOINTS.quickNotes.delete, 'quickNotes');

    const userOptions = useMemo(() => {
        if (!Array.isArray(usersRes?.Data)) return [];
        return usersRes.Data.map(u => ({
            label: `${u.fname || ''} ${u.lname || ''}`.trim() || u.username || `User ${u.id}`,
            value: u.id
        }));
    }, [usersRes]);

    const tasks = useMemo(() => {
        return Array.isArray(apiResponse?.Data) ? apiResponse.Data : [];
    }, [apiResponse]);

    // Local states
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, COMPLETED
    const [priorityFilter, setPriorityFilter] = useState('ALL'); // ALL, High, Medium, Low
    const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, OVERDUE, UPCOMING
    const [viewMode, setViewMode] = useState('TABLE'); // TABLE, BOARD

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [form] = Form.useForm();
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    // Stats calculations
    const stats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const todayStr = dayjs().format('YYYY-MM-DD');
        const overdue = tasks.filter(t => !t.completed && t.target_date && t.target_date < todayStr).length;
        const highPriority = tasks.filter(t => !t.completed && t.priority === 'High').length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { total, completed, pending, overdue, highPriority, completionRate };
    }, [tasks]);

    // Filtered tasks
    const filteredTasks = useMemo(() => {
        const todayStr = dayjs().format('YYYY-MM-DD');
        return tasks.filter(task => {
            // Search text
            if (searchText.trim() && !task.text.toLowerCase().includes(searchText.toLowerCase().trim())) {
                return false;
            }
            // Status
            if (statusFilter === 'PENDING' && task.completed) return false;
            if (statusFilter === 'COMPLETED' && !task.completed) return false;

            // Priority
            if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;

            // Date
            if (dateFilter === 'TODAY' && task.target_date !== todayStr) return false;
            if (dateFilter === 'OVERDUE' && (task.completed || !task.target_date || task.target_date >= todayStr)) return false;
            if (dateFilter === 'UPCOMING' && (!task.target_date || task.target_date <= todayStr)) return false;

            return true;
        });
    }, [tasks, searchText, statusFilter, priorityFilter, dateFilter]);

    // Form submission (Add / Edit)
    const handleFormSubmit = (values) => {
        const payload = {
            text: values.text.trim(),
            target_date: values.target_date ? values.target_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            priority: values.priority || 'Medium',
            assigned_to: values.assigned_to || null,
        };

        if (editingTask) {
            updateMutation.mutate(
                { id: editingTask.id, payload },
                {
                    onSuccess: () => {
                        toast.success('Task updated successfully');
                        setEditingTask(null);
                        form.resetFields();
                    }
                }
            );
        } else {
            createMutation.mutate(payload, {
                onSuccess: () => {
                    toast.success('Task created successfully');
                    setIsAddModalOpen(false);
                    form.resetFields();
                }
            });
        }
    };

    const handleOpenEdit = (task) => {
        setEditingTask(task);
        form.setFieldsValue({
            text: task.text,
            target_date: task.target_date ? dayjs(task.target_date) : dayjs(),
            priority: task.priority || 'Medium',
            assigned_to: task.assigned_to || task.user_id,
        });
    };

    const handleToggleComplete = (task) => {
        updateMutation.mutate({
            id: task.id,
            payload: { completed: !task.completed }
        });
    };

    const handleDeleteTask = (id) => {
        deleteMutation.mutate(id);
    };

    // Bulk actions
    const handleBulkMarkDone = () => {
        if (!selectedRowKeys.length) return;
        selectedRowKeys.forEach(id => {
            updateMutation.mutate({ id, payload: { completed: true } });
        });
        toast.success(`Marked ${selectedRowKeys.length} task(s) as complete`);
        setSelectedRowKeys([]);
    };

    const handleBulkDelete = () => {
        if (!selectedRowKeys.length) return;
        selectedRowKeys.forEach(id => {
            deleteMutation.mutate(id);
        });
        setSelectedRowKeys([]);
    };

    const renderPriorityTag = (p) => {
        switch (p?.toLowerCase()) {
            case 'high':
                return <Tag color="red" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>High</Tag>;
            case 'medium':
                return <Tag color="gold" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>Medium</Tag>;
            case 'low':
            default:
                return <Tag color="green" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>Low</Tag>;
        }
    };

    const renderTargetDateTag = (tDate, completed) => {
        const todayStr = dayjs().format('YYYY-MM-DD');
        if (!tDate) return null;

        if (completed) {
            return <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{dayjs(tDate).format('DD MMM YYYY')}</span>;
        }

        if (tDate < todayStr) {
            return (
                <Tag color="volcano" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                    Overdue ({dayjs(tDate).format('DD MMM')})
                </Tag>
            );
        }

        if (tDate === todayStr) {
            return (
                <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                    Today
                </Tag>
            );
        }

        return <span style={{ color: '#0f172a', fontWeight: 500, fontSize: '0.8rem' }}>{dayjs(tDate).format('DD MMM YYYY')}</span>;
    };

    // Table columns
    const columns = [
        {
            title: 'Status',
            dataIndex: 'completed',
            key: 'completed',
            width: 110,
            align: 'center',
            render: (completed, record) => (
                <Tag
                    color={completed ? 'success' : 'warning'}
                    style={{
                        cursor: 'pointer',
                        borderRadius: 6,
                        fontWeight: 600,
                        padding: '2px 8px',
                        userSelect: 'none'
                    }}
                    onClick={() => handleToggleComplete(record)}
                >
                    {completed ? 'Completed' : 'Pending'}
                </Tag>
            ),
        },
        {
            title: 'Task Description',
            dataIndex: 'text',
            key: 'text',
            render: (text, record) => (
                <span className={record.completed ? 'text-strikethrough' : ''} style={{ fontWeight: 500, color: record.completed ? '#94a3b8' : '#0f172a' }}>
                    {text}
                </span>
            ),
        },
        ...(isSuperAdmin ? [
            {
                title: 'Assigned To',
                dataIndex: 'assigned_to_name',
                key: 'assigned_to_name',
                width: 140,
                align: 'center',
                render: (name, record) => (
                    <Tag color="purple" style={{ borderRadius: 6, fontWeight: 500, margin: 0 }}>
                        {name?.trim() || record.assigned_to_name || 'Self'}
                    </Tag>
                ),
            }
        ] : []),
        {
            title: 'Target Date',
            dataIndex: 'target_date',
            key: 'target_date',
            width: 140,
            align: 'center',
            render: (tDate, record) => renderTargetDateTag(tDate, record.completed),
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            width: 110,
            align: 'center',
            render: (priority) => renderPriorityTag(priority),
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 150,
            align: 'center',
            render: (cDate) => <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{cDate ? dayjs(cDate).format('DD MMM, hh:mm A') : '-'}</span>,
        },
        ...(isSuperAdmin ? [
            {
                title: 'Actions',
                key: 'actions',
                width: 100,
                align: 'center',
                render: (_, record) => (
                    <Space size="small">
                        <Button
                            type="text"
                            size="small"
                            icon={<Edit2 size={15} style={{ color: '#0284c7' }} />}
                            onClick={() => handleOpenEdit(record)}
                        />
                        <Popconfirm
                            title="Delete Task"
                            description="Are you sure you want to delete this task?"
                            onConfirm={() => handleDeleteTask(record.id)}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button
                                type="text"
                                size="small"
                                icon={<Trash2 size={15} style={{ color: '#ef4444' }} />}
                            />
                        </Popconfirm>
                    </Space>
                ),
            }
        ] : []),
    ];

    // Board columns grouping
    const boardColumns = useMemo(() => {
        const todayStr = dayjs().format('YYYY-MM-DD');
        return {
            overdue: filteredTasks.filter(t => !t.completed && t.target_date && t.target_date < todayStr),
            today: filteredTasks.filter(t => !t.completed && t.target_date === todayStr),
            upcoming: filteredTasks.filter(t => !t.completed && (!t.target_date || t.target_date > todayStr)),
            completed: filteredTasks.filter(t => t.completed),
        };
    }, [filteredTasks]);

    return (
        <div className="task-manager-page">
            <PageHeroHeader
                breadcrumb="Task Manager"
                title="Task & Note Manager"
                icon={<NotebookPen size={22} />}
                actions={(
                    <Space size="small" wrap>
                        <Button
                            icon={<ArrowLeft size={16} />}
                            onClick={() => navigate(-1)}
                            style={{ borderRadius: 8 }}
                        >
                            Back
                        </Button>
                        {isSuperAdmin && (
                            <Button
                                type="primary"
                                icon={<Plus size={16} />}
                                onClick={() => {
                                    form.resetFields();
                                    setEditingTask(null);
                                    setIsAddModalOpen(true);
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                    borderColor: '#059669',
                                    borderRadius: 10,
                                    fontWeight: 600,
                                    height: 38,
                                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                                }}
                            >
                                Create New Task
                            </Button>
                        )}
                    </Space>
                )}
            />

            {/* KPI Cards Header */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={12} sm={6} lg={4}>
                    <Card bordered={false} style={{ borderRadius: 14, background: '#ffffff', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckSquare size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Tasks</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={12} sm={6} lg={4}>
                    <Card bordered={false} style={{ borderRadius: 14, background: '#ffffff', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Clock size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Pending</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706' }}>{stats.pending}</div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={12} sm={6} lg={4}>
                    <Card bordered={false} style={{ borderRadius: 14, background: '#ffffff', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Completed</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{stats.completed}</div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={12} sm={6} lg={4}>
                    <Card bordered={false} style={{ borderRadius: 14, background: '#ffffff', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Overdue</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>{stats.overdue}</div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card bordered={false} style={{ borderRadius: 14, background: '#ffffff', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Completion Progress</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{stats.completed} of {stats.total} Tasks Done</div>
                            </div>
                            <Progress type="circle" percent={stats.completionRate} width={42} strokeColor="#059669" />
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Toolbar Filter Section */}
            <Card bordered={false} style={{ borderRadius: 16, marginBottom: 20, boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
                        <Input
                            placeholder="Search tasks..."
                            prefix={<Search size={16} style={{ color: '#94a3b8' }} />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                            style={{ width: 240, borderRadius: 8 }}
                        />
                        <Select
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: 140 }}
                            options={[
                                { label: 'All Status', value: 'ALL' },
                                { label: 'Pending Only', value: 'PENDING' },
                                { label: 'Completed', value: 'COMPLETED' },
                            ]}
                        />
                        <Select
                            value={priorityFilter}
                            onChange={setPriorityFilter}
                            style={{ width: 140 }}
                            options={[
                                { label: 'All Priorities', value: 'ALL' },
                                { label: 'High Priority', value: 'High' },
                                { label: 'Medium Priority', value: 'Medium' },
                                { label: 'Low Priority', value: 'Low' },
                            ]}
                        />
                        <Select
                            value={dateFilter}
                            onChange={setDateFilter}
                            style={{ width: 140 }}
                            options={[
                                { label: 'All Dates', value: 'ALL' },
                                { label: 'Due Today', value: 'TODAY' },
                                { label: 'Overdue', value: 'OVERDUE' },
                                { label: 'Upcoming', value: 'UPCOMING' },
                            ]}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {selectedRowKeys.length > 0 && (
                            <Space>
                                <Button size="small" type="primary" onClick={handleBulkMarkDone}>
                                    Mark ({selectedRowKeys.length}) Done
                                </Button>
                                {isSuperAdmin && (
                                    <Popconfirm title="Delete selected tasks?" onConfirm={handleBulkDelete}>
                                        <Button size="small" danger>
                                            Delete ({selectedRowKeys.length})
                                        </Button>
                                    </Popconfirm>
                                )}
                            </Space>
                        )}
                        <Segmented
                            value={viewMode}
                            onChange={setViewMode}
                            options={[
                                { label: 'Table View', value: 'TABLE', icon: <List size={14} /> },
                                { label: 'Board View', value: 'BOARD', icon: <Kanban size={14} /> },
                            ]}
                        />
                    </div>
                </div>
            </Card>

            {/* Content Area (Table or Board) */}
            {viewMode === 'TABLE' ? (
                <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)' }}>
                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={filteredTasks}
                        loading={isLoading}
                        rowSelection={{
                            selectedRowKeys,
                            onChange: setSelectedRowKeys,
                        }}
                        pagination={{ pageSize: 10, showSizeChanger: true }}
                    />
                </Card>
            ) : (
                <Row gutter={[16, 16]}>
                    {[
                        { title: 'Overdue', color: '#dc2626', bg: '#fef2f2', items: boardColumns.overdue },
                        { title: 'Due Today', color: '#0284c7', bg: '#f0f9ff', items: boardColumns.today },
                        { title: 'Upcoming', color: '#d97706', bg: '#fffbeb', items: boardColumns.upcoming },
                        { title: 'Completed', color: '#059669', bg: '#ecfdf5', items: boardColumns.completed },
                    ].map((col, idx) => (
                        <Col xs={24} sm={12} lg={6} key={idx}>
                            <Card
                                bordered={false}
                                title={
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ color: col.color, fontWeight: 700, fontSize: '0.9rem' }}>{col.title}</span>
                                        <Tag color={col.color} style={{ borderRadius: 10, fontWeight: 700 }}>{col.items.length}</Tag>
                                    </div>
                                }
                                style={{ borderRadius: 16, background: col.bg, minHeight: 450, boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {col.items.length > 0 ? (
                                        col.items.map(task => (
                                            <Card
                                                key={task.id}
                                                bordered={false}
                                                size="small"
                                                style={{ borderRadius: 10, background: '#ffffff', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' }}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <Space size={4}>
                                                            {renderPriorityTag(task.priority)}
                                                            {isSuperAdmin && task.assigned_to_name && (
                                                                <Tag color="purple" style={{ borderRadius: 6, fontWeight: 500, margin: 0, fontSize: '0.72rem' }}>
                                                                    {task.assigned_to_name}
                                                                </Tag>
                                                            )}
                                                        </Space>
                                                        <Checkbox
                                                            checked={!!task.completed}
                                                            onChange={() => handleToggleComplete(task)}
                                                        />
                                                    </div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: task.completed ? '#94a3b8' : '#0f172a', textDecoration: task.completed ? 'line-through' : 'none' }}>
                                                        {task.text}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                                                        {renderTargetDateTag(task.target_date, task.completed)}
                                                        {isSuperAdmin && (
                                                            <Space size={4}>
                                                                <Button type="text" size="small" icon={<Edit2 size={13} />} onClick={() => handleOpenEdit(task)} />
                                                                <Button type="text" size="small" icon={<Trash2 size={13} style={{ color: '#ef4444' }} />} onClick={() => handleDeleteTask(task.id)} />
                                                            </Space>
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    ) : (
                                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks" />
                                    )}
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Create / Edit Modal (Super Admin only) */}
            {isSuperAdmin && (
                <Modal
                    title={editingTask ? "Edit Task" : "Create New Task"}
                    open={isAddModalOpen || !!editingTask}
                    onCancel={() => {
                        setIsAddModalOpen(false);
                        setEditingTask(null);
                        form.resetFields();
                    }}
                    onOk={() => form.submit()}
                    okText={editingTask ? "Update Task" : "Create Task"}
                    centered
                    destroyOnClose
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleFormSubmit}
                        initialValues={{
                            priority: 'Medium',
                            target_date: dayjs(),
                        }}
                    >
                        <Form.Item
                            name="text"
                            label="Task Description / Note"
                            rules={[{ required: true, message: 'Please enter task text' }]}
                        >
                            <Input.TextArea rows={3} placeholder="Enter task details..." />
                        </Form.Item>

                        <Form.Item name="assigned_to" label="Assign To User">
                            <Select
                                placeholder="Select User to Assign"
                                options={userOptions}
                                allowClear
                            />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="target_date" label="Target Date">
                                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="priority" label="Priority">
                                    <Select
                                        options={[
                                            { label: 'High', value: 'High' },
                                            { label: 'Medium', value: 'Medium' },
                                            { label: 'Low', value: 'Low' },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Modal>
            )}
        </div>
    );
}

