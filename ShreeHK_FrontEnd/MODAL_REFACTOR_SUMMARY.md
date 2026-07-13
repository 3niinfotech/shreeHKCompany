# Modal refactor summary

## Modals made common

| Component | Location | Used by |
|-----------|----------|---------|
| **BaseModal** | `components/common/modals/BaseModal.jsx` | `MasterPageTemplate`, `AccountingMasterTemplate`, `MasterTableTemplate`, `OutWord`, `PartyWiseTransaction`, `MasterFormAddModal`/`EditModal` (via `FormModal`) |
| **FormModal** | `components/common/modals/FormModal.jsx` | Via `MasterFormAddModal`, `MasterFormEditModal` → Company, Origin, Lab, Shipping, Category |
| **ConfirmDeleteModal** | `components/common/modals/ConfirmDeleteModal.jsx` (alias of `DeleteConfirmModal`) | All master CRUD pages, accounting tables, OutWord, BalanceBook, ManageUser |
| **WarningActionModal** | `components/common/modals/WarningActionModal.jsx` | Inward×4 via `hooks/ValidationTableModal` re-export |
| **GlobalTableFormsModal** | `hooks/GlobalTableFormsModal.jsx` | Re-export of `BaseModal` (legacy imports still work) |

## Pages updated (this pass)

| Page | What changed | Modal used now |
|------|----------------|----------------|
| `MasterTableTemplate.jsx` | Import | `BaseModal` |
| `OutWord.jsx` | Import + JSX tags | `BaseModal`, `ConfirmDeleteModal` |
| `PartyWiseTransaction.jsx` | Import + JSX tags | `BaseModal`, `ConfirmDeleteModal` |
| `AdvanceTableData.jsx` | Import | `ConfirmDeleteModal` |
| `ExpanseTableData.jsx` | Import | `ConfirmDeleteModal` |
| `BalanceBook.jsx` | Import | `ConfirmDeleteModal` |
| `ManageUser.jsx` | Lazy import | `ConfirmDeleteModal` |
| `ValidationTableModal.jsx` | Moved shell to `WarningActionModal` | Re-export only |

## Pages left unchanged

| Page / component | Reason |
|------------------|--------|
| `AddDiamondToBoxModal.jsx` | Unique layout (radio, table, custom footer styles) — single page |
| `OutstandingcalculationModal.jsx` | Read-only detail, `footer={null}` — single page |
| `AdvancedRollPage.jsx` | Create-role form uses `onFinish` + inline footer (`footer={null}`) |
| `PartyWiseTransaction.jsx` | **Popconfirm** on row delete kept (different UX from delete modal) |
| `DiamondInventoryTable.jsx` | **Popconfirm** for bulk actions; **SkuActionModal** is action menu |
| `ProfileDropdown.jsx` | `Modal.confirm` for logout — one-off |
| `RapNetPriceList`, unmigrated masters | Use `MasterPageTemplate` (already uses `BaseModal` internally) |

## State patterns (unchanged)

| Pattern | Where |
|---------|--------|
| `useModal()` hook | Company, Origin, Lab, Shipping, Category |
| `useState({ open, record })` | Accounting tables, OutWord, ManageUser, PartyWise delete modal |
| `useState(isModalOpen)` | Inward validation, MasterPageTemplate, templates |
| `Modal.confirm` | AdvancedRollPage delete role, ProfileDropdown logout |

## Issues flagged (not fixed)

- **PartyWiseTransaction**: Row delete uses **Popconfirm** while page also has **ConfirmDeleteModal** for another flow — inconsistent but pre-existing.
- **PartyWise delete API**: `partydelete` mutate custom URL may still be ignored by `useDeleteApiRequest`.
- **DeleteConfirmModal** vs **ConfirmDeleteModal**: Same component; prefer `ConfirmDeleteModal` from `components/common/modals`.
- **Master search inputs**: Still not wired to API (unrelated to modals).

## Verify

```bash
cd frontEnd && npm run lint && npm run build
```

Manual: open add/edit/delete on Company, Outward edit, Inward validate modal, PartyWise add/edit.
