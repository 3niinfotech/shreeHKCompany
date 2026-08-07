const express = require("express");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { isSuperAdminRoll } = require("../../permissionHelper.js");
const {
  getQuickNotes,
  getTodayReminders,
  createQuickNote,
  updateQuickNote,
  deleteQuickNote,
} = require("../../services/quickNotesService.js");

const quickNotesRouter = express.Router();

const getUserCompanyId = (req) => Number(req.companyId ?? req.user?.companyId) || helper.DEFAULT_COMPANY_ID;
const getUserId = (req) => Number(req.user?.user_id) || helper.DEFAULT_USER_ID;

// GET /dashboard/quick-notes - List quick notes for logged in user (or all if Super Admin)
quickNotesRouter.get("/dashboard/quick-notes", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const companyId = getUserCompanyId(req);
    const isSuperAdmin = isSuperAdminRoll(req.user?.roll);
    const data = await getQuickNotes(userId, companyId, isSuperAdmin);
    res.status(200).json({
      status: true,
      Message: "Quick notes loaded successfully",
      Data: data,
    });
  } catch (error) {
    console.error("GET /dashboard/quick-notes error:", error);
    res.status(500).json({
      status: false,
      Message: error.message || "Failed to load quick notes",
      Data: [],
    });
  }
});

// GET /dashboard/quick-notes/today-reminders - List today's & overdue pending quick notes for logged in user
quickNotesRouter.get("/dashboard/quick-notes/today-reminders", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const companyId = getUserCompanyId(req);
    const data = await getTodayReminders(userId, companyId);
    res.status(200).json({
      status: true,
      Message: "Today's reminders loaded successfully",
      Data: data,
    });
  } catch (error) {
    console.error("GET /dashboard/quick-notes/today-reminders error:", error);
    res.status(500).json({
      status: false,
      Message: error.message || "Failed to load today's reminders",
      Data: [],
    });
  }
});

// POST /dashboard/quick-notes - Create & assign a new task (Super Admin only)
quickNotesRouter.post("/dashboard/quick-notes", authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = isSuperAdminRoll(req.user?.roll);
    if (!isSuperAdmin) {
      return res.status(403).json({
        status: false,
        Message: "Access denied. Only Super Admin can create and assign tasks.",
      });
    }

    const userId = getUserId(req);
    const companyId = getUserCompanyId(req);
    const { text, target_date, priority, assigned_to } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        status: false,
        Message: "Note text is required",
      });
    }

    const newNote = await createQuickNote(userId, companyId, {
      text: text.trim(),
      target_date,
      priority,
      assigned_to,
    });

    res.status(201).json({
      status: true,
      Message: "Task / Note created successfully",
      Data: newNote,
    });
  } catch (error) {
    console.error("POST /dashboard/quick-notes error:", error);
    res.status(500).json({
      status: false,
      Message: error.message || "Failed to create quick note",
    });
  }
});

// PUT /dashboard/quick-notes/:id or PUT /dashboard/quick-notes
const handleUpdate = async (req, res) => {
  try {
    const userId = getUserId(req);
    const companyId = getUserCompanyId(req);
    const isSuperAdmin = isSuperAdminRoll(req.user?.roll);
    const noteId = req.params.id || req.body.id;
    const { text, target_date, priority, completed, assigned_to } = req.body;

    if (!noteId) {
      return res.status(400).json({ status: false, Message: "Note ID is required" });
    }

    const updatedNote = await updateQuickNote(
      userId,
      companyId,
      noteId,
      {
        text: text !== undefined ? text.trim() : undefined,
        target_date,
        priority,
        completed,
        assigned_to,
      },
      isSuperAdmin
    );

    if (!updatedNote) {
      return res.status(404).json({
        status: false,
        Message: "Note not found or permission denied",
      });
    }

    res.status(200).json({
      status: true,
      Message: "Task / Note updated successfully",
      Data: updatedNote,
    });
  } catch (error) {
    console.error("PUT /dashboard/quick-notes error:", error);
    res.status(500).json({
      status: false,
      Message: error.message || "Failed to update quick note",
    });
  }
};

quickNotesRouter.put("/dashboard/quick-notes/:id", authenticateToken, handleUpdate);
quickNotesRouter.put("/dashboard/quick-notes", authenticateToken, handleUpdate);

// DELETE /dashboard/quick-notes/:id or DELETE /dashboard/quick-notes?deleteId=... (Super Admin only)
const handleDelete = async (req, res) => {
  try {
    const isSuperAdmin = isSuperAdminRoll(req.user?.roll);
    if (!isSuperAdmin) {
      return res.status(403).json({
        status: false,
        Message: "Access denied. Only Super Admin can delete tasks.",
      });
    }

    const userId = getUserId(req);
    const companyId = getUserCompanyId(req);
    const noteId = req.params.id || req.query.deleteId || req.body?.id;

    if (!noteId) {
      return res.status(400).json({ status: false, Message: "Note ID is required" });
    }

    const deleted = await deleteQuickNote(userId, companyId, noteId, isSuperAdmin);
    if (!deleted) {
      return res.status(404).json({
        status: false,
        Message: "Note not found or already deleted",
      });
    }

    res.status(200).json({
      status: true,
      Message: "Task / Note deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /dashboard/quick-notes error:", error);
    res.status(500).json({
      status: false,
      Message: error.message || "Failed to delete quick note",
    });
  }
};

quickNotesRouter.delete("/dashboard/quick-notes/:id", authenticateToken, handleDelete);
quickNotesRouter.delete("/dashboard/quick-notes", authenticateToken, handleDelete);

module.exports = quickNotesRouter;

