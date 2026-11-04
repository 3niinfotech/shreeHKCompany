# ShreeHK ERP — Inventory & Business Logic Understanding Report

> **Document Type:** Business Architecture & Logic Reference Manual  
> **Target Audience:** Diamond Business Owner & Functional Leadership (Simple Hinglish + Technical Precision)  
> **Analysis Mode:** 100% Read-Only Codebase Audit (Zero Code Changes, Zero DB Mutations)  
> **Source Verification:** Every statement is backed by file names and approximate code line numbers.  
> **Generated Date:** 2026-11-02  

---

## 1. Executive Summary (Business Owner ke Liye)

ShreeHK ERP ek complete **Diamond Manufacturing, Trading, Multi-Branch Stock & Double-Entry Accounting Platform** hai. Ek diamond business owner ke nazariye se, yeh software aapke physical safe (tijori), showroom, karigar/lab memo, aur multiple companies ke beech hone wale transactions ka ek digital hisab-kitab rakhta hai.

### Business View me ERP Kaise Kaam Karta Hai:
1. **Physical Diamond vs Digital Stock:** Jab bhi koi stone khareeda jata hai (Purchase Inward), software use ek unique SKU deta hai aur uske carat/pcs ko `dai_product` table me add karta hai. Jab tak stone safe me hai, uska status `onhand` (available) hota hai.
2. **Memo Movement (Bina Paison ke Stone Bahar Bhejna):** Diamond market me sabse aam cheez hoti hai "Jangad / Memo" par maal dena (dekhne ke liye, ya dalal/customer ko test karne ke liye). Software me jab stone Memo OUT hota hai, tab ownership aapke paas hi rehti hai, lekin safe se quantity ghat kar "Memo Bucket" me chali jati hai taaki koi dusra salesperson use dobara na bech sake.
3. **Sale (Pukka Bill):** Jab customer stone approve karta hai, Memo ko Sale me convert kar diya jata hai ya direct Sale entry banti hai. Is point par stone inventory se permanently "Sold" mark ho jata hai aur party ke naam outstanding bill ban jata hai.
4. **Inter-Company Transfer (Ek Sister Concern se Dusri Company me Maal):** ShreeHK group ki multiple companies (jaise Hong Kong entity, Surat entity, Dubai entity) hoti hain. Agar Company A ka stone Company B se bechna ho, toh software automatic 2-leg ya 3-leg transfer generate karta hai:
   - Leg 1: Company A se Company B ko Sale (Outward Bill).
   - Leg 2: Company B me Company A se Purchase (Inward Bill).
   - Leg 3 (agar customer ko direct becha): Company B se Customer ko Final Sale.
5. **Double-Entry Accounting vs Inventory:**
   - **Crucial Business Insight:** ShreeHK ERP me Purchase Inward aur Sale Outward banne se **automatic general ledger (`acc_transaction`) voucher nahi banta**. Sirf Party ka Outstanding Due amount update hota hai.
   - Pukka ledger entry tab banti hai jab **Installment Payment receive/pay** hoti hai ya **Expense / Advance / Manual Transaction** record kiya jata hai.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary-business-owner-ke-liye)
2. [System Overview & Architecture](#2-system-overview--architecture)
3. [Main Tables Map & Data Dictionary](#3-main-tables-map--data-dictionary)
4. [Inventory Core Logic & Bucket Math](#4-inventory-core-logic--bucket-math)
5. [Stone Status Lifecycle & State Machine](#5-stone-status-lifecycle--state-machine)
6. [Box, Parcel & Split Logic (Container Stones)](#6-box-parcel--split-logic-container-stones)
7. [Inward Module (Stock Inflow)](#7-inward-module-stock-inflow)
8. [Outward Module (Stock Outflow)](#8-outward-module-stock-outflow)
9. [Memo & Consignment Deep-Dive](#9-memo--consignment-deep-dive)
10. [GIA / Lab Lifecycle & Certificate Integration](#10-gia--lab-lifecycle--certificate-integration)
11. [Hold & Auto-Release Engine (holdCron)](#11-hold--auto-release-engine-holdcron)
12. [Inter-Company Transfer Engine](#12-inter-company-transfer-engine)
13. [Double-Entry Accounting & Financial Ledger](#13-double-entry-accounting--financial-ledger)
14. [Audit Trail & History Logging (dai_history vs dai_activity_log)](#14-audit-trail--history-logging-dai_history-vs-dai_activity_log)
15. [Soft-Delete vs Permanent Delete Architecture](#15-soft-delete-vs-permanent-delete-architecture)
16. [Reports Engine Breakdown](#16-reports-engine-breakdown)
17. [Supporting Modules (Auth, AI, Tasks, Integrations, Auto-Increment)](#17-supporting-modules-auth-ai-tasks-integrations-auto-increment)
18. [End-to-End Business Scenarios (Before/After Tables)](#18-end-to-end-business-scenarios-beforeafter-tables)
19. [Risks, Gaps & Architectural Vulnerabilities](#19-risks-gaps--architectural-vulnerabilities)
20. [Quick Reference Glossary & Summary Matrix](#20-quick-reference-glossary--summary-matrix)
21. [Unverified Items & Codebase Quirks](#21-unverified-items--codebase-quirks)

---

## 2. System Overview & Architecture

ShreeHK ERP ka technical design modern React 19 Frontend aur Node.js/Express Backend par adharit hai, jisme enterprise multi-tenancy model use kiya gaya hai.

### 2.1 Backend 4-Layer Pattern
Backend me code ko 4 layers me organize kiya gaya hai:
1. **Routes (`ShreeHK_BackEnd/routes/`):** HTTP request receive karta hai, auth verify karta hai, aur parameters extract karta hai.
2. **Validators (`ShreeHK_BackEnd/validators/`):** User ke input data types, required fields, aur business constraints check karta hai.
3. **Services (`ShreeHK_BackEnd/services/`):** Pure diamond business logic, database transactions (`START TRANSACTION`, `COMMIT`, `ROLLBACK`), weighted cost calculations, aur audit snapshots orchestrate karta hai.
4. **Repositories (`ShreeHK_BackEnd/repositories/`):** Direct SQL queries run karta hai strictly parameterized bindings (`?`) ke sath taaki SQL injection na ho sake.

*Source:* `ARCHITECTURE.md` Lines 208–242; `services/stockMovementService.js`; `services/transaction/companyTransferService.js`.

### 2.2 Multi-Company / Multi-Tenant Isolation
System me **Hybrid Multi-Tenant** model hai:
- **Meta Database (`shreehkweb_snj2024_test`):** Isme system-wide common tables hain: `user` (login credentials), `roll` (permissions), `branch` (offices/cities), `company` (subscribed companies), `company_year` (financial fiscal years).
- **Tenant Database (per fiscal year):** Har company aur saal ke business data ke liye separate connection pool banta hai (jaise `dai_product`, `dai_inward`, `dai_outward`, `acc_transaction`).
- **Row-Level Security:** Har tenant query me mandatory clause hota hai: `WHERE company = ?`. Koi bhi company doosri company ka maal ya hisab bina permission nahi dekh sakti.
- *Source:* `tenantHelper.js` Lines 12–115; `middleware/tenantContext.js`.

---

## 3. Main Tables Map & Data Dictionary

| Table Name | Business Purpose | Key Columns & Significance |
|---|---|---|
| `dai_product` | Diamond Master Table — har single stone ya box/parcel ka main identity aur current stock balance. | `id`, `sku`, `polish_pcs`, `polish_carat`, `onhand_pcs`, `onhand_carat`, `memo_pcs`, `memo_carat`, `sold_pcs`, `sold_carat`, `price`, `amount`, `cost`, `lab`, `outward`, `hold`, `group_type`, `outward_parent`, `company`, `visibility`, `deleted`. |
| `dai_product_value` | Stone Technical Specifications (4Cs & grading specs). 1-to-1 mapped with `dai_product`. | `product_id`, `report_no` (Cert#), `shape`, `color`, `clarity`, `cut`, `polish`, `symmentry` *(legacy double 'm')*, `table_pc`, `depth_pc`, `mesurment` *(legacy spelling)*, `f_intensity`, `gridle`. |
| `dai_inward` | Inward Header — purchase ya in-memo voucher ka main bill. | `id`, `entryno`, `invoiceno`, `inward_type` (`purchase`/`memo`), `party`, `date`, `invoicedate`, `total_carat`, `total_amount`, `paid_amount`, `due_amount`, `final_amount`, `products` (CSV of IDs), `company`. |
| `dai_inward_item` | Inward Item Line — inward bill me shamil har individual stone ka snapshot. | `id`, `inward_id`, `product_id`, `sku`, `party`, `inward_type`, `pcs`, `carat`, `price`, `amount`, `balance_pcs`, `balance_carat`, `company`. |
| `dai_outward` | Outward Header — sale, memo out, consign out, lab issue, ya export ka main voucher. | `id`, `entryno`, `invoiceno`, `type` (`sale`/`memo`/`consign`/`lab`/`export`/`inter_transfer`), `party`, `status`, `products` (CSV of IDs), `return_products`, `final_amount`, `paid_amount`, `due_amount`, `company`. |
| `dai_outward_item` | Outward Item Line — voucher ke har stone ka track record aur remaining balance. | `id`, `outward_id`, `product_id`, `sku`, `party`, `outward_type`, `pcs`, `carat`, `price`, `amount`, `status` (NULL/`returned`/`cancelled`), `company`. |
| `dai_history` | Stone Timeline Card — har stone ke jeevan ki har ghatna (inward, memo, return, sale, hold, transfer) ka permanent chronological log. | `id`, `product_id`, `sku`, `action`, `party`, `date`, `description`, `pcs`, `carat`, `price`, `amount`, `type` (`dr`/`cr`), `invoice`, `entry_from`, `balance_pcs`, `balance_carat`, `user`. |
| `acc_transaction` | Double-Entry General Ledger — company ke accounts ki debit/credit book. | `id`, `party`, `other_party`, `date`, `type` (`cr`/`dr`), `book` (cash/bank), `cheque`, `amount`, `description`, `sale_id`, `purchase_id`, `company`, `deleted`. |
| `acc_advance` | Advance Payment & Settle Log — party se aaya advance aur uska bill ke sath settlement. | `id`, `party`, `date`, `type`, `amount`, `use_amount`, `balance_amount`, `invoice`, `assign_date`, `company`. |
| `dai_party` | Customer, Broker, Supplier & Vendor Master Directory. | `id`, `name`, `under_group`, `under_subgroup`, `address`, `contact_number`, `terms`, `company`. |
| `dai_book` | Bank & Cash Accounts Master (e.g. BOC, Citibank, Cash HK, Petty Cash). | `id`, `name`, `type`, `balance`, `company`. |
| `dai_company_transfer` | Inter-Company Transfer Header — group companies ke beech maal transfer ka record. | `id`, `transfer_no`, `from_company_id`, `to_company_id`, `source_outward_id`, `target_inward_id`, `total_pcs`, `total_carat`, `total_amount`, `status`. |
| `dai_company_transfer_item` | Transfer Item Line — transfer hone wale har stone ka mapping record (source SKU se target SKU). | `id`, `transfer_id`, `source_product_id`, `target_product_id`, `source_sku`, `sku` (target SKU), `pcs`, `carat`, `price`, `amount`, `status`. |
| `dai_hold` | Reserved Stones Ledger — temporary hold par rakhe stones ki expiry date aur user description. | `id`, `product_id`, `date` (expiry date), `description`, `user`, `deleted`. |
| `dai_activity_log` | Tamper-Evident System Audit Trail — har user ke button click, create, update, delete, IP address aur diff ka record. | `id`, `company_id`, `user_id`, `user_name`, `action_type`, `module_name`, `record_id`, `record_reference`, `old_value`, `new_value`, `changed_fields`, `created_at`. |
| `dai_incrementid` | Sequential Number Counter — har company ke inward, outward, invoice, reference counters. | `id`, `company`, `inward`, `outward`, `invoice`, `reference`. |

---

## 4. Inventory Core Logic & Bucket Math

ShreeHK ERP me stone ki physical aur commercial sthiti `dai_product` ke bucket columns dwara control hoti hai.

### 4.1 Stock Columns ka Matlab
- **`polish_pcs` / `polish_carat`:** Stone ke actual active stock ka wazan aur nag. Legacy frontend tables is column ko read karti hain. System isko hamesha `onhand_carat` ke barabar sync rakhta hai (`stockMovementService.js` Line 360).
- **`onhand_pcs` / `onhand_carat`:** Safe (tijori) me physically available quantity jo abhi kisi ko bechi ya memo par nahi di gayi hai.
- **`memo_pcs` / `memo_carat`:** Jangad / Memo par bahar gaye hue stones ka total. Ye maal company ka hi hai, par tijori me nahi hai.
- **`sold_pcs` / `sold_carat`:** Is SKU se total kitna maal becha ja chuka hai.
- **`outward`:** Current commercial status string.
  - `''` (Blank / NULL): Available in stock.
  - `'memo'`: Customer/broker ko memo par diya hua hai.
  - `'consign'`: Consignment partner ke paas hai.
  - `'sale'`: Customer ko permanently bik chuka hai.
  - `'export'`: Foreign export consignment par gaya hua hai.
  - `'lab'`: Grading ke liye GIA/IGI lab bheja hua hai.
  - `'transferred'`: Inter-company transfer ke zariye doosri sister company ko de diya gaya hai.
- **`hold` (0 ya 1):** 1 ka matlab stone reserved hai. Inventory search me dikhega par Memo ya Sale me select hone se block rahega (`outwardService.js` Line 504).
- **`visibility` (0 ya 1):** 1 = Active inventory item. 0 = Deactivated / fully sold / split child archived.
- **`outward_parent`:** Agar yeh stone kisi Box/Parcel ko tod kar (split karke) banaya gaya tha, toh parent stone ka ID yahan store hota hai.
- **`site_upload` & `rapnet_upload` (0 ya 1):** Website ya RapNet portal par sync hone ka flag. Jab stone hold, memo, ya sale hota hai, system automatically dono ko 0 kar deta hai taaki portal par galat stone na dikhe.

---

### 4.2 Stock Movement Formulas (`stockMovementService.js`)

#### A. Inward Addition (`applyInwardQty`, Lines 181–265)
Jab purane existing SKU me aur carat add kiya jata hai (box/parcel):
$$\text{next.purchased\_carat} = \text{old.purchased\_carat} + \text{add.carat}$$
$$\text{next.onhand\_carat} = \text{old.onhand\_carat} + \text{add.carat}$$
$$\text{avgPrice} = \frac{(\text{old.onhand\_carat} \times \text{old.price}) + (\text{add.carat} \times \text{add.price})}{\text{next.onhand\_carat}}$$
$$\text{newAmount} = \text{old.amount} + \text{add.amount}$$

#### B. Outward Movement (`applyOutwardQty`, Lines 289–389)
Har action ke hisab se specific bucket update hota hai:

| Action Type (`t`) | Bucket Effect (Formula) | Logic & Business Reason |
|---|---|---|
| **`memo` / `consign`** | $\text{onhand} = \text{onhand} - \text{moveQty}$<br>$\text{memo} = \text{memo} + \text{moveQty}$ | Tijori se maal kam hua, memo bucket me badh gaya. Total ownership bani rehti hai. |
| **`memo_return` / `return`** | $\text{memo} = \text{memo} - \text{moveQty}$<br>$\text{onhand} = \text{onhand} + \text{moveQty}$ | Customer ne maal wapas kar diya; tijori me wapas stock badh gaya. |
| **`sale` / `export`** | $\text{remain} = \text{moveQty} - \text{fromMemo}$<br>$\text{memo} = \text{memo} - \text{fromMemo}$<br>$\text{onhand} = \text{onhand} - \text{remain}$<br>$\text{sold} = \text{sold} + \text{moveQty}$ | Agar stone pehle se memo par tha toh pehle memo bucket se katega; baaki onhand se. Permanent sold ho jayega. |
| **`sale_return` / `export_close`** | $\text{sold} = \text{sold} - \text{moveQty}$<br>$\text{onhand} = \text{onhand} + \text{moveQty}$ | Sale cancel ya customer return hui; sold bucket se ghat kar wapas safe me onhand ho gaya. |
| **`lab`** | $\text{onhand} = \text{unchanged}$<br>$\text{outward} = \text{'lab'}$ | **Venya Rule:** Lab jane par carat/pcs 0 nahi hote. Stone inventory me green status ke sath dikhta rehta hai taaki owner ko pata rahe maal lab me grading ke liye gaya hai. |
| **`lab_return`** | $\text{onhand} = \max(\text{onhand}, \text{moveQty})$<br>$\text{outward} = \text{''}$ | Lab se stone wapas safe me aa gaya. |

---

## 5. Stone Status Lifecycle & State Machine

```
                        ┌─────────────────────────────────────────┐
                        │              PURCHASE INWARD            │
                        │   inward='', outward='', visibility=1   │
                        │       onhand = Purchased Carats         │
                        └────────────────────┬────────────────────┘
                                             │
                                             ▼
                        ┌─────────────────────────────────────────┐
                        │             ON HAND (IN SAFE)           │
                        │         outward='', hold=0, vis=1       │
                        └──────┬─────────────┬─────────────┬──────┘
                               │             │             │
                 Put on Hold   │             │ Memo OUT    │ Send to Lab
                               ▼             │             ▼
                 ┌──────────────────┐        │     ┌──────────────────┐
                 │       HOLD       │        │     │     OUT: LAB     │
                 │ hold=1, vis=1    │        │     │ outward='lab'    │
                 │ (Timer/Cron)     │        │     │ onhand preserved │
                 └────────┬─────────┘        │     └────────┬─────────┘
                          │                  │              │
                 Unhold / │                  │              │ Lab Return
                 Expired  │                  ▼              ▼
                          │         ┌──────────────────┐ ┌──────────────────┐
                          └────────>│    OUT: MEMO     │ │   BACK IN SAFE   │
                                    │ outward='memo'   │ │   outward=''     │
                                    │ onhand=0, memo>0 │ └──────────────────┘
                                    └────────┬─────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
                       ▼ Memo Return                               ▼ Memo to Sale
            ┌──────────────────────┐                    ┌──────────────────────┐
            │     BACK IN SAFE     │                    │      OUT: SALE       │
            │  outward='', vis=1   │                    │ outward='sale'       │
            │  onhand restored     │                    │ onhand=0, sold>0     │
            └──────────────────────┘                    └──────────┬───────────┘
                                                                   │
                                                       Sale Return │
                                                                   ▼
                                                        ┌──────────────────────┐
                                                        │  RESTORED IN SAFE    │
                                                        │  outward='', vis=1   │
                                                        │  sold=0, onhand>0    │
                                                        └──────────────────────┘
```

---

## 6. Box, Parcel & Split Logic (Container Stones)

Diamond business me do tarah ke stock hote hain:
1. **Single Stone:** Har diamond ka apna cert hota hai, 1 pcs = 1 ID.
2. **Box / Parcel (Multi-Stone Container):** Ek packet me 100 pcs ya 50 carats hote hain. Isme se 2 carat bechna ho toh kya hota hai?

### ShreeHK ERP me Box/Parcel ke 2 Flows hain:

#### Modern Balance Flow (`services/stockMovementService.js`)
- Same SKU aur same ID par balance buckets (`onhand_carat`, `memo_carat`, `sold_carat`) manage hote hain.
- Jab 50 carat me se 5 carat Memo ya Sale par jate hain, toh stone ka ID wahi rehta hai, koi duplicate child record nahi banta.
- Line items ka pura hisab `dai_outward_item` table me rehta hai.
- Jab tak `onhand_carat > 0` hai, stone inventory me dikhta rehta hai. Jab `onhand_carat = 0` ho jata hai, tab `outward = 'sale'` lagta hai.

#### Legacy Split Flow (`separateSale`, `outwardService.js` Lines 383–482)
- Jab Box/Parcel se partial stock bheja jata tha, tab system ek naya child stone banata tha jiska `outward_parent = parent.id` hota tha.
- Return ya Sale Cancel par:
  - Child stone ka carat parent stone me jod diya jata hai:
    $$\text{parent.polish\_carat} = \text{parent.polish\_carat} + \text{child.polish\_carat}$$
  - Child stone ko deactivate kar diya jata hai: `visibility = 0, outward_parent = 0`.
- *Source:* `transactionStockService.js` Lines 2351–2401.

---

## 7. Inward Module (Stock Inflow)

Inward module tijori me maal aane ka gateway hai (`routes/inward/inwardRoutes.js`).

### 7.1 Inward Types
1. **Purchase Inward (`inward_type = 'purchase'`):**
   - Direct khareeda hua maal.
   - `dai_product.inward = ''` set hota hai.
   - `dai_product.onhand_carat = polish_carat`, `purchased_carat = polish_carat`.
   - `dai_history` me `action = 'purchase'` insert hota hai (`type = 'cr'`).
2. **In-Memo Entry (`inward_type = 'memo'`):**
   - Dalal ya supplier se dekhne ke liye aaya maal.
   - Maal tijori me dikhta hai lekin company iski maalik nahi hai.
   - `dai_product.inward = 'memo'` set hota hai.
   - `dai_history` me `action = 'memo'` insert hota hai (`type = 'cr'`).
   - Is stone ko export nahi kiya ja sakta jab tak ise purchase na kar liya jaye (`outwardService.js` Line 620).
3. **Consign IN:**
   - Third party broker ne sale karne ke liye stock diya.
4. **Excel Bulk Import (`/transaction/inward/import`):**
   - SheetJS parser se hazaaron stones ek sath parse hokar `bulkInsertRecords` ke zariye insert hote hain (`inwardRoutes.js` Lines 25–44).
   - Duplicate SKU check `checkExist` API se hota hai (Lines 46–160). Agar SKU kisi doosri company ka hai toh block kar deta hai.

### 7.2 Inward Calculation & Accounting
- **Invoice & Reference:** `dai_incrementid` table se sequential `inward` aur `reference` allocate hote hain (`helper.js` Line 62).
- **Party Ledger:** Inward save hone par **koi general ledger voucher (`acc_transaction`) insert nahi hota**. Sirf `dai_inward` me `final_amount`, `paid_amount = 0`, aur `due_amount = final_amount` set hota hai.

### 7.3 Inward Edit aur Delete Flow (`deleteInwardStock`)
*Source:* `transactionStockService.js` Lines 2218–2295.
Agar kisi Inward ko delete karne ki koshish ki jaye:
1. **Financial Lock Check:** System check karta hai kya is bill par koi payment chuki hai:
   `SELECT id FROM acc_transaction WHERE purchase_id = ?` OR `paid_amount > 0`.
   Agar payment ho chuki hai, toh delete **BLOCK** ho jata hai: *"Cannot delete Inward: Payment transactions are already recorded against this bill."*
2. **Lifecycle Lock Check:** System check karta hai kya is bill ka koi bhi stone Outward (Memo/Sale/Lab) par gaya hai ya kisi container me bind hai. Agar haan, toh delete **BLOCK** ho jata hai.
3. **Soft-Delete Execution:** Agar dono checks pass ho gaye, toh transaction me:
   - `dai_product_value` -> `deleted = 1`
   - `dai_history` -> `deleted = 1`
   - `dai_product` -> `deleted = 1`
   - `dai_inward_item` -> `deleted = 1`
   - `dai_inward` -> `deleted = 1`

---

## 8. Outward Module (Stock Outflow)

Outward module safe se maal bahar bhejne ka command center hai (`routes/outward/outwardService.js` aur `outwardRoutes.js`).

### 8.1 Outward Types
- **Sale (`type = 'sale'`):** Final billing. Stone inventory se out (`outward = 'sale'`).
- **Memo (`type = 'memo'`):** Approbation / dekhne ke liye outward (`outward = 'memo'`).
- **Consignment (`type = 'consign'`):** Foreign ya domestic broker ko consignment.
- **Lab (`type = 'lab'`):** GIA/IGI grading ke liye outward.
- **Export (`type = 'export'`):** Custom clearance ke zariye bahar bheja gaya stock.

### 8.2 Outward Creation Flow (`sendTo`, Lines 582–1150)
1. **Validation:** Checks if stones are not on hold (`edata.hold !== 1`) aur stock me available hain.
2. **Invoice Number Generation (`allocateOutwardNumbers`, Lines 100–170):**
   - Entry No: `sale-1`, `memo-1`, `lab-1`, `consign-1`, `export-1`.
   - Invoice No: `INV-1`, `MEMO-1`, `LAB-1` (ya company master se custom prefix jaise `HK-INV-1`).
3. **Stock Reduction:** `stockMovement.applyOutwardQty` execute hota hai.
4. **History Entry:** `dai_history` me entry insert hoti hai (`type = 'dr'`).
5. **WhatsApp / SMS Notification:** Agar sale hui hai toh `notifyStoneSale` trigger hota hai (`helper.js` Line 168).

### 8.3 Memo Return aur Memo-to-Sale Conversion
- **Memo Return (`returnOutwardMemo`, `transactionStockService.js` Lines 1179–1561):**
  - Customer ne stone wapas de diya.
  - `stockMovement.applyOutwardQty(query, pid, 'memo_return', pcs, carat)` chalta hai.
  - Safe me onhand carat badh jata hai, `outward` flag hat jata hai (`outward = ''`).
  - `dai_history` me `action = 'memo_return'` (`type = 'cr'`) banta hai.
  - Agar voucher ke saare stones return ho gaye, toh `dai_outward.status = 'close_memo'`.
- **Memo to Sale (`outwardMemoToSale`, Lines 1563–2026):**
  - Jo stones memo par the, unka ek naya Sale Outward voucher banta hai naye Sale Invoice number ke sath.
  - Purane memo bill se wo stones hata diye jate hain aur agar memo khali ho gaya toh `status = 'close_memo'` ho jata hai.
  - `dai_product.outward = 'sale'` ho jata hai.

### 8.4 Outward Delete / Cancel Flow (`deleteOutwardStock`)
*Source:* `transactionStockService.js` Lines 2330–2502.
1. `dai_outward` aur `dai_outward_item` se item ki quantity nikalta hai.
2. `dai_product` me reverse stock update karta hai:
   - Agar sale thi: `stockMovement.applyOutwardQty(q, pid, 'sale_return', pcs, carat)`.
   - Agar memo tha: `stockMovement.applyOutwardQty(q, pid, 'memo_return', pcs, carat)`.
   - `dai_product.outward = ''` ho jata hai, stone wapas tijori me available ho jata hai.
3. `dai_history` me reversal entry banti hai:
   - Sale delete par: `action = 'sale_close'`, description: *"sale Closing / deleting"*.
   - Export delete par: `action = 'export_close'`.
   - Memo delete par: `action = 'outward_cancel'`.
4. `dai_outward` aur `dai_outward_item` ko `deleted = 1` mark karta hai.
5. ⚠️ **Critical Risk Identified:** Yahan `acc_transaction` (ledger) reverse **nahi** hota. Agar outstanding me payment installment chadha di gayi thi, toh wo ledger me waise hi reh jati hai!

---

## 9. Memo & Consignment Deep-Dive

Diamond business me Memo aur Consignment do sabse ahem pillars hain.

| Parameter | In-Memo (Memo IN) | Out-Memo (Memo OUT) | Consign IN | Consign OUT |
|---|---|---|---|---|
| **Stock Physical Location** | Hamare Safe (Tijori) me | Customer / Broker ke paas | Hamare Safe (Tijori) me | Consignee Partner ke paas |
| **Ownership (Maal Kiska Hai?)** | Supplier ka (Hamara nahi) | Hamara (ShreeHK ka) | Consignor Party ka | Hamara (ShreeHK ka) |
| **dai_product Stithi** | `inward = 'memo'`, `outward = ''` | `inward = ''`, `outward = 'memo'` | `inward = 'consign'`, `outward = ''` | `inward = ''`, `outward = 'consign'` |
| **Onhand Carat Balance** | Available (Tijori me hai) | 0 (Safe se bahar gaya) | Available | 0 (Safe se bahar gaya) |
| **Bechne ka Adhikar** | Direct sell block hai (pehle purchase convert karna padega) | Customer approve kare toh Sale me convert ho sakta hai | Direct sell possible | Broker approve kare toh Sale ban sakti hai |
| **Accounting Entry** | Koi ledger entry nahi | Koi ledger entry nahi | Koi ledger entry nahi | Koi ledger entry nahi |

---

## 10. GIA / Lab Lifecycle & Certificate Integration

Jab diamonds grading aur certification ke liye GIA ya IGI lab bheje jate hain:

### 10.1 Lab Outward & Return Flow
1. **Send to Lab (`sendTo`, type='lab'):**
   - `dai_outward` me `type = 'lab'`, `lab = 'GIA'` ka voucher banta hai.
   - `dai_product.outward = 'lab'` set hota hai.
   - **Crucial Rule:** Lab bhejne par **pcs aur carat deduct nahi hote** (`stockMovementService.js` Line 344: `next.onhand_pcs = b.onhand_pcs; next.onhand_carat = b.onhand_carat;`). Stone inventory screen par rehta hai par uska badge "Lab" mark ho jata hai.
   - `dai_history` me `action = 'lab'` (`type = 'dr'`) likha jata hai.
2. **Receive from Lab (`returnGia`, `transactionStockService.js` Lines 908–1121):**
   - Lab se stone wapas aaya.
   - `dai_product.outward = ''` clear ho jata hai.
   - Naya report number, weight, cut, color, clarity stone par apply hota hai.
   - `dai_history` me `action = 'lab_return'` (`type = 'cr'`) insert hota hai.

### 10.2 Lab Certificate Caching Engine
External lab APIs (GIA Web Check) par rate limits aur costs hoti hain. Isliye system me 3-table caching architecture hai:
- **`lab_provider_credential`:** Lab API access keys encrypted form me rakhta hai.
- **`lab_certificate_cache`:** Ek baar GIA se cert fetch ho jaye toh JSON payload DB me cache ho jata hai taaki dobara API call na karni pade (`services/lab/labService.js`).
- **`lab_fetch_log`:** Har certificate query ki audit logging (success/failure, response time, user ID).

---

## 11. Hold & Auto-Release Engine (holdCron)

Diamond trading me buyer aksar kehta hai: *"Ye 2 carat ka stone kal sham tak mere liye hold par rakhna."*

### 11.1 Hold Logic (`outwardService.js` Lines 1243–1369)
- Jab user inventory se stone ko Hold karta hai:
  - `dai_product.hold = 1` set hota hai.
  - `site_upload = 0, rapnet_upload = 0` (portal se turant unlist ho jata hai).
  - Agar user ne expiry date ya remark diya hai toh `dai_hold` table me row insert/update hoti hai (`upsertHoldRow`).
  - `dai_history` me `action = 'hold'` insert hota hai.
  - Jab stone Hold par hota hai, toh koi doosra user use Sale, Memo ya Lab Outward me select nahi kar sakta (`validateProductsForMemo` Line 505: `if (edata.hold == 1) return 'SKU ... is on hold'`).

### 11.2 Auto-Release Cron (`jobs/holdCron.js`)
- Server me background worker daily raat ko ya scheduler par run hota hai:
- `findExpiredHolds` query chalata hai: `SELECT * FROM dai_hold WHERE date < today`.
- Jo stones expire ho chuke hain:
  1. `UPDATE dai_product SET hold = 0 WHERE id = ?`.
  2. `dai_history` me auto-unhold entry banti hai: *"stone put on unhold through auto unhold and show in inventory."*
  3. `dai_activity_log` me SYSTEM log banta hai.
  4. `dai_hold` se record delete kar diya jata hai.

---

## 12. Inter-Company Transfer Engine

*Source:* `services/transaction/companyTransferService.js` Lines 117–543.

Jab group ki Company 1 (jaise Surat entity) se Company 2 (jaise Hong Kong entity) me diamond transfer hota hai:

### 12.1 Execution Flow (Atomic Transaction)
1. **Source Stone Validation:** Company 1 ke `dai_product` me check hota hai ki stone available hai aur carat sufficient hai.
2. **Transfer Sequence Allocation:** `dai_company_transfer` se naya `transfer_no` generate hota hai (jaise `TRF-101`).
3. **Dual Voucher Creation:**
   - **Company 1 (Source) me Sale Bill:** `dai_outward` me `type = 'inter_transfer'`, `status = 'transferred'`, `party = Company 2 Name`.
   - **Company 2 (Target) me Purchase Bill:** `dai_inward` me `inward_type = 'inter_transfer'`, `party = Company 1 Name`.
4. **Header Record (`dai_company_transfer`):** Dono company IDs, voucher numbers aur totals store karta hai.
5. **Stock Movement in Source Company:**
   - Full transfer par: `dai_product.outward = 'transferred'`, `polish_carat = 0`, `onhand_carat = 0`.
   - Partial transfer par: remaining balance safe me rehta hai.
   - History: `dai_history` me `action = 'inter_transfer'`, `type = 'dr'`.
6. **Stock Creation in Target Company:**
   - Target SKU generation (`generateTargetSku`): Agar root SKU `DIA100` hai toh naya SKU `DIA100-T1` ban jata hai (ya agar `keepOriginalSku` true ho toh same `DIA100` rehta hai).
   - Naya record `dai_product` me insert hota hai: `company = to_company_id`, `inward = 'transfer'`.
   - Naya record `dai_product_value` me insert hota hai (saari 4Cs grading specs copy hoti hain).
   - Target history: `dai_history` me `action = 'inter_transfer'`, `type = 'cr'`.
7. **Line Item Mapping:** `dai_company_transfer_item` me `source_product_id` aur `target_product_id` map ho jate hain.

### 12.2 Transfer Return (`executeSaleReturn`, Lines 595–762)
Agar Company 2 ne maal wapas Company 1 ko bhej diya:
- Condition: Target stone Company 2 me unsold hona chahiye (`targetStone.outward === ''`). Agar Company 2 use aage bech chuki hai, toh return **BLOCK** ho jata hai!
- Target stone `visibility = 0, outward = 'returned'` mark ho jata hai.
- Source stone Company 1 me wapas reactivate ho jata hai (`outward = ''`, carat restored).
- Transfer status `'returned'` ho jata hai.

---

## 13. Double-Entry Accounting & Financial Ledger

### 13.1 Core Accounting Structure
- **Chart of Accounts:**
  - `acc_group` (Main Head, jaise Assets, Liabilities, Income, Expenses).
  - `acc_subgroup` (Sub-head, jaise Debtors, Creditors, Bank Accounts, Direct Expenses).
- **Parties:** `dai_party` (Customers aur Suppliers).
- **Cash/Bank Books:** `dai_book` (Bank accounts aur Cash registers).
- **General Ledger Table:** `acc_transaction`
  - `party`: Party ID ya Name.
  - `other_party`: Contra party ya offset book.
  - `type`: `'cr'` (Credit) ya `'dr'` (Debit).
  - `book`: Payment method (BOC, Citibank, Cash).
  - `sale_id`: Link to `dai_outward.id` (agar sale ki payment hai).
  - `purchase_id`: Link to `dai_inward.id` (agar purchase ki payment hai).

### 13.2 Gap Analysis: Stock Actions vs Accounting Ledger Auto-Creation

| Stock Action | Outstanding Update? | Automatic Ledger Entry (`acc_transaction`) Banti Hai? | Analysis & Reason |
|---|---|---|---|
| **Purchase Inward Entry** | **HAAN** (`dai_inward.due_amount`) | **NAHI** | System purchase save hone par ledger voucher nahi banata. Ledger me entry tab aati hai jab payment installment chukayi jaye. |
| **Sale Outward Entry** | **HAAN** (`dai_outward.due_amount`) | **NAHI** | Direct sale par koi ledger debit/credit insert nahi hota. Outstanding report me bill khada ho jata hai. |
| **Memo IN / Memo OUT** | **NAHI** | **NAHI** | Correct — memo sirf physical custody transfer hai, accounting transaction nahi. |
| **Lab Issue / Return** | **NAHI** | **NAHI** | Lab fees ka alag expense voucher banana padta hai. |
| **Outstanding Installment** | **HAAN** (`due_amount` reduces) | **HAAN** (`reportRoutes.js` Line 424) | Jab user Outstanding report se Payment chadhata hai, tab `acc_transaction` me direct INSERT hota hai (`type = paymentType`). |
| **Expense Entry** | N/A | **HAAN** (`expensePaymentRepository.js`) | Expense voucher direct ledger me insert hota hai. |
| **Advance Payment** | N/A | **HAAN** (`acc_advance` & `acc_transaction`) | Advance aane par ledger entry banti hai. |
| **Sale Delete** | N/A | **NAHI (GAP / RISK)** | Outward delete hone par `acc_transaction` se payment reverse nahi hoti! |

---

## 14. Audit Trail & History Logging (dai_history vs dai_activity_log)

System me do alag-alag audit systems chalte hain:

### 14.1 `dai_history` (Stone Timeline Card)
- **Kiske liye:** Har individual diamond ka physical hisab.
- **Kab insert hota hai:** Jab bhi kisi stone par physical/commercial movement hoti hai.
- **Action Names ki Poori List:**
  1. `'purchase'`: Inward purchase entry.
  2. `'purchase_return'`: Purchase party ko maal wapas bheja.
  3. `'memo'`: Inward Memo receive hua ya Outward Memo bheja.
  4. `'memo_return'`: Outward memo se stone safe me wapas aaya.
  5. `'consign'`: Consignment par stone diya.
  6. `'consign_return'`: Consignment stone wapas aaya.
  7. `'sale'`: Customer ko final sale bill bana.
  8. `'sale_return'`: Customer ne bika hua stone return kiya.
  9. `'sale_close'`: Sale bill cancel/delete hone par stone safe me wapas aaya.
  10. `'lab'`: Stone GIA/IGI lab grading ke liye bheja.
  11. `'lab_return'`: Lab se stone certify hokar safe me wapas aaya.
  12. `'hold'`: Stone temporary customer ke liye hold par rakha.
  13. `'unhold'`: Stone unhold hokar dobara inventory me open hua.
  14. `'inter_transfer'`: Company 1 se Company 2 me stone transfer hua.
  15. `'return'`: Transfer stone wapas source company ko return hua.
  16. `'outward_cancel'`: Outward voucher delete hone par stone restore hua.

### 14.2 `dai_activity_log` (Tamper-Evident System Audit Trail)
*Source:* `services/auditService.js` Lines 234–240.
- **Kiske liye:** Compliance, user accountability, aur security.
- **Kya log karta hai:**
  - `user_id`, `user_name`, `user_role`, `ip_address`, `user_agent`.
  - `action_type`: `INSERT`, `UPDATE`, `DELETE`, `STOCK_IN`, `STOCK_OUT`, `SEND_TO_LAB`, `MEMO_CREATE`.
  - `old_value` aur `new_value`: Mutation se pehle aur baad ka complete JSON snapshot.
  - `changed_fields`: Kaun se specific fields badle (diff comparison).
- **Rule:** Ye table permanent hoti hai aur Company Permanent Delete me bhi delete **nahi** hoti (`permanentDeleteConfig.js` Line 118).

---

## 15. Soft-Delete vs Permanent Delete Architecture

### 15.1 Universal Soft-Delete Architecture
*Source:* `scripts/migrateUniversalSoftDelete.js`.
- System ke 30 se zyada main tables me 3 audit columns add kiye gaye hain:
  - `deleted` (TINYINT: 0 = Active, 1 = Deleted).
  - `deleted_at` (DATETIME: deletion timestamp).
  - `deleted_by` (INT: user ID jisne delete kiya).
- **Queries me rule:** Har SQL SELECT query me mandatory filter hota hai:
  `WHERE ... AND (deleted = 0 OR deleted IS NULL)`.
- **Delete ke baad:** Data DB se physical wipe nahi hota. UI me kisi bhi report ya list me nahi dikhta, par database me forensic audit ke liye surakshit rehta hai.

### 15.2 Permanent Delete Architecture (`services/permanentDeleteService.js`)
Jab superadmin kisi test company ya defunct entity ko permanently wipe karta hai:
- `config/permanentDeleteConfig.js` me 42 tenant tables ki strict hierarchy defined hai.
- **Child-first Deletion Order:**
  1. `dai_history` & `dai_product_value` (Product ke children).
  2. `dai_inward_item` & `dai_outward_item` (Vouchers ke line items).
  3. `dai_product` (Main inventory).
  4. `dai_inward` & `dai_outward` (Voucher headers).
  5. `acc_transaction` & `acc_advance` (Accounting records).
  6. `dai_party` & `dai_book` (Master entities).
- Meta tables (`user_track`, `notification`, `dai_quick_notes`) wipe hote hain.
- `dai_activity_log` ko explicitly chhod diya jata hai compliance ke liye.

---

## 16. Reports Engine Breakdown

| Report Name | Route Path | Data Source Tables | Filters Applied | Calculated Values & Output |
|---|---|---|---|---|
| **Inventory Report (My Inventory)** | `/report/transaction` & `/inventory/my-inventory` | `dai_product p` LEFT JOIN `dai_product_value pv` | `p.company = ?`, `visibility = 1`, `(outward = '' OR outward IS NULL)`, shape, color, clarity, carat range. | Total stones on hand, total carat, average price/ct, total inventory cost & sell value. |
| **Outstanding Sale Report** | `/report/outstanding` (`type='sale'`) | `dai_outward o` LEFT JOIN `dai_party p` | `o.type IN ('sale','export')`, `o.company = ?`, `o.due_amount > 0`, `deleted = 0`. | Party name, invoice#, invoice date, terms, due date, `final_amount`, `paid_amount`, `due_amount` (Receivable). |
| **Outstanding Purchase Report** | `/report/outstanding` (`type='purchase'`) | `dai_inward i` LEFT JOIN `dai_party p` | `i.inward_type = 'purchase'`, `i.company = ?`, `i.due_amount > 0`, `deleted = 0`. | Supplier name, bill#, bill date, `final_amount`, `paid_amount`, `due_amount` (Payable). |
| **Party Transaction Ledger** | `/accounting/party-report` | `acc_transaction t` LEFT JOIN `dai_party p` | `t.party = ?`, `t.company = ?`, date range (`date BETWEEN ? AND ?`). | Sequential running balance: Credit (+), Debit (-), Net outstanding closing balance. |
| **Stone History Report** | `/report/stone-history` | `dai_history h` LEFT JOIN `dai_party pt` | `h.sku = ?` OR `h.product_id = ?`, branch companies. | Full chronological audit trail: Purchase -> Memo -> Return -> Sale with dates and invoices. |
| **Sale Stone Report** | `/report/sale-stock` | `dai_outward o` JOIN `dai_outward_item oi` JOIN `dai_product p` | `o.type = 'sale'`, `o.company = ?`, date range. | Sold stones analysis: selling price vs inward cost, profit margin per stone and per carat. |
| **Group / Subgroup Report** | `/report/group` | `dai_product p` JOIN `category c` | `p.company = ?`, `visibility = 1`, grouped by `shape`, `color`, `size`. | Carat weight and inventory valuation summarized by stone categories. |

---

## 17. Supporting Modules

### 17.1 Authentication, JWT & Dynamic Roles
- **Auth Flow (`routes/user/userRoutes.js`):** User login par bcrypt password match hota hai. JWT token generate hota hai jisme `{ user_id, username, roll, companyId, yearId }` pack hota hai. Rate limiter: 50 requests / 15 minutes.
- **Dynamic ACL (`authMiddleware.js` & `permissionHelper.js`):** User ke role me 65+ granular permission keys hoti hain (jaise `transaction.sale`, `inventory.view`, `lab.fetch`). Har API call par backend permission matrix match karta hai.

### 17.2 AI Assistant Tools (`services/ai/tools/inventoryTools.js`)
- LLM Agent ke liye 23 structured parameterized tools register hain:
  - `searchInventory`: Natural language se diamonds khojna.
  - `getInventorySummary`: Total inventory valuation aur carat summarize karna.
  - **Sensitive Price Masking:** Agar logged-in user Super Admin nahi hai (`roleId !== 1`), toh `cost`, `purchase_price`, aur `margin` fields AI response me mask ho jate hain (`sanitizeStoneFields`).

### 17.3 Invoice Numbering & Auto-Increment (`dai_incrementid`)
- Har company ke counters `dai_incrementid` me rehte hain: `outward`, `invoice`, `memo_invoice`, `lab_invoice`, `inward`, `reference`.
- Counter collision se bachne ke liye `allocateOutwardNumbers` database me existing maximum number scan karta hai aur usse aage counter advance karta hai.

---

## 18. End-to-End Business Scenarios (Before/After Tables)

### Scenario A: Ek Diamond ka Pura Jeevan Chakra (Life of 1 Stone)
**Stone Details:** SKU: `DIA-999`, Round 1.50 ct, Cost \$2,000/ct (\$3,000 total), Sell Price \$2,500/ct (\$3,750 total).

| Step | Action Performed | `dai_product` Columns State | `dai_history` Log | `acc_transaction` (Ledger) |
|---|---|---|---|---|
| **1** | **Purchase Inward** (Supplier: *Shree Gems*) | `onhand_carat: 1.50`<br>`memo_carat: 0`<br>`sold_carat: 0`<br>`outward: ''`<br>`visibility: 1`<br>`hold: 0` | Action: `purchase`<br>Type: `cr`<br>Carat: 1.50<br>Party: *Shree Gems*<br>Desc: *Stone Inward Purchase* | No auto entry.<br>`dai_inward.due_amount = 3000` |
| **2** | **Put on Hold** (Customer: *Vijay Mehta*, 2 din ke liye) | `onhand_carat: 1.50`<br>`outward: ''`<br>`hold: 1`<br>`site_upload: 0` | Action: `hold`<br>Desc: *Stone put on Hold for while.* | No entry. |
| **3** | **Unhold** (Hold expired ya release kiya) | `onhand_carat: 1.50`<br>`outward: ''`<br>`hold: 0` | Action: `unhold`<br>Desc: *Stone put unhold and show in inventory.* | No entry. |
| **4** | **Memo OUT** (Broker: *Rajesh Diamond*, Inv# `MEMO-12`) | `onhand_carat: 0`<br>`memo_carat: 1.50`<br>`sold_carat: 0`<br>`outward: 'memo'` | Action: `memo`<br>Type: `dr`<br>Carat: 1.50<br>Party: *Rajesh Diamond*<br>Invoice: `MEMO-12` | No entry. (Ownership remains with ShreeHK). |
| **5** | **Memo Return** (Customer ne stone reject kiya) | `onhand_carat: 1.50`<br>`memo_carat: 0`<br>`sold_carat: 0`<br>`outward: ''` | Action: `memo_return`<br>Type: `cr`<br>Carat: 1.50<br>Balance: 1.50 | No entry. |
| **6** | **Final Sale** (Buyer: *Crown Jewels*, Inv# `INV-55`) | `onhand_carat: 0`<br>`memo_carat: 0`<br>`sold_carat: 1.50`<br>`outward: 'sale'` | Action: `sale`<br>Type: `dr`<br>Carat: 1.50<br>Amount: \$3,750<br>Invoice: `INV-55` | No auto entry.<br>`dai_outward.due_amount = 3750` |
| **7** | **Payment Received** (Installment via BOC Bank) | `dai_product` unchanged. | N/A (Financial action). | `acc_transaction` INSERT:<br>Party: *Crown Jewels*<br>Book: *BOC Bank*<br>Type: `cr`<br>Amount: \$3,750<br>Sale ID: linked |
| **8** | **Sale Delete** (Bill cancel kiya gaya) | `onhand_carat: 1.50`<br>`sold_carat: 0`<br>`outward: ''`<br>`visibility: 1` | Action: `sale_close`<br>Type: `cr`<br>Desc: *sale Closing / deleting* | ⚠️ **Ledger gap:** `acc_transaction` entry auto-delete nahi hui! |

---

### Scenario B: GIA Lab Send -> Return Flow
1. **Send to Lab:**
   - `dai_product`: `polish_carat = 1.00`, `onhand_carat = 1.00` (unchanged), `outward = 'lab'`.
   - `dai_history`: Action `lab`, Type `dr`.
2. **Receive from Lab (with new cert):**
   - `dai_product`: `outward = ''`, `lab = 'GIA'`.
   - `dai_product_value`: `report_no = '2195048210'`, `cut = 'EX'`, `polish = 'EX'`, `symmentry = 'EX'`.
   - `dai_history`: Action `lab_return`, Type `cr`.

---

### Scenario C: Inter-Company Transfer (Surat Entity -> Hong Kong Entity)
1. **Surat Entity (Company #1):**
   - Stone `SUR-01` (1.00 ct) outward hota hai: `outward = 'transferred'`, `onhand = 0`.
   - `dai_outward` bill banta hai: `type = 'inter_transfer'`, Party: *Hong Kong Entity*.
   - History: Action `inter_transfer`, Type `dr`.
2. **Hong Kong Entity (Company #2):**
   - Naya stone create hota hai: SKU `SUR-01-T1` (1.00 ct), `company = 2`, `inward = 'transfer'`.
   - `dai_inward` bill banta hai: `inward_type = 'inter_transfer'`, Party: *Surat Entity*.
   - History: Action `inter_transfer`, Type `cr`.

---

## 19. Risks, Gaps & Architectural Vulnerabilities

> [!WARNING]
> Ye sabhi points codebase audit ke dauran detect huye hain. Inhe report me highlight kiya gaya hai taaki business owner aur tech team aware rahein. Kisi bhi code ko touch nahi kiya gaya hai.

| # | File & Line Reference | Identified Problem / Gap | Business & Operational Impact | Severity |
|---|---|---|---|---|
| **1** | `routes/transaction/transactionStockService.js`<br>Lines 2330–2484 (`deleteOutwardStock`) | **Ledger Orphan on Sale Deletion:** Jab Sale delete hoti hai, stock safe me wapas aa jata hai, lekin agar customer ki koi payment entry `acc_transaction` me ho chuki thi, toh wo delete ya reverse nahi hoti. | Safe me stock bhi badh jayega aur customer ke ledger me payment bhi dikhti rahegi — Financial Ledger aur Stock mismatch ho jayega. | **HIGH** |
| **2** | `routes/outward/outwardRoutes.js`<br>Line 148 | **Hardcoded User 16 Visibility Bypass:** `let userFilter = (post.userid === 16 \|\| post.userid === 1) ? "" : " AND o.user != 16";` | Agar koi user ID 16 ke zariye sale karega, toh baaki employees ya branches ko wo outward vouchers dikhenge hi nahi (Hidden account quirk). | **MEDIUM** |
| **3** | `routes/inward/inwardRoutes.js` & `routes/outward/outwardService.js` | **No Auto General Ledger Voucher on Trade Inward/Outward:** Purchase aur Sale bills banne par `acc_transaction` me debit/credit entry insert nahi hoti. Sirf Outstanding report me balance rehta hai. | Double-entry trial balance tab tak complete nahi hota jab tak manual transaction ya installment na mari jaye. | **HIGH** |
| **4** | `services/stockMovementService.js`<br>Lines 289–353 (`applyOutwardQty`) | **Zero Balance Floating Point Precision:** Floating point comparisons me `0.0001` tolerance use ki gayi hai, lekin pure decimal math library (`bignumber.js`) har jagah nahi hai. | 3-decimal carat rounding (jaise 0.005 ct) me rare occasions par rounding discrepancy ho sakti hai. | **LOW** |
| **5** | `routes/outward/outwardService.js`<br>Lines 1243–1369 (`holdProducts`) | **Non-Transactional Hold Batch:** Hold function multiple stones par loop chalata hai bina wrapping transaction ke. Agar 5 stones me se 3rd par DB crash hui, toh 2 hold honge aur 3 open reh jayenge. | Partial hold state in database. | **MEDIUM** |
| **6** | `services/lab/igiProvider.js` | **Disabled IGI Lab Provider:** IGI provider file ek blank stub hai. Sirf GIA API active hai. | Agar company IGI certified diamonds import karegi toh online certificate fetch fail hoga. | **LOW** |

---

## 20. Quick Reference Glossary & Summary Matrix

### 20.1 Glossary (Simple Hinglish)
- **Memo (Jangad):** Bina advance payment ke customer ya dalal ko diamond dekhne ke liye dena. Maal company ka hi rehta hai par safe me nahi hota.
- **Consignment:** External broker ya foreign counter ko lambe samay ke liye sale ke purpose se maal dena.
- **On Hand:** Tijori (Safe) me physically rakha hua aur free stock jo turant becha ja sakta hai.
- **Parcel / Box:** Multi-stone diamond packet (jaise meelee diamonds, choki, ya pointers) jisme kayi pieces hote hain.
- **Single Stone:** Certified diamond jiska single piece track hota hai.
- **RapNet Upload:** Rapaport diamond trading network par live inventory sync karna.
- **Hold:** Kisi customer ke kehne par stone ko lock karna taaki koi aur salesman use na beche.

---

### 20.2 One-Page Summary Matrix

| Business Action | Stock Effect (`dai_product`) | History Action (`dai_history`) | Auto Ledger Entry? | Can Be Deleted / Reversed? |
|---|---|---|---|---|
| **Purchase Inward** | `onhand` increases, `outward=''` | `purchase` (`cr`) | **NO** (inward bill only) | **YES** (if no payment & not outwarded) |
| **In-Memo Receive** | `onhand` increases, `inward='memo'` | `memo` (`cr`) | **NO** | **YES** |
| **In-Memo Return** | `onhand` decreases, `visibility=0` | `purchase_return` (`dr`) | **NO** | **YES** |
| **In-Memo -> Purchase** | `inward=''` (Ownership transfer) | `purchase` (`cr`, pcs=0, ct=0) | **NO** | **NO** (linked to purchase bill) |
| **Memo OUT** | `onhand` decreases, `memo` increases | `memo` (`dr`) | **NO** | **YES** (via Memo Return / Cancel) |
| **Memo Return** | `memo` decreases, `onhand` increases | `memo_return` (`cr`) | **NO** | N/A (Reversal itself) |
| **Memo -> Sale** | `memo` decreases, `sold` increases | `sale` (`dr`) | **NO** (sale bill only) | **YES** (via Sale Delete) |
| **Direct Sale** | `onhand` decreases, `sold` increases | `sale` (`dr`) | **NO** (sale bill only) | **YES** (via Sale Delete) |
| **Send to Lab (GIA)** | `onhand` unchanged, `outward='lab'` | `lab` (`dr`) | **NO** | **YES** (via Delete GIA) |
| **Lab Return** | `outward=''` (specs updated) | `lab_return` (`cr`) | **NO** | N/A |
| **Hold Stone** | `hold=1`, `site_upload=0` | `hold` | **NO** | **YES** (Unhold or auto holdCron) |
| **Inter-Company Transfer** | Co1: `onhand=0`; Co2: New SKU created | `inter_transfer` (dr/cr) | **NO** | **YES** (via Sale Return) |
| **Outstanding Installment** | Unchanged | N/A | **YES** (`acc_transaction` INSERT) | **YES** (via Accounting Delete) |

---

## 21. Unverified Items & Codebase Quirks

1. **`dai_bank` Table:** DB schema me table exist karti hai par Node.js backend me koi active query nahi hai. Cash/Bank accounts ke liye `dai_book` use hoti hai.
2. **`dai_jewelry` & `sms_*` Tables:** Legacy PHP (Venya ERP) tables hain jo current Node backend me inactive hain (`permanentDeleteConfig.js` Lines 127–129).
3. **VAT Columns on Outward:** Kuch databases me `dai_outward` me `vat_percent` aur `vat_amount` columns nahi hain, isliye backend runtime par `SHOW COLUMNS` check karta hai taaki query crash na ho (`outwardService.js` Lines 221–240).
4. **Typo Column Names in Production:** `pv.symmentry` (double 'm') aur `pv.mesurment` (missing letters) database me aise hi store hain. Inhe SQL queries me fix nahi kiya ja sakta warna column not found error aayega.

