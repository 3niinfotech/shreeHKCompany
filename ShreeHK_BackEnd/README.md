# ShreeHK BackEnd

Node.js + Express + MySQL backend for ShreeHK Diamond ERP.

## Services Setup & Start

```bash
# Install dependencies
npm install

# Start server (default: port 3500)
npm run start
# Or for local development with auto-reload:
npm run dev
```

---

## Lab Certificate Auto-Fetch Integration (GIA / IGI)

Official grading laboratory integration for automated certificate fetching, Excel auto-verification, stone comparison, and secure credential management.

### 1. Database Architecture (MySQL)

All tables strictly enforce multi-tenant isolation via `company_id`.

- `lab_certificate_cache`: Stores normalized certificate JSON and raw response with TTL.
  - Unique constraint: `(company_id, lab, report_number)`
  - TTL: 30 days for `SUCCESS`, 1 day for `NOT_FOUND`, `ERROR` is not cached.
- `lab_provider_credential`: Stores per-company AES-256-GCM encrypted provider credentials (`api_key_encrypted`, `api_secret_encrypted`, `base_url`).
  - Unique constraint: `(company_id, lab)`
- `lab_fetch_log`: Audit trail for all certificate fetches (`status`, `source`, `response_time_ms`, `error_message`).

### 2. Mandatory 4-Layer Architecture Files

- **Routes (`routes/lab/`)**:
  - `labRoutes.js`: HTTP request parsing, authentication, tenant context via `buildUserContext()`, and route-level permissions (`lab.fetch`, `lab.fetch.bulk`, `lab.manage`).
- **Validators (`validators/lab/`)**:
  - `labValidation.js`: Joi/Schema validation, report number regex validation, SSRF domain validation, whitelist for apply fields (immutable identification fields `report_no` and `lab` cannot be overwritten).
- **Services (`services/lab/`)**:
  - `labService.js`: Business orchestration, cache hit evaluation, daily lookup cap tracking, before/after audit logging.
  - `labProviderInterface.js`: Abstract base contract for all lab provider adapters.
  - `giaProvider.js`: GIA adapter supporting mock fallback when `LAB_ALLOW_MOCK='true'` and official live API execution.
  - `igiProvider.js`: IGI disabled stub ("confirmed API unavailable/pending").
  - `labCredentialVault.js`: AES-256-GCM cryptographic encryption, decryption, and secure key masking (`****...`).
  - `labDataNormalizer.js`: Normalizes diverse lab responses into standardized certificate models.
  - `labMasterMapper.js`: Maps lab grading terms (Cut, Color, Clarity, Polish, Symmetry, Fluorescence) to ShreeHK ERP masters.
- **Repositories (`repositories/lab/`)**:
  - `labCacheRepository.js`: Parameterized SQL queries for certificate cache.
  - `labCredentialRepository.js`: Parameterized SQL queries for encrypted credentials.
  - `labLogRepository.js`: Parameterized SQL queries for fetch audit logs.

### 3. Environment Variables (Strictly Matching Code)

```env
# AES-256-GCM master key for encrypting provider credentials (64-char hex string)
LAB_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Mock provider flag: Must be explicitly 'true' to allow mock responses (defaults to false regardless of NODE_ENV)
LAB_ALLOW_MOCK=false

# SSRF allowlist: Comma-separated list of approved external domains.
# Example with placeholder (never use guessed domains):
LAB_ALLOWED_DOMAINS=<official-gia-api-host>

# Daily live lookup cap per tenant company (default: 500). Cache hits are free and do not count against the cap.
LAB_DAILY_LOOKUP_CAP=500

# Cache TTL for successful certificate fetches in days (default: 30)
LAB_CACHE_TTL_DAYS=30
```

### 4. Provider Implementation Status

- **GIA**: Adapter implemented (`giaProvider.js`). Mock data generator available when `LAB_ALLOW_MOCK='true'` for dev/testing. Live endpoint and authentication headers will be wired once official GIA API credentials and specifications are confirmed.
- **IGI**: Confirmed API unavailable/pending. Provider acts as a disabled stub (`igiProvider.js`) reporting "not configured".

### 5. Automated Tests

```bash
# Run backend lab integration test suite (25 assertions)
node scripts/testLabIntegration.js
```
