# Roadmap

## ✅ v1.0 — Core (Released)

> The foundation. Everything you need, nothing you don't.

- [x] Username + master password authentication
- [x] Argon2id key derivation + AES-256-GCM encryption
- [x] Full vault CRUD (add, edit, delete, view entries)
- [x] Password generator (configurable length, symbols, digits)
- [x] Password strength meter (zxcvbn)
- [x] HaveIBeenPwned breach detection (auto + manual)
- [x] Tags, search, filtering, sorting
- [x] Copy to clipboard with 30s auto-clear
- [x] Auto-lock after 15 minutes of inactivity
- [x] Password Health dashboard (weak, pwned, reused, old)
- [x] Dark / light theme
- [x] Docker Compose — one command setup
- [x] Security headers + CSP

## ✅ v1.1 — Polish & Import (Released)

> Making it easier to switch to Tengen and day-to-day use smoother.

- [x] Encrypted vault backup / export (.tengen)
- [x] Favicon fetching for entry URLs
- [x] Duplicate password warnings on entry cards
- [x] Password age warnings (flag entries older than 90 days)
- [x] Vault search improvements (search by username, notes)

## ✅ v1.2 — Notes Vault & Security (Released)

> Private notes, stronger vault ergonomics, and backup evolution.

- [x] Refined Vault Health Security Scoring (Perfectly Healthy percentage)
- [x] Private Notes section (encrypted notes with folder + tag organisation)
- [x] Notes block editor (Tiptap)
- [x] Per-note lock with PIN/password
- [x] Notes search with lock-aware behavior (body searchable only after unlock)
- [x] Notes APIs (`/vault/notes`, `/vault/note-folders`, `/vault/note-tags`)
- [x] Encrypted backup v2 with notes export/import support
- [x] Command palette integration for opening notes
- [x] Import from Bitwarden JSON export (backend)
- [x] Import from 1Password CSV export (backend)
- [x] Import from LastPass CSV export (backend)
- [x] Import from Chrome / Firefox / Edge CSV export (backend)
- [x] Import from Dashlane CSV export (backend)
- [x] Import from KeePass CSV export (backend)

## 🔜 v1.2.1 — Bug Fixes

> Squashing a few bugs found from the major v1.2 launch.

- [ ] Fix formatting issue where TipTap markdown shortcuts fail to process correctly
- [ ] Fix Export/Import logs issue where the notes count is not updating; currently only the password count is displayed.

## 🔜 v1.3 — Hardening & Trust

> Security controls and operational safeguards.

- [ ] Import UI for multiple vendors (Bitwarden/1Password/LastPass/Chrome/Dashlane/KeePass)
- [ ] HTTPS support with self-signed cert auto-generation
- [ ] Vault unlock with biometrics (browser WebAuthn API)
- [ ] Login attempt rate limiting + lockout
- [ ] Audit log (track when entries were accessed/modified)
- [ ] Argon2id parameter tuning via config
- [ ] Optional two-factor authentication (TOTP)
- [ ] Session management (view and revoke active sessions)

## 🔜 v2.0 — Mobile

> Tengen in your pocket.

- [ ] React Native mobile app (Android APK first)
- [ ] Connects to your self-hosted Tengen instance
- [ ] Biometric unlock on mobile
- [ ] Autofill support (Android)
- [ ] iOS support (v2.1)

## 💭 Future / Considering

> Ideas being explored. No promises yet.

- [ ] Browser extension (Chrome + Firefox)
- [ ] Multi-user support with separate encrypted vaults
- [ ] Shared vault entries (for families/small teams)
- [ ] Emergency access (trusted contact can request access after a timeout)
- [ ] CLI tool (`tengen get gmail`, `tengen add`, etc.)
- [ ] Encrypted file attachments per entry
- [ ] Self-hosted sync between multiple devices
- [ ] Third-party security audit (codebase review by Cure53 or similar)
