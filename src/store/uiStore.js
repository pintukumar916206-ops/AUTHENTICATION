import { create } from "zustand";

let toastId = 0;

const useUIStore = create((set) => ({
  toasts: [],
  modal: null,

  addToast: (message, type = "info", duration = 4000) => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }));
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
    return id;
  },

  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  openModal: (content, options = {}) => set({ modal: { content, ...options } }),

  closeModal: () => set({ modal: null }),
}));

export default useUIStore;
