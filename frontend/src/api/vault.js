import { apiClient } from './client'

export const vaultApi = {
  listEntries: (params = {}) =>
    apiClient.get('/vault/entries', { params }).then((r) => r.data),

  createEntry: (data) =>
    apiClient.post('/vault/entries', data).then((r) => r.data),

  getEntry: (id) =>
    apiClient.get(`/vault/entries/${id}`).then((r) => r.data),

  updateEntry: (id, data) =>
    apiClient.put(`/vault/entries/${id}`, data).then((r) => r.data),

  deleteEntry: (id) =>
    apiClient.delete(`/vault/entries/${id}`).then((r) => r.data),

  listTags: () =>
    apiClient.get('/vault/tags').then((r) => r.data),

  exportVault: () =>
    apiClient.get('/vault/export').then((r) => r.data),

  exportBitwarden: () =>
    apiClient.get('/vault/export/bitwarden').then((r) => r.data),

  importVault: (payload) =>
    apiClient.post('/vault/import', payload).then((r) => r.data),

  getAuditLog: () =>
    apiClient.get('/vault/audit-log').then((r) => r.data),

  importExternal: (format, data) =>
    apiClient.post('/vault/import/external', { format, data }).then((r) => r.data),

  listNotes: (params = {}) =>
    apiClient.get('/vault/notes', { params }).then((r) => r.data),

  createNote: (data) =>
    apiClient.post('/vault/notes', data).then((r) => r.data),

  getNote: (id) =>
    apiClient.get(`/vault/notes/${id}`).then((r) => r.data),

  updateNote: (id, data) =>
    apiClient.put(`/vault/notes/${id}`, data).then((r) => r.data),

  deleteNote: (id) =>
    apiClient.delete(`/vault/notes/${id}`).then((r) => r.data),

  lockNote: (id, secret) =>
    apiClient.post(`/vault/notes/${id}/lock`, { secret }).then((r) => r.data),

  unlockNote: (id, secret) =>
    apiClient.post(`/vault/notes/${id}/unlock`, { secret }).then((r) => r.data),

  removeNoteLock: (id) =>
    apiClient.delete(`/vault/notes/${id}/lock`).then((r) => r.data),

  listNoteFolders: () =>
    apiClient.get('/vault/note-folders').then((r) => r.data),

  createNoteFolder: (name) =>
    apiClient.post('/vault/note-folders', { name }).then((r) => r.data),

  updateNoteFolder: (id, name) =>
    apiClient.put(`/vault/note-folders/${id}`, { name }).then((r) => r.data),

  deleteNoteFolder: (id) =>
    apiClient.delete(`/vault/note-folders/${id}`).then((r) => r.data),

  listNoteTags: () =>
    apiClient.get('/vault/note-tags').then((r) => r.data),
}
