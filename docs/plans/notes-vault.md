# Tengen v1.2 — Private Vault

> Context document for the Private Vault feature set.  
> Tengen is a self-hostable password manager (web app). This release adds a privacy-first secure notes section, sitting alongside the existing password vault. Users already trust Tengen with their most sensitive credentials — notes is a natural extension of that trust.

---

## Why we're building this

A user's digital life isn't just passwords. There's sensitive information that doesn't fit neatly into a credential — recovery codes, private thoughts, confidential work notes, personal records. Right now users are storing these in random note apps that have zero encryption. We can do better, and since the encryption infrastructure already exists in Tengen, the lift is small.

Reference inspiration: [FolderNote on Play Store](https://play.google.com/store/apps/details?id=notepad.note.notas.notes.notizen.folder) — a notes app with folder organisation and per-note locking. We want to bring that experience into Tengen, but with proper end-to-end encryption baked in from day one.

---

## Feature breakdown

### 1. Encrypted notes

**What it is**  
A private notes section inside the vault. Every note is encrypted before it leaves the client — the server never sees plaintext content.

**Key decisions**  
- Uses the same AES-256 encryption layer already in place for passwords. No new crypto primitives needed.
- Encryption key is derived from the user's master password, same as the rest of the vault.
- Notes are decrypted in-memory on vault unlock and re-encrypted on save. The server only ever stores ciphertext.

**What a note contains**  
- Title (encrypted)
- Body content (encrypted)
- Folder reference
- Tags
- Created / updated timestamps
- A flag for whether the note has a per-note PIN (see feature 4)

---

### 2. Folder organisation

**What it is**  
Users can create folders to group their notes by topic, project, or any category they choose. Think of it like having separate notebooks — "Work", "Personal", "Finance", "Recovery Codes" etc.

**Key decisions**  
- Folders are a lightweight label on notes, not a nested file system. Keep it flat — no subfolders in v1.2.
- Folder names are also encrypted.
- A note must belong to exactly one folder. A default "General" folder exists for notes without a folder.
- Users can rename and delete folders. Deleting a folder moves its notes to "General" rather than deleting them.
- The sidebar shows folders as a list with note count badges.

**UX behaviour**  
- Clicking a folder filters the note list to that folder.
- "All notes" view available at the top of the sidebar to see everything.

---

### 3. Notion-style block editor

**What it is**  
Instead of a plain textarea or a split markdown editor, notes use a block-based editor inspired by Notion. Users type naturally and use `/` to insert different block types.

**Why this over alternatives**  
- Users don't need a live preview pane for personal notes — that's more of a docs/publishing workflow.
- A toolbar-heavy textarea feels dated.
- Block editor gives a clean, distraction-free writing experience while still supporting structure.

**Supported block types (v1.2)**  
- Paragraph (default)
- Heading (H1, H2, H3)
- Bullet list
- Numbered list
- Checklist / to-do (with tick state saved)
- Divider / horizontal rule
- Code block (monospace, no syntax highlighting in v1.2)
- Quote block

**Library**  
Use **Tiptap** (or **BlockNote** as an alternative — both are React-friendly and well maintained). Tiptap is the more mature choice with a larger ecosystem.

**Behaviour**  
- Typing `/` anywhere in the editor opens a block picker floating menu.
- The editor content is serialised to JSON (Tiptap's format) before encryption and stored that way.
- No image uploads in v1.2 — keeps scope tight and avoids storage complexity.

---

### 4. Per-note locking

**What it is**  
On top of the main vault unlock, individual notes can have an extra layer of protection with their own PIN or password. Even if someone has unlocked your vault, they can't read a locked note without its specific PIN.

**Key decisions**  
- Lock is a PIN or short password set by the user per note.
- The per-note PIN is used to derive an additional encryption key that wraps the note's content key. The note body is double-encrypted in this case.
- The main vault password alone cannot unlock a per-note locked note.
- Locked notes show a lock icon in the note list. The title is visible but the body is not until unlocked.
- PIN is never stored — only the derived key material is.

**UX behaviour**  
- User right-clicks / opens options on a note → "Lock this note" → set PIN flow.
- Viewing a locked note prompts for PIN entry inline (not a full-page modal).
- "Remove lock" available from note options after unlocking.
- Wrong PIN attempt: show error, allow retry. No lockout in v1.2 (can add rate limiting later).

---

### 5. Search, tags & labels

**What it is**  
Users can find notes quickly via full-text search and by filtering on tags. Tags are user-defined labels that can be applied to any note, independent of folder.

**Why client-side search**  
Since notes are decrypted in-memory after vault unlock, search runs entirely on the client. No search queries are ever sent to the server. This is a privacy guarantee — the server has no idea what you're searching for.

**Search behaviour**  
- Search bar at the top of the note list.
- Searches across: note title, note body content, tags, and folder name.
- Results update live as the user types (debounced ~200ms).
- Matched text is highlighted in the results list.
- Search is only available after vault unlock (can't search encrypted data).

**Tags & labels**  
- Tags are short free-text labels, e.g. `#recovery`, `#work`, `#important`.
- A note can have multiple tags.
- Tags are shown as chips below the note title in the list view.
- Clicking a tag in the sidebar or on a note filters the list to that tag.
- Tags are also encrypted before storage.
- No predefined tag colours in v1.2 — all tags same style. Can add colour coding in a later release.

---

## What's explicitly out of scope for v1.2

| Feature | Reason |
|---|---|
| Image / file attachments | Storage complexity, out of scope for notes |
| Subfolders / nested folders | Adds UX complexity, flat folders are sufficient |
| Note sharing | Significant crypto complexity |
| Self-hosted sync | Phase 2 — storage & sync row |
| Biometric unlock (per vault) | WebAuthn can come in v1.3 |
| Access audit log | Nice to have, not blocking |
| Clipboard auto-clear | Can add as a quick follow-up |
| Note version history | Future |
| Decoy vault / duress PIN | Future |

---

## How it fits into the existing Tengen architecture

- **Encryption**: Reuses the existing AES-256 key derivation and encrypt/decrypt utilities. No new crypto work needed.
- **Storage**: Notes stored in the same database as passwords, in a separate `vault_notes` table. All content columns store ciphertext blobs.
- **Auth**: Vault unlock flow is unchanged. Per-note PIN is an additional client-side step, not a server round-trip.
- **API**: New REST endpoints for CRUD on notes, folders, and tags. Follows the same patterns as existing password endpoints.
- **Frontend**: New section in the sidebar — "Notes" alongside "Passwords". Shared layout, new note-specific components.

---

## Release target

**Version**: 1.2  
**Scope**: All 5 features above  
**Priority order for build**: Encrypted notes → Folder org → Editor → Search/tags → Per-note locking