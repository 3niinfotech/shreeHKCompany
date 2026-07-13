const express = require('express');
const helper = require('../../helper.js');
const { authenticateToken } = require('../../authMiddleware.js');
const { logAuditInTx } = require('../../services/auditIntegration.js');
const {
    normalizeResource,
    validateResourceKeys,
    clearPermissionCache,
} = require('../../permissionHelper.js');
const { buildPagesCatalog, SUPER_ADMIN_ROLL_ID } = require('../../config/permissionRegistry.js');
const { metaQuery } = require('../../tenantHelper.js');

const Roll = express.Router();

Roll.use(express.json());

const mapRoleRow = (row) => {
    const pages = normalizeResource(row.resource);
    return {
        ...row,
        resource: pages,
        pages,
        company: (() => {
            try {
                return typeof row.company === 'string' && row.company.startsWith('[')
                    ? JSON.parse(row.company)
                    : row.company;
            } catch {
                return row.company;
            }
        })()
    };
};

// GET /permission-registry — full page catalog for admin UI
Roll.get('/permission-registry', authenticateToken, (req, res) => {
    res.status(200).json({
        status: true,
        data: buildPagesCatalog(),
    });
});

// GET /role-list — roles + full page catalog + companies for Roll admin
Roll.get('/role-list', authenticateToken, async (req, res) => {
    try {
        const [rolesRows, companies] = await Promise.all([
            helper.query(`SELECT id, name, resource, date, company FROM roll ORDER BY id ASC`),
            metaQuery('SELECT id, name FROM company ORDER BY name ASC').catch(() => []),
        ]);

        const roles = rolesRows.map(mapRoleRow);
        const pages = buildPagesCatalog();

        res.status(200).json({
            status: true,
            message: 'Roles fetched successfully',
            data: roles,
            pages,
            companies: companies || [],
        });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({
            status: false,
            message: 'Failed to fetch roles',
            error: err.message,
        });
    }
});

// POST /role-add
Roll.post('/role-add', authenticateToken, async (req, res) => {
    const { name, resource, company } = req.body;

    if (!name || !company || resource === undefined) {
        return res.status(400).json({
            status: false,
            message: 'Missing required fields: name, company, or resource'
        });
    }

    const validation = validateResourceKeys(resource);
    if (!validation.valid) {
        return res.status(400).json({
            status: false,
            message: `Invalid permission keys: ${validation.invalid.join(', ')}`
        });
    }

    const normalizedResource = validation.normalized;

    try {
        const existing = await helper.query(
            `SELECT id FROM roll WHERE name = ? AND company = ?`,
            [name, JSON.stringify(company)],
        );
        if (existing.length > 0) {
            return res.status(409).json({
                status: false,
                message: `Role "${name}" already exists for this company`
            });
        }

        const roleId = await helper.runInTransaction(async (q) => {
            const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const result = await q(
                `INSERT INTO roll (name, resource, date, company) VALUES (?, ?, ?, ?)`,
                [name, JSON.stringify(normalizedResource), formattedDate, JSON.stringify(company)],
            );
            const newRows = await q("SELECT * FROM roll WHERE id = ?", [result.insertId]);
            await logAuditInTx(q, {
                actionType: "CREATE",
                moduleName: "Role",
                recordId: result.insertId,
                recordReference: name,
                newValue: newRows[0],
            });
            return result.insertId;
        });

        res.status(201).json({
            status: true,
            message: 'Role created successfully',
            data: {
                id: roleId,
                name,
                resource: normalizedResource,
                pages: normalizedResource,
                company
            }
        });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({
            status: false,
            message: 'Role creation failed',
            error: err.message
        });
    }
});

// PUT /role-update/:id
Roll.put('/role-update/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, resource, company } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ status: false, message: 'Invalid role ID' });
    }

    if (!name || resource === undefined) {
        return res.status(400).json({
            status: false,
            message: 'Missing required fields: name or resource'
        });
    }

    const validation = validateResourceKeys(resource);
    if (!validation.valid) {
        return res.status(400).json({
            status: false,
            message: `Invalid permission keys: ${validation.invalid.join(', ')}`
        });
    }

    const normalizedResource = validation.normalized;

    try {
        const exists = await helper.query('SELECT * FROM roll WHERE id = ?', [id]);
        if (exists.length === 0) {
            return res.status(404).json({ status: false, message: 'Role not found' });
        }
        const oldRow = exists[0];

        await helper.runInTransaction(async (q) => {
            const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const hasCompanyUpdate = company !== undefined && Array.isArray(company) && company.length > 0;

            if (hasCompanyUpdate) {
                await q(
                    `UPDATE roll SET name = ?, resource = ?, date = ?, company = ? WHERE id = ?`,
                    [name, JSON.stringify(normalizedResource), formattedDate, JSON.stringify(company), id],
                );
            } else {
                await q(
                    `UPDATE roll SET name = ?, resource = ?, date = ? WHERE id = ?`,
                    [name, JSON.stringify(normalizedResource), formattedDate, id],
                );
            }

            const newRows = await q("SELECT * FROM roll WHERE id = ?", [id]);
            await logAuditInTx(q, {
                actionType: "UPDATE",
                moduleName: "Role",
                recordId: id,
                recordReference: name,
                oldValue: oldRow,
                newValue: newRows[0],
            });
        });

        clearPermissionCache(id);

        res.status(200).json({
            status: true,
            message: 'Role updated successfully',
            data: {
                id: parseInt(id, 10),
                name,
                resource: normalizedResource,
                pages: normalizedResource,
                company: company !== undefined ? company : undefined,
            }
        });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({
            status: false,
            message: 'Role update failed',
            error: err.message
        });
    }
});

// DELETE /role-delete/:id
const deleteRoleById = async (id, res) => {
    if (!id || isNaN(id)) {
        return res.status(400).json({ status: false, message: 'Invalid role ID' });
    }

    if (parseInt(id, 10) === SUPER_ADMIN_ROLL_ID) {
        return res.status(403).json({
            status: false,
            message: 'Default Admin role cannot be deleted'
        });
    }

    try {
        const exists = await helper.query('SELECT id, name FROM roll WHERE id = ?', [id]);
        if (exists.length === 0) {
            return res.status(404).json({ status: false, message: 'Role not found' });
        }

        await helper.runInTransaction(async (q) => {
            const rows = await q("SELECT * FROM roll WHERE id = ?", [id]);
            const oldRow = rows[0];
            await q('DELETE FROM roll WHERE id = ?', [id]);
            await logAuditInTx(q, {
                actionType: "DELETE",
                moduleName: "Role",
                recordId: id,
                recordReference: oldRow?.name || String(id),
                oldValue: oldRow,
            });
        });

        clearPermissionCache(id);

        res.status(200).json({
            status: true,
            message: `Role "${exists[0].name}" deleted successfully`
        });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({
            status: false,
            message: 'Role deletion failed',
            error: err.message
        });
    }
};

Roll.delete('/role-delete', authenticateToken, (req, res) => {
    const id = req.query.deleteId || req.query.id;
    deleteRoleById(id, res);
});

Roll.delete('/role-delete/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    deleteRoleById(id, res);
});

module.exports = Roll;
