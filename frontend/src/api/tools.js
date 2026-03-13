import { apiClient } from './client'

export const toolsApi = {
  generatePassword: (options) =>
    apiClient.post('/tools/generate', options).then((r) => r.data),

  checkStrength: (password) =>
    apiClient.post('/tools/strength', { password }).then((r) => r.data),

  hibpCheck: (entryId) =>
    apiClient.post('/tools/hibp', { entry_id: entryId }).then((r) => r.data),

  getHealth: () =>
    apiClient.get('/tools/health').then((r) => r.data),

  saveHealthSnapshot: (data) =>
    apiClient.post('/tools/health/snapshot', data).then((r) => r.data),

  getHealthHistory: () =>
    apiClient.get('/tools/health/history').then((r) => r.data),

  saveHibpRun: (data) =>
    apiClient.post('/tools/hibp/runs', data).then((r) => r.data),

  getHibpRuns: () =>
    apiClient.get('/tools/hibp/runs').then((r) => r.data),
}
