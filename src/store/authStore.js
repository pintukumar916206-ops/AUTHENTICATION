import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../services/api";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,

      setToken: (token) => set({ token }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const data = await api.post("/api/auth/login", { email, password });
          set({ user: data.user, token: data.token, isLoading: false });
          return data;
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const data = await api.post("/api/auth/register", { name, email, password });
          set({ user: data.user, token: data.token, isLoading: false });
          return data;
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try { await api.post("/api/auth/logout", {}); } catch {}
        set({ user: null, token: null });
      },

      fetchMe: async () => {
        const { token } = get();
        if (!token) {
          set({ isInitialized: true });
          return;
        }
        try {
          const user = await api.get("/api/auth/me");
          set({ user, isInitialized: true });
        } catch {
          set({ user: null, token: null, isInitialized: true });
        }
      },
    }),
    {
      name: "authentiscan-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

export default useAuthStore;
