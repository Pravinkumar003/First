import { create } from 'zustand'

const STORAGE_KEY = 'admin-auth'
const loadUser = () => {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to read auth storage', error)
    return null
  }
}

export const useAuth = create((set) => ({
  user: loadUser(),
  setUser: (user) => {
    set({ user })
    if (user) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      } catch (error) {
        console.error('Failed to persist auth', error)
      }
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  },
  signOut: () => {
    set({ user: null })
    localStorage.removeItem(STORAGE_KEY)
  }
}))
