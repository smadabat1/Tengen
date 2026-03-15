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

## 🔜 v1.1 — Polish & Import

> Making it easier to switch to Tengen and day-to-day use smoother.

- [ ] Import from CSV
- [ ] Import from Bitwarden export
- [ ] Import from 1Password export
- [x] Encrypted vault backup / export
- [x] Favicon fetching for entry URLs
- [x] Duplicate password warnings on entry cards
- [x] Password age warnings (flag entries older than 90 days)
- [x] Vault search improvements (search by username, notes)

## 🔜 v1.2 — Security Hardening

> Going deeper on the security layer.

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

