# Changelog

All notable changes to Tengen will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## v1.1.0 - 2026-03-16

### Added

**Encrypted Vault Backup & Export**
- Download an encrypted `.tengen` backup of your vault — AES-256-GCM encrypted with your session key, only Tengen can restore it
- Export your vault in Bitwarden-compatible unencrypted JSON format (works with Bitwarden, Vaultwarden, Proton Pass) — guarded by an "unencrypted" warning dialog before download
- Restore from a `.tengen` backup — decrypts and re-encrypts all entries with fresh IVs

**Import from Other Password Managers (backend ready — UI coming in next release)**
- Auto-detects and parses: Bitwarden JSON, Chrome/Firefox/Edge CSV, LastPass CSV, 1Password CSV, Dashlane CSV, KeePass CSV, and a generic CSV fallback
- Format detected automatically from file extension and CSV header row — no manual selection needed

**Import Security Hardening**
- Backup version is strictly validated (`version == 1` only; unknown versions rejected with HTTP 422)
- Payload size capped at 10 MB (frontend pre-check + schema validation)
- Entry count capped at 2,000 per import
- Every imported field is truncated to the same limits as manual entry creation (title 256, username 512, password 4096, URL 2048, notes 10000, tags 20 × 64 chars)
- Entries without a password are silently skipped

**Export / Import Activity History**
- Every export and import — success or failure — is logged to a `DataAuditLog` table (trimmed to 50 rows per user, cascades on account deletion)
- **Settings → Data → Activity History** shows a live audit log: action type, status (✓/✗), entry count, timestamp, and error details where applicable
- Log auto-refreshes after every operation; manual refresh button in the header

**Settings Page — Data Tab**
- New **Data** tab in Settings (alongside Appearance, Profile, Security)
- Collapsible "Import limits & restrictions" section lists all field ceilings transparently
- Supported import app icons displayed as branded chips (Bitwarden, Chrome, LastPass, 1Password, Dashlane, KeePass)

**Vault Search Improvements**
- Search now matches against username and notes fields in addition to title and URL — all filtering happens client-side since these fields are stored encrypted on the backend

**Password Age Warnings**
- Entry cards flag passwords that have not been changed in over 90 days with an amber "Old" badge and a tooltip showing the exact age in days

**Duplicate Password Warnings**
- Entry cards show a "Reused" badge when the same password is used across multiple entries — detected client-side across the full vault

### Fixed
- Duplicate React key warning on entry cards and table when multiple entries share the same tag (switched from tag-value key to index key)
- Import error toast no longer crashes with a React object-rendering error when the server returns a Pydantic 422 validation response

---

## v1.0.0 - 2026-03-14

First public release of Tengen. Built for personal use, open sourced for everyone.

### Added
- Username + master password authentication
- AES-256-GCM encryption at rest with Argon2id key derivation
- Full vault CRUD — add, edit, delete, view password entries
- Password generator with configurable options
- Real-time password strength meter powered by zxcvbn
- HaveIBeenPwned breach detection — auto check on save, manual refresh anytime
- Tags, search, filtering and sorting across the vault
- Password Health dashboard — see weak, pwned, reused and old passwords at a glance
- Copy to clipboard with automatic 30 second clear
- Auto-lock vault after 15 minutes of inactivity
- Dark and light theme with toggle
- Docker Compose setup — `docker compose up` and you're done
- Security headers and Content Security Policy middleware
- Data persisted in SQLite — a single file on your machine, fully yours

## Pre-1.0.0 - March 2026

- Project scaffolded — FastAPI backend, React frontend, SQLite database
- Encryption architecture designed — Argon2id + AES-256-GCM
- Docker Compose setup working end to end
- GitHub repository opened
- Domain tengen.in acquired
- AGPL-3.0 license selected
