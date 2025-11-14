import { create } from 'zustand'

export const useUiStore = create((set) => ({
  pendingRequests: 0,
  startRequest: () => set((state) => ({ pendingRequests: state.pendingRequests + 1 })),
  finishRequest: () => set((state) => ({ pendingRequests: Math.max(0, state.pendingRequests - 1) }))
}))

export const trackPromise = async (promise) => {
  const { startRequest, finishRequest } = useUiStore.getState()
  startRequest()
  try {
    return await promise
  } finally {
    finishRequest()
  }
}
