import { QueryClient } from "@tanstack/react-query";

/**
 * Global QueryClient — cấu hình chuẩn enterprise:
 * - staleTime: 5 phút cho catalog (cameras, site, accessories...)
 * - gcTime: 10 phút (keep inactive queries in memory)
 * - retry: 2 lần trước khi báo lỗi
 * - refetchOnWindowFocus: false (tránh spam request khi alt-tab về)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 phút
      gcTime:    10 * 60 * 1000,  // 10 phút
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
