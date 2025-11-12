import { create } from 'zustand'
export const useAuth = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  signOut: () => set({ user: null })
}))
