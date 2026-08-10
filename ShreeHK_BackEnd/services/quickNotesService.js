const helper = require("../helper.js");

const SELECT_FIELDS = `
  q.id,
  q.user_id,
  q.company_id,
  q.assigned_to,
  q.created_by,
  q.text,
  DATE_FORMAT(q.target_date, '%Y-%m-%d') as target_date,
  q.priority,
  q.completed,
  q.completed_by,
  DATE_FORMAT(q.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
  DATE_FORMAT(COALESCE(q.assigned_at, q.created_at), '%Y-%m-%d %H:%i:%s') as assigned_at,
  DATE_FORMAT(q.completed_at, '%Y-%m-%d %H:%i:%s') as completed_at,
  COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u_assign.first_name, ''), ' ', COALESCE(u_assign.last_name, ''))), ''), u_assign.user_name) AS assigned_to_name,
  COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u_create.first_name, ''), ' ', COALESCE(u_create.last_name, ''))), ''), u_create.user_name) AS created_by_name,
  COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u_complete.first_name, ''), ' ', COALESCE(u_complete.last_name, ''))), ''), u_complete.user_name) AS completed_by_name
`;

const JOINS = `
  LEFT JOIN user u_assign ON q.assigned_to = u_assign.user_id
  LEFT JOIN user u_create ON COALESCE(q.created_by, q.user_id) = u_create.user_id
  LEFT JOIN user u_complete ON q.completed_by = u_complete.user_id
`;

const ensureQuickNotesTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS dai_quick_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      company_id INT NOT NULL,
      assigned_to INT NULL,
      assigned_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      created_by INT NULL,
      text TEXT NOT NULL,
      target_date DATE NOT NULL,
      priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
      completed TINYINT(1) NOT NULL DEFAULT 0,
      completed_at TIMESTAMP NULL,
      completed_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_company_target (user_id, company_id, target_date, completed),
      INDEX idx_assigned_to (assigned_to, company_id, completed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await helper.query(sql);

  // Safely add missing columns for existing tables
  try {
    await helper.query("ALTER TABLE dai_quick_notes ADD COLUMN assigned_to INT NULL AFTER company_id");
  } catch (e) {
    // Ignore if column exists
  }
  try {
    await helper.query("ALTER TABLE dai_quick_notes ADD COLUMN assigned_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER assigned_to");
  } catch (e) {
    // Ignore if column exists
  }
  try {
    await helper.query("ALTER TABLE dai_quick_notes ADD COLUMN created_by INT NULL AFTER assigned_at");
  } catch (e) {
    // Ignore if column exists
  }
  try {
    await helper.query("ALTER TABLE dai_quick_notes ADD COLUMN completed_at TIMESTAMP NULL AFTER completed");
  } catch (e) {
    // Ignore if column exists
  }
  try {
    await helper.query("ALTER TABLE dai_quick_notes ADD COLUMN completed_by INT NULL AFTER completed_at");
  } catch (e) {
    // Ignore if column exists
  }
  try {
    await helper.query("UPDATE dai_quick_notes SET assigned_to = user_id WHERE assigned_to IS NULL");
  } catch (e) {
    // Ignore
  }
};

const getQuickNotes = async (userId, companyId, isSuperAdmin = false) => {
  await ensureQuickNotesTable();
  let sql;
  let params;

  if (isSuperAdmin) {
    sql = `
      SELECT ${SELECT_FIELDS}
      FROM dai_quick_notes q
      ${JOINS}
      WHERE q.company_id = ?
      ORDER BY q.completed ASC, q.target_date ASC, q.id DESC
    `;
    params = [companyId];
  } else {
    sql = `
      SELECT ${SELECT_FIELDS}
      FROM dai_quick_notes q
      ${JOINS}
      WHERE q.company_id = ? AND (q.assigned_to = ? OR (q.assigned_to IS NULL AND q.user_id = ?))
      ORDER BY q.completed ASC, q.target_date ASC, q.id DESC
    `;
    params = [companyId, userId, userId];
  }
  const rows = await helper.query(sql, params);
  return rows || [];
};

const getTodayReminders = async (userId, companyId) => {
  await ensureQuickNotesTable();
  const sql = `
    SELECT ${SELECT_FIELDS}
    FROM dai_quick_notes q
    ${JOINS}
    WHERE q.company_id = ? 
      AND (q.assigned_to = ? OR (q.assigned_to IS NULL AND q.user_id = ?))
      AND q.completed = 0
      AND q.target_date <= CURDATE()
    ORDER BY q.target_date ASC, q.priority DESC, q.id DESC
  `;
  const rows = await helper.query(sql, [companyId, userId, userId]);
  return rows || [];
};

const createQuickNote = async (userId, companyId, { text, target_date, priority = "Medium", assigned_to }) => {
  await ensureQuickNotesTable();
  const targetAssignedTo = assigned_to ? Number(assigned_to) : userId;
  const sql = `
    INSERT INTO dai_quick_notes (user_id, company_id, assigned_to, assigned_at, created_by, text, target_date, priority, completed)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, 0)
  `;
  const result = await helper.query(sql, [
    targetAssignedTo,
    companyId,
    targetAssignedTo,
    userId,
    text,
    target_date || new Date().toISOString().split("T")[0],
    priority || "Medium",
  ]);

  const insertedId = result.insertId;
  const selectSql = `
    SELECT ${SELECT_FIELDS}
    FROM dai_quick_notes q
    ${JOINS}
    WHERE q.id = ?
  `;
  const rows = await helper.query(selectSql, [insertedId]);
  return rows[0];
};

const updateQuickNote = async (userId, companyId, noteId, { text, target_date, priority, completed, assigned_to }, isSuperAdmin = false) => {
  await ensureQuickNotesTable();
  const updates = [];
  const params = [];

  if (isSuperAdmin) {
    if (text !== undefined) {
      updates.push("text = ?");
      params.push(text);
    }
    if (target_date !== undefined) {
      updates.push("target_date = ?");
      params.push(target_date);
    }
    if (priority !== undefined) {
      updates.push("priority = ?");
      params.push(priority);
    }
    if (assigned_to !== undefined) {
      updates.push("assigned_to = ?");
      params.push(assigned_to);
      updates.push("user_id = ?");
      params.push(assigned_to);
      updates.push("assigned_at = CURRENT_TIMESTAMP");
    }
  }

  if (completed !== undefined) {
    updates.push("completed = ?");
    params.push(completed ? 1 : 0);
    if (completed) {
      updates.push("completed_at = CURRENT_TIMESTAMP");
      updates.push("completed_by = ?");
      params.push(userId);
    } else {
      updates.push("completed_at = NULL");
      updates.push("completed_by = NULL");
    }
  }

  if (updates.length === 0) return null;

  params.push(noteId, companyId);
  let sql = `
    UPDATE dai_quick_notes
    SET ${updates.join(", ")}
    WHERE id = ? AND company_id = ?
  `;

  if (!isSuperAdmin) {
    sql += ` AND (assigned_to = ? OR (assigned_to IS NULL AND user_id = ?))`;
    params.push(userId, userId);
  }

  await helper.query(sql, params);

  const selectSql = `
    SELECT ${SELECT_FIELDS}
    FROM dai_quick_notes q
    ${JOINS}
    WHERE q.id = ?
  `;
  const rows = await helper.query(selectSql, [noteId]);
  return rows[0];
};

const deleteQuickNote = async (userId, companyId, noteId, isSuperAdmin = false) => {
  await ensureQuickNotesTable();
  if (!isSuperAdmin) {
    return false;
  }
  const sql = `
    DELETE FROM dai_quick_notes
    WHERE id = ? AND company_id = ?
  `;
  const result = await helper.query(sql, [noteId, companyId]);
  return result.affectedRows > 0;
};

module.exports = {
  ensureQuickNotesTable,
  getQuickNotes,
  getTodayReminders,
  createQuickNote,
  updateQuickNote,
  deleteQuickNote,
};


