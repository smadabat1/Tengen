# Security Policy

> Tengen has been maintaining barriers for over 1000 years without a single breach. Help us keep it that way.

---

## Supported Versions

| Version | Supported |
|---|---|
| v1.0.x (latest) | ✅ |
| < v1.0 | ❌ |

We only patch the latest release. If you're running an old version, update first before reporting.

---

This project uses automated security scanning via GitHub Actions on every push and pull request to `main`.

## Security Workflows

| Workflow | Tool | What it scans | Status |
|---|---|---|---|
| Secret Scanning | [Gitleaks](https://github.com/gitleaks/gitleaks) | Hardcoded secrets & API keys in git history | ![Gitleaks](https://github.com/smadabat1/Tengen/actions/workflows/gitleaks.yml/badge.svg) |
| Python SAST | [Bandit](https://github.com/PyCQA/bandit) | Security issues in FastAPI/Python code | ![Bandit](https://github.com/smadabat1/Tengen/actions/workflows/bandit.yml/badge.svg) |
| Dependency CVEs | [pip-audit](https://github.com/pypa/pip-audit) | Known CVEs in Python dependencies | ![pip-audit](https://github.com/smadabat1/Tengen/actions/workflows/pipaudit.yml/badge.svg) |
| Full Stack SAST | [Semgrep](https://github.com/semgrep/semgrep) | Security issues in Python, React, Dockerfile, YAML | ![Semgrep](https://github.com/smadabat1/Tengen/actions/workflows/semgrep.yml/badge.svg) |


## What gets checked

**Gitleaks** scans the entire git history for accidentally committed secrets — API keys, passwords, tokens, and other sensitive data.

**Bandit** performs static analysis on the FastAPI backend looking for common Python security issues like weak cryptography, SQL injection patterns, hardcoded credentials, and insecure function usage.

**pip-audit** checks all Python dependencies in `requirements.txt` against the [OSV vulnerability database](https://osv.dev) and fails the build if any known CVEs are found.

**Semgrep** performs full stack static analysis across Python, JavaScript/TypeScript, 
Dockerfiles, and YAML using 300+ community rules. Catches issues like running containers 
as root, insecure JWT usage, XSS patterns, and hardcoded secrets across the entire codebase.

## Viewing Results

- Scan results are available under the **Security** tab → **Code scanning alerts** in this repository (Gitleaks, Bandit, Semgrep)
- Detailed reports are saved as artifacts in each workflow run under the **Actions** tab (Bandit HTML report, pip-audit JSON report)
- pip-audit and Semgrep results are shown inline in the Actions run summary

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

A public issue exposes the vulnerability to everyone before it's fixed — including people with bad intentions. We'd rather fix it quietly and credit you properly.

### How to report

Send an email to **mvspavan001@gmail.com** with the subject line:

```
[SECURITY] Brief description of the vulnerability
```

Include as much detail as you can:
- What the vulnerability is
- Steps to reproduce it
- What an attacker could do with it
- Your environment (OS, Docker version, browser if relevant)

### What happens next

- You'll get an acknowledgement within **48 hours**
- We'll investigate and keep you updated on progress
- Once a fix is ready and deployed, we'll publicly disclose the vulnerability with full credit to you
- We'll add you to the [Hall of Fame](#hall-of-fame) below

We don't have a bug bounty program (we're a solo open source project, not a corporation 😅) but we'll make sure you get proper public credit for responsible disclosure.

---

## Security Model

Here's exactly what Tengen does and doesn't protect against. No marketing fluff.

### What we protect against ✅

- **Database theft** — SQLite file is useless without the master password. All sensitive fields are AES-256-GCM encrypted with a key that's never stored on disk.
- **Weak password storage** — Master passwords are hashed with Argon2id, not stored in plaintext or with weak hashing algorithms.
- **Password breach exposure** — HaveIBeenPwned checks use k-anonymity. Only the first 5 characters of the SHA-1 hash are sent. Your actual password never leaves your machine.
- **XSS data exfiltration** — Content Security Policy headers prevent injected scripts from stealing vault data.
- **Clickjacking** — `X-Frame-Options: DENY` prevents Tengen from being embedded in iframes.
- **Session persistence after logout** — Encryption key is purged from memory on logout. Session tokens are stored in `sessionStorage` only, cleared on tab close.
- **Inactivity exposure** — Vault auto-locks after configurable inactivity timeout.

### What we don't protect against ❌

- **Compromised host machine** — If someone has root access to the machine running Tengen, all bets are off. This is true of every password manager.
- **Weak master password** — We score it and warn you, but we can't stop you. Use a strong master password.
- **Unencrypted traffic without HTTPS** — Tengen ships without TLS. Setting up HTTPS via a reverse proxy (Caddy, Nginx + Let's Encrypt) is your responsibility and is strongly recommended for anything beyond local use.
- **Physical access** — If someone can physically access your machine while your session is active, they can access your vault. Auto-lock helps but isn't a substitute for physical security.
- **Malicious Docker images** — Always pull from the official repository. Don't run random forks you found on the internet.

---

## Encryption Details

For full transparency, here is exactly how encryption works in Tengen.

### Key derivation

```
Master Password + Salt B
        │
        ▼
   Argon2id (time_cost=3, memory=64MB, parallelism=2)
        │
        ▼
   256-bit Encryption Key  ←  never stored, lives in memory only
```

### Authentication

```
Master Password + Salt A
        │
        ▼
   Argon2id hash  ←  stored in DB, used only to verify login
```

Two separate salts. Two separate derivations. The auth hash stored in the DB tells an attacker nothing about the encryption key.

### Vault encryption

```
Plaintext (password / username / notes)
        │
        ▼
   AES-256-GCM  +  unique 96-bit IV per entry
        │
        ▼
   Ciphertext  ←  stored in DB alongside IV
```

Every entry gets a fresh random IV. Reusing IVs in GCM mode is catastrophic — we don't.

### HIBP check

```
Plaintext Password
        │
        ▼
   SHA-1 hash
        │
   ┌────┴─────────────────────────┐
   │ First 5 chars                │ Remaining chars
   │ sent to HIBP API             │ compared locally
   └──────────────────────────────┘
   Full password never leaves your machine.
```

---

## Recommended Hardening

If you're running Tengen beyond localhost, here's what we recommend:

- **Put it behind a reverse proxy with HTTPS** — Caddy makes this trivial with automatic Let's Encrypt certs
- **Restrict access by IP** — if it's just for you, whitelist your IP in the reverse proxy
- **Use a strong, unique master password** — at least 16 characters, ideally a passphrase
- **Back up `./data/tengen.db` regularly** — encrypted, but irreplaceable if lost
- **Keep Docker and the host OS updated** — dependency vulnerabilities are real
- **Don't expose port 8000 directly** — let Nginx/Caddy handle ingress, not Uvicorn

---

## Hall of Fame

*No vulnerabilities reported yet. Be the first — and the last, hopefully.*

| Researcher | Vulnerability | Date |
|---|---|---|
| — | — | — |

---

## Disclosure Policy

We follow **coordinated disclosure**:

1. You report privately
2. We confirm and fix
3. We release the patch
4. We publicly disclose with full credit to you

We ask for a reasonable window (typically **14 days**) to fix and release before public disclosure. If the issue is critical and needs more time, we'll communicate that openly.

---

<div align="center">
  <sub>The barrier holds. Let's keep it that way.</sub>
</div>