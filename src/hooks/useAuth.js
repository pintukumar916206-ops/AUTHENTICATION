import useAuthStore from "../store/authStore";

export function useAuth() {
  const { user, token, isLoading, isInitialized, login, register, logout, fetchMe } = useAuthStore();
  return {
    user,
    token,
    isLoading,
    isInitialized,
    isAuthenticated: Boolean(token) && Boolean(user),
    isAdmin: user?.role === "admin",
    login,
    register,
    logout,
    fetchMe,
  };
}
