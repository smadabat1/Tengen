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
}
