import { create } from "zustand";

/**
 * useScrutinyStore - Global state management for analysis results
 * Manages analysis state, loading, errors, and UI feedback
 * @returns {Object} Store state and actions
 */
const useScrutinyStore = create((set) => ({
  result: null,
  loading: false,
  error: null,
  copied: false,
  logs: [],
  history: [],

  setResult: (result) => set({ result }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setCopied: (copied) => set({ copied }),
  
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  clearLogs: () => set({ logs: [] }),
  
  setHistory: (history) => set({ history }),
  
  reset: () => set({ 
    result: null, 
    loading: false, 
    error: null, 
    copied: false,
    logs: []
  }),
}));

export default useScrutinyStore;

