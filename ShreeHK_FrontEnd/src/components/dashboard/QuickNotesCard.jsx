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
        <th style={{ width: 42, textAlign: "center" }}>Done</th>
        <th>Task Description</th>
        {isSuperAdmin && <th style={{ width: 110, textAlign: "center" }}>Assignee</th>}
        <th style={{ width: 115, textAlign: "center" }}>Target Date</th>
        <th style={{ width: 85, textAlign: "center" }}>Priority</th>
        {isSuperAdmin && <th style={{ width: 75, textAlign: "center" }}>Actions</th>}
      </tr>
    </thead>
    <tbody>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i}>
          <td style={{ textAlign: "center" }}><SkeletonBlock variant="icon" width={16} height={16} style={{ margin: "0 auto" }} /></td>
          <td><SkeletonBlock variant="text" width={`${65 + (i % 3) * 10}%`} height={13} /></td>
          {isSuperAdmin && <td style={{ textAlign: "center" }}><SkeletonBlock variant="text" width="80%" height={13} style={{ margin: "0 auto" }} /></td>}
          <td style={{ textAlign: "center" }}><SkeletonBlock variant="text" width="85%" height={13} style={{ margin: "0 auto" }} /></td>
          <td style={{ textAlign: "center" }}><SkeletonBlock variant="text" width="70%" height={13} style={{ margin: "0 auto" }} /></td>
          {isSuperAdmin && <td style={{ textAlign: "center" }}><SkeletonBlock variant="icon" width={44} height={18} style={{ margin: "0 auto" }} /></td>}
        </tr>
      ))}
    </tbody>
  </table>
);

const QuickNotesCard = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const isSuperAdmin = authUser?.roll === 1 || Number(authUser?.roll) === 1;

  const { data: apiResponse, isLoading, dataUpdatedAt } = useFetchApi(
    "quickNotes",
    ENDPOINTS.quickNotes.list,
    {},
    "GET",
    {
      staleTime: 0,
      refetchOnMount: "always",
      refetchInterval: 10000,
      refetchIntervalInBackground: true,
      placeholderData: undefined,
    }
  );
  const { data: usersRes } = useFetchApi("usersList", ENDPOINTS.admin.users, {}, "GET", { enabled: isSuperAdmin });

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

  const notes = useMemo(
    () => (Array.isArray(apiResponse?.Data) ? apiResponse.Data : []),
    [apiResponse, dataUpdatedAt]
  );

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
        return <span className="notes-badge notes-badge--high">High</span>;
      case "medium":
        return <span className="notes-badge notes-badge--medium">Medium</span>;
      case "low":
      default:
        return <span className="notes-badge notes-badge--low">Low</span>;
    }
  };

  const renderTargetDateTag = (tDate, completed) => {
    const todayStr = dayjs().format("YYYY-MM-DD");
    if (!tDate) return <span className="notes-date-muted">-</span>;

    if (completed) {
      return <span className="notes-date-muted">{dayjs(tDate).format("DD MMM YYYY")}</span>;
    }

    if (tDate < todayStr) {
      return (
        <span className="notes-badge notes-badge--overdue">
          Overdue ({dayjs(tDate).format("DD MMM")})
        </span>
      );
    }

    if (tDate === todayStr) {
      return (
        <span className="notes-badge notes-badge--today">
          Today ({dayjs(tDate).format("DD MMM")})
        </span>
      );
    }

    return <span className="notes-date-text">{dayjs(tDate).format("DD MMM YYYY")}</span>;
  };

  const pendingCount = notes.filter((n) => !n.completed).length;

  return (
    <Card variant="borderless" id="quick-notes-section" className="dashboard-card dashboard-card--luxury quick-notes-card dashboard-fill-card">
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
              <div className="input-group-field input-group-assignee">
                <label className="input-label-mini">Assign To</label>
                <Select
                  value={assignedTo}
                  onChange={(val) => setAssignedTo(val)}
                  placeholder="Assign User"
                  size="small"
                  className="notes-user-select"
                  options={userOptions}
                  allowClear
                />
              </div>
              <div className="input-group-field input-group-date">
                <label className="input-label-mini">Target Date</label>
                <input
                  type="date"
                  className="notes-date-picker"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
              <div className="input-group-field input-group-priority">
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
              <Plus size={15} /> Add Task
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
                <th style={{ width: 42, textAlign: "center" }}>Done</th>
                <th style={{ textAlign: "left" }}>Task Description</th>
                {isSuperAdmin && <th style={{ width: 110, textAlign: "center" }}>Assignee</th>}
                <th style={{ width: 115, textAlign: "center" }}>Target Date</th>
                <th style={{ width: 85, textAlign: "center" }}>Priority</th>
                {isSuperAdmin && <th style={{ width: 75, textAlign: "center" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {notes.length > 0 ? (
                notes.map((note) => (
                  <tr
                    key={note.id}
                    className={`notes-table-row ${note.completed ? "completed-note-row" : ""} ${editingId === note.id ? "is-editing-row" : ""}`}
                    onClick={() => {
                      if (editingId !== note.id) {
                        navigate("/task-manager");
                      }
                    }}
                    style={{ cursor: editingId === note.id ? "default" : "pointer" }}
                  >
                    <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!note.completed}
                        onChange={() => handleToggleComplete(note)}
                        className="note-checkbox"
                        title={note.completed ? "Mark as Pending" : "Mark as Completed"}
                      />
                    </td>
                    <td className="note-text-cell" onClick={(e) => { if (editingId === note.id) e.stopPropagation(); }}>
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
                        <span className={`note-text ${note.completed ? "text-strikethrough" : ""}`} title={note.text}>
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
                            className="edit-select-compact"
                            options={userOptions}
                            placeholder="Select"
                            allowClear
                          />
                        ) : (
                          <span className="notes-badge notes-badge--assignee" title={note.assigned_to_name || "Self"}>
                            {note.assigned_to_name?.trim() || "Self"}
                          </span>
                        )}
                      </td>
                    )}
                    <td style={{ textAlign: "center" }} onClick={(e) => { if (editingId === note.id) e.stopPropagation(); }}>
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
                    <td style={{ textAlign: "center" }} onClick={(e) => { if (editingId === note.id) e.stopPropagation(); }}>
                      {editingId === note.id ? (
                        <Select
                          value={editPriority}
                          onChange={(v) => setEditPriority(v)}
                          size="small"
                          className="edit-select-compact"
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
                              <button
                                type="button"
                                className="action-btn action-btn--save"
                                onClick={() => saveEditing(note.id)}
                                title="Save Task"
                                disabled={updateMutation.isPending}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                className="action-btn action-btn--cancel"
                                onClick={cancelEditing}
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="action-btn action-btn--edit"
                                onClick={() => startEditing(note)}
                                title="Edit Task"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                className="action-btn action-btn--delete"
                                onClick={() => handleDelete(note.id)}
                                title="Delete Task"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 size={13} />
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
                  <td colSpan={isSuperAdmin ? 6 : 4} className="notes-empty-td">
                    <div className="notes-empty-state">
                      <NotebookPen size={26} className="notes-empty-icon" />
                      <span className="notes-empty-title">
                        {isSuperAdmin ? "No tasks found" : "No tasks assigned to you"}
                      </span>
                      <span className="notes-empty-sub">
                        {isSuperAdmin
                          ? "Add a new task above with target date & priority."
                          : "Tasks assigned to you will appear here."}
                      </span>
                    </div>
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
