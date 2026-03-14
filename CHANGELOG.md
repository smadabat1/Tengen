# Changelog

All notable changes to Tengen will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

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
