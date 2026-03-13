import { apiClient } from './client'

export const authApi = {
  register: (username, masterPassword) =>
    apiClient.post('/auth/register', {
      username,
      master_password: masterPassword,
    }).then((r) => r.data),

  login: (username, masterPassword) =>
    apiClient.post('/auth/login', {
      username,
      master_password: masterPassword,
    }).then((r) => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then((r) => r.data),
}
