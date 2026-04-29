import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export function useReports(filters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );

  return useQuery({
    queryKey: ["reports", filters],
    queryFn: () => api.get(`/api/reports?${params}`),
    keepPreviousData: true,
  });
}

export function useReport(id) {
  return useQuery({
    queryKey: ["report", id],
    queryFn: () => api.get(`/api/reports/${id}`),
    enabled: Boolean(id),
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ["userStats"],
    queryFn: () => api.get("/api/reports/stats"),
  });
}

export function usePinReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/api/reports/${id}/pin`, {}),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["reports"] });
      const previous = queryClient.getQueriesData({ queryKey: ["reports"] });
      queryClient.setQueriesData({ queryKey: ["reports"] }, (old) => {
        if (!old?.reports) return old;
        return {
          ...old,
          reports: old.reports.map((r) =>
            r._id?.toString() === id ? { ...r, pinned: !r.pinned } : r
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        ctx.previous.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useFavoriteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/api/reports/${id}/favorite`, {}),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/reports/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useShareReport() {
  return useMutation({
    mutationFn: (id) => api.post(`/api/reports/${id}/share`, {}),
  });
}
