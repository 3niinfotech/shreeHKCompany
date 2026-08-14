import { Card, Select, Tag } from "antd";
import {
  Plus,
  NotebookPen,
  Edit2,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import useAuthStore from "../../store/Auth.Store";
import { useFetchApi, usePostApiRequest, usePutApiRequest, useDeleteApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import { SkeletonBlock } from "../common/skeleton";

const NotesTableSkeleton = ({ isSuperAdmin }) => (
  <table className="inventory-table notes-table" aria-hidden="true">
    <thead>
      <tr>
        <th style={{ width: 45, textAlign: "center" }}>Status</th>
        <th>Task Description</th>
        {isSuperAdmin && <th style={{ width: 130, textAlign: "center" }}>Assignee</th>}
        <th style={{ width: 130, textAlign: "center" }}>Target Date</th>
        <th style={{ width: 90, textAlign: "center" }}>Priority</th>
        {isSuperAdmin && <th style={{ width: 80, textAlign: "center" }}>Actions</th>}
      </tr>
    </thead>
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          <td style={{ textAlign: "center" }}><SkeletonBlock variant="icon" width={16} height={16} /></td>
          <td><SkeletonBlock variant="text" width={`${70 + (i % 3) * 8}%`} height={12} /></td>
          {isSuperAdmin && <td style={{ textAlign: "center" }}><SkeletonBlock variant="text" width="70%" height={12} /></td>}
          <td style={{ textAlign: "center" }}><SkeletonBlock variant="text" width="80%" height={12} /></td>
          <td style={{ textAlign: "center" }}><SkeletonBlock variant="text" width="60%" height={12} /></td>
          {isSuperAdmin && <td style={{ textAlign: "center" }}><SkeletonBlock variant="icon" width={40} height={16} /></td>}
        </tr>
      ))}
    </tbody>
  </table>
);

const QuickNotesCard = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const isSuperAdmin = authUser?.roll === 1 || Number(authUser?.roll) === 1;

  const { data: apiResponse, isLoading } = useFetchApi("quickNotes", ENDPOINTS.quickNotes.list);
  const { data: usersRes } = useFetchApi("usersList", ENDPOINTS.admin.users, { enabled: isSuperAdmin });

  const createMutation = usePostApiRequest(ENDPOINTS.quickNotes.create, "quickNotes");
  const updateMutation = usePutApiRequest(ENDPOINTS.quickNotes.update, "quickNotes");
  const deleteMutation = useDeleteApiRequest(ENDPOINTS.quickNotes.delete, "quickNotes");

  const userOptions = useMemo(() => {
    if (!Array.isArray(usersRes?.Data)) return [];
    return usersRes.Data.map((u) => ({
      label: `${u.fname || ""} ${u.lname || ""}`.trim() || u.username || `User ${u.id}`,
      value: u.id,
    }));
  }, [usersRes]);

  const notes = useMemo(() => (Array.isArray(apiResponse?.Data) ? apiResponse.Data : []), [apiResponse]);

  const [inputText, setInputText] = useState("");
  const [targetDate, setTargetDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [priority, setPriority] = useState("Medium");
  const [assignedTo, setAssignedTo] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [editPriority, setEditPriority] = useState("Medium");
  const [editAssignedTo, setEditAssignedTo] = useState(null);

  const handleAdd = () => {
    if (!inputText.trim()) {
      toast.error("Please enter a task before adding");
      return;
    }
    createMutation.mutate(
      {
        text: inputText.trim(),
        target_date: targetDate || dayjs().format("YYYY-MM-DD"),
        priority: priority || "Medium",
        assigned_to: assignedTo,
      },
      {
        onSuccess: () => {
          setInputText("");
          setTargetDate(dayjs().format("YYYY-MM-DD"));
          setPriority("Medium");
          setAssignedTo(null);
        },
      }
    );
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const handleToggleComplete = (note) => {
    updateMutation.mutate({
      id: note.id,
      payload: { completed: !note.completed },
    });
  };

  const startEditing = (note) => {
    setEditingId(note.id);
    setEditText(note.text);
    setEditTargetDate(note.target_date || dayjs().format("YYYY-MM-DD"));
    setEditPriority(note.priority || "Medium");
    setEditAssignedTo(note.assigned_to || note.user_id);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
    setEditTargetDate("");
    setEditPriority("Medium");
    setEditAssignedTo(null);
  };

  const saveEditing = (id) => {
    if (!editText.trim()) {
      toast.error("Task text cannot be empty");
      return;
    }
    updateMutation.mutate(
      {
        id,
        payload: {
          text: editText.trim(),
          target_date: editTargetDate,
          priority: editPriority,
          assigned_to: editAssignedTo,
        },
      },
      {
        onSuccess: () => {
          cancelEditing();
        },
      }
    );
  };

  const renderPriorityBadge = (p) => {
    switch (p?.toLowerCase()) {
      case "high":
        return <Tag color="red" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>High</Tag>;
      case "medium":
        return <Tag color="gold" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>Medium</Tag>;
      case "low":
      default:
        return <Tag color="green" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>Low</Tag>;
    }
  };

  const renderTargetDateTag = (tDate, completed) => {
    const todayStr = dayjs().format("YYYY-MM-DD");
    if (!tDate) return null;

    if (completed) {
      return <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{dayjs(tDate).format("DD MMM YYYY")}</span>;
    }

    if (tDate < todayStr) {
      return (
        <Tag color="volcano" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
          Overdue ({dayjs(tDate).format("DD MMM")})
        </Tag>
      );
    }

    if (tDate === todayStr) {
      return (
        <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
          Today ({dayjs(tDate).format("DD MMM")})
        </Tag>
      );
    }

    return <span style={{ color: "#0f172a", fontWeight: 500, fontSize: "0.78rem" }}>{dayjs(tDate).format("DD MMM YYYY")}</span>;
  };

  const pendingCount = notes.filter((n) => !n.completed).length;

  return (
    <Card bordered={false} id="quick-notes-section" className="dashboard-card dashboard-card--luxury quick-notes-card dashboard-fill-card">
      <div className="card-header">
        <div className="card-title-group">
          <span className="card-icon-badge card-icon-badge--primary">
            <NotebookPen size={18} />
          </span>
          <div>
            <span className="card-title-text">Quick Notes & Tasks</span>
            <span className="card-subtitle-text">Manage reminders, target dates & follow-ups</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="notes-counter-badge">
            {isLoading ? "..." : `${pendingCount} Pending`}
          </div>
          <a
            href="#"
            className="view-all-link"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate("/task-manager");
            }}
            style={{ cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#6655DD", textDecoration: "none" }}
          >
            View All
          </a>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="notes-input-bar-stacked">
          <div className="notes-textarea-wrap">
            <textarea
              className="notes-textarea"
              rows={2}
              placeholder="Add a new task or note..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>
          <div className="notes-meta-bar">
            <div className="notes-meta-fields">
              <div className="input-group-assignee" style={{ minWidth: 140, display: "flex", flexDirection: "column", gap: "4px" }}>
                <label className="input-label-mini" style={{ color: "#64748B" }}>Assign To</label>
                <Select
                  value={assignedTo}
                  onChange={(val) => setAssignedTo(val)}
                  placeholder="Assign User"
                  size="small"
                  style={{ width: "100%", padding: "4px 10px", borderRadius: "8px" }}
                  options={userOptions}
                  allowClear
                />
              </div>
              <div className="input-group-date">
                <label className="input-label-mini">Target Date</label>
                <input
                  type="date"
                  className="notes-date-picker"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
              <div className="input-group-priority">
                <label className="input-label-mini">Priority</label>
                <Select
                  value={priority}
                  onChange={(val) => setPriority(val)}
                  size="small"
                  className="priority-select"
                  options={[
                    { label: "High", value: "High" },
                    { label: "Medium", value: "Medium" },
                    { label: "Low", value: "Low" },
                  ]}
                />
              </div>
            </div>
            <button
              type="button"
              className="notes-add-btn"
              onClick={handleAdd}
              disabled={createMutation.isPending}
            >
              <Plus size={16} /> Add Task
            </button>
          </div>
        </div>
      )}

      <div className="table-wrapper notes-table-wrapper">
        {isLoading ? (
          <NotesTableSkeleton isSuperAdmin={isSuperAdmin} />
        ) : (
          <table className="inventory-table notes-table">
            <thead>
              <tr>
                <th style={{ width: 45, textAlign: "center" }}>Status</th>
                <th>Task Description</th>
                {isSuperAdmin && <th style={{ width: 130, textAlign: "center" }}>Assignee</th>}
                <th style={{ width: 130, textAlign: "center" }}>Target Date</th>
                <th style={{ width: 90, textAlign: "center" }}>Priority</th>
                {isSuperAdmin && <th style={{ width: 80, textAlign: "center" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {notes.length > 0 ? (
                notes.map((note) => (
                  <tr
                    key={note.id}
                    className={note.completed ? "completed-note-row" : ""}
                    onClick={() => navigate("/task-manager")}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!note.completed}
                        onChange={() => handleToggleComplete(note)}
                        className="note-checkbox"
                      />
                    </td>
                    <td>
                      {editingId === note.id ? (
                        <input
                          type="text"
                          className="edit-note-input"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditing(note.id);
                            if (e.key === "Escape") cancelEditing();
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className={`note-text ${note.completed ? "text-strikethrough" : ""}`}>
                          {note.text}
                        </span>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        {editingId === note.id ? (
                          <Select
                            value={editAssignedTo}
                            onChange={(v) => setEditAssignedTo(v)}
                            size="small"
                            style={{ width: 120 }}
                            options={userOptions}
                          />
                        ) : (
                          <Tag color="purple" style={{ borderRadius: 6, fontWeight: 500, margin: 0 }}>
                            {note.assigned_to_name?.trim() || "Self"}
                          </Tag>
                        )}
                      </td>
                    )}
                    <td style={{ textAlign: "center" }}>
                      {editingId === note.id ? (
                        <input
                          type="date"
                          className="edit-date-input"
                          value={editTargetDate}
                          onChange={(e) => setEditTargetDate(e.target.value)}
                        />
                      ) : (
                        renderTargetDateTag(note.target_date, note.completed)
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {editingId === note.id ? (
                        <Select
                          value={editPriority}
                          onChange={(v) => setEditPriority(v)}
                          size="small"
                          options={[
                            { label: "High", value: "High" },
                            { label: "Medium", value: "Medium" },
                            { label: "Low", value: "Low" },
                          ]}
                        />
                      ) : (
                        renderPriorityBadge(note.priority)
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <div className="note-actions">
                          {editingId === note.id ? (
                            <>
                              <button type="button" className="action-btn action-btn--save" onClick={() => saveEditing(note.id)} title="Save Task">
                                <Check size={14} />
                              </button>
                              <button type="button" className="action-btn action-btn--cancel" onClick={cancelEditing} title="Cancel">
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="action-btn action-btn--edit" onClick={() => startEditing(note)} title="Edit Task">
                                <Edit2 size={14} />
                              </button>
                              <button type="button" className="action-btn action-btn--delete" onClick={() => handleDelete(note.id)} title="Delete Task">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 4} style={{ textAlign: "center", padding: "24px 16px", color: "#94a3b8" }}>
                    {isSuperAdmin
                      ? "No tasks found. Add a new task above with target date & priority."
                      : "No tasks assigned to you."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
};

export default QuickNotesCard;
