import React, { useEffect, useState } from 'react';
import { Modal, Tag, Button, ConfigProvider } from 'antd';
import { BellRing, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { api } from '../../api/axiosInstance';
import { ENDPOINTS } from '../../constants/endpoints';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import useAuthStore from '../../store/Auth.Store';

export default function TaskReminderModal() {
    const [visible, setVisible] = useState(false);
    const [reminders, setReminders] = useState([]);
    const [loadingMap, setLoadingMap] = useState({});
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const user = useAuthStore((state) => state.user);
    const isSuperAdmin = user?.roll === 1 || Number(user?.roll) === 1;

    useEffect(() => {
        const todayStr = dayjs().format('YYYY-MM-DD');
        const sessionKey = `reminder_shown_${todayStr}`;

        // Only trigger popup for normal assigned users (Super Admin gets overview on dashboard/task board)
        if (isSuperAdmin || sessionStorage.getItem(sessionKey)) {
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await api.get(ENDPOINTS.quickNotes.todayReminders);
                if (res.data?.status && Array.isArray(res.data?.Data) && res.data.Data.length > 0) {
                    setReminders(res.data.Data);
                    setVisible(true);
                    sessionStorage.setItem(sessionKey, 'true');
                }
            } catch (err) {
                console.error("Failed to fetch task reminders:", err);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [isSuperAdmin]);

    const handleMarkDone = async (task) => {
        setLoadingMap(prev => ({ ...prev, [task.id]: true }));
        try {
            const res = await api.put(`${ENDPOINTS.quickNotes.update}/${task.id}`, { completed: true });
            if (res.data?.status) {
                toast.success(`Task marked as complete!`);
                const updated = reminders.filter(r => r.id !== task.id);
                setReminders(updated);
                queryClient.invalidateQueries({ queryKey: ['quickNotes'] });
                if (updated.length === 0) {
                    setVisible(false);
                }
            } else {
                toast.error(res.data?.Message || 'Failed to update task');
            }
        } catch (err) {
            toast.error(err.response?.data?.Message || 'Failed to update task');
        } finally {
            setLoadingMap(prev => ({ ...prev, [task.id]: false }));
        }
    };

    const handleViewAllTasks = () => {
        setVisible(false);
        navigate('/task-manager');
    };

    const getPriorityTag = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high':
                return <Tag color="red" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>HIGH</Tag>;
            case 'medium':
                return <Tag color="gold" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>MEDIUM</Tag>;
            case 'low':
            default:
                return <Tag color="green" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>LOW</Tag>;
        }
    };

    const todayDateStr = dayjs().format('YYYY-MM-DD');

    return (
        <ConfigProvider
            theme={{
                components: {
                    Modal: {
                        borderRadiusLG: 20,
                        contentBg: '#ffffff',
                    }
                }
            }}
        >
            <Modal
                open={visible}
                onCancel={() => setVisible(false)}
                footer={null}
                centered
                width={540}
                className="task-reminder-modal"
                closeIcon={<X size={18} />}
            >
                <div className="task-reminder-content">
                    <div className="reminder-header">
                        <div className="reminder-badge-icon">
                            <BellRing size={24} className="bell-animated" />
                        </div>
                        <div className="reminder-header-text">
                            <h3>Daily Task Reminder</h3>
                            <p>
                                You have <strong>{reminders.length} task{reminders.length > 1 ? 's' : ''}</strong> scheduled for today / pending follow-up.
                            </p>
                        </div>
                    </div>

                    <div className="reminder-tasks-list">
                        {reminders.map((task) => {
                            const isToday = task.target_date === todayDateStr;
                            const isOverdue = task.target_date < todayDateStr;
                            return (
                                <div key={task.id} className={`reminder-task-card ${isOverdue ? 'is-overdue' : ''}`}>
                                    <div className="task-card-main">
                                        <div className="task-card-tags">
                                            {getPriorityTag(task.priority)}
                                            {isOverdue ? (
                                                <Tag color="volcano" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                                                    Overdue ({dayjs(task.target_date).format('DD MMM')})
                                                </Tag>
                                            ) : isToday ? (
                                                <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                                                    Due Today
                                                </Tag>
                                            ) : (
                                                <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                                                    {dayjs(task.target_date).format('DD MMM YYYY')}
                                                </Tag>
                                            )}
                                        </div>
                                        <div className="task-card-text">
                                            {task.text}
                                        </div>
                                    </div>
                                    <div className="task-card-action">
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<CheckCircle2 size={15} />}
                                            loading={loadingMap[task.id]}
                                            onClick={() => handleMarkDone(task)}
                                            className="reminder-done-btn"
                                        >
                                            Done
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="reminder-footer">
                        <Button
                            onClick={handleViewAllTasks}
                            className="reminder-view-all-btn"
                        >
                            View All Tasks <ArrowRight size={15} />
                        </Button>
                        <Button
                            type="primary"
                            onClick={() => setVisible(false)}
                            className="reminder-dismiss-btn"
                        >
                            Got It
                        </Button>
                    </div>
                </div>
            </Modal>
        </ConfigProvider>
    );
}

