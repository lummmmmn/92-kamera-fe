import { QueryClient } from "@tanstack/react-query";

/**
 * Global QueryClient — cấu hình chuẩn enterprise:
 * - staleTime: 5 phút cho catalog (cameras, site, accessories...)
 * - gcTime: 10 phút (keep inactive queries in memory)
 * - retry: 0 để API chậm/timeout không kéo màn chờ lên 60-90 giây
 * - refetchOnWindowFocus: false (tránh spam request khi alt-tab về)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 phút
      gcTime:    10 * 60 * 1000,  // 10 phút
      retry: 0,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
