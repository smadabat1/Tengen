import { create } from 'zustand'

const TOKEN_KEY = 'tengen_token'
const USERNAME_KEY = 'tengen_username'

export const useAuthStore = create((set) => ({
  token: sessionStorage.getItem(TOKEN_KEY) || null,
  username: sessionStorage.getItem(USERNAME_KEY) || null,
  isAuthenticated: !!sessionStorage.getItem(TOKEN_KEY),
  lastActivity: Date.now(),

  setAuth: (token, username) => {
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(USERNAME_KEY, username)
    set({ token, username, isAuthenticated: true, lastActivity: Date.now() })
  },

  logout: () => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USERNAME_KEY)
    set({ token: null, username: null, isAuthenticated: false })
  },

  updateActivity: () => {
    set({ lastActivity: Date.now() })
  },
}))
