# ACL drift — permissionRegistry vs route tree

**Purpose:** Document known differences between `src/config/permissionRegistry.js` (Roll UI + `hasPagePermission`) and `src/routes/routes.config.jsx` (Gate 1 route registration). **No permission keys or paths were renamed in Phase 1.**

**Sources of truth:**
- **Route registration / menus:** `routes.config.jsx` → `routeAcl.js` / `routeMeta.js`
- **Roll permission checkboxes / legacy expand:** `permissionRegistry.js`

## Keys in registry but not an active route

| Key | Registry path | Route tree |
|-----|---------------|------------|
| `master.attribute` | `/master/attribute` | Route **commented out** in `routes.config.jsx` (lazy import kept). Users cannot reach page via Gate 1; key remains for Roll UI / legacy perms. |

## Path mismatches (same key, different path string)

| Key | Registry `path` | Route `path` | Notes |
|-----|-------------------|--------------|-------|
| `transaction.inward` | `/transaction/inward` | `/transaction/inward/import` | Registry path is shorthand; ACL uses `permissionKey` on the import route. |

## Route tree only (no separate registry entry)

| Route | ACL | Notes |
|-------|-----|-------|
| Hidden entry routes (`/transaction/*/entry`, etc.) | Same `permissionKey` as parent stock page | `hideFromNav: true`; not listed separately in registry. |
| Legacy aliases (`/report/stone-tranfer-history`, `/inventory/stonedetail`, PHP paths) | `alwaysAllow` or parent key | Compatibility redirects; not in registry. |
| `/` | `alwaysAllow` | Redirect to `/dashboard`. |

## Shared / composite ACL (intentional)

| Situation | Detail |
|-----------|--------|
| `inventory.cycle-count` route | Uses `permissionKey: "inventory.on_hand_stock"` (same key as On Hand Stock). |
| `admin.activity-history` route | Uses `permissionKeys: ["admin.activity_history", "admin.auditor"]` — both keys exist in registry, one route. |
| Admin super-admin routes | `requiredRole: ROLE_ACCESS.SUPER_ADMIN` **plus** `permissionKey` — role gate in `routeAcl.js`, key still in registry for Roll UI. |
| `core.dashboard` | Registry marks `alwaysAllow: true`; route uses `permissionKey: "core.dashboard"` — super-admin / roll logic in ACL layer. |

## Keys aligned (no drift)

All other `permissionKey` / `permissionKeys` values on registered routes in `routes.config.jsx` match a `PAGE_ENTRIES[].key` in `permissionRegistry.js`.

## Phase 1 policy

- **Do not rename** keys or paths without a backend + migration plan.
- When adding a page: update **both** registry and `routes.config.jsx`, or drift will grow.
- Optional follow-up (not Phase 1): generate registry paths from route config or add a CI grep check.
