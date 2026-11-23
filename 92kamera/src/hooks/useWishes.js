/**
 * TanStack Query hooks — điều ước trong tất.
 * Public: useWishSocks, useSendWish. Admin: useWishes, useMarkWishRead, useDeleteWish, useUpdateWishSocks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWishSocks, sendWish, getWishes, markWishRead, deleteWish, deleteReadWishes, updateWishSocks,
} from "../api/index.js";

// Trạng thái bật/tắt từng tất. Chưa tải được => data undefined => tất chỉ để trang trí.
export function useWishSocks() {
  return useQuery({/**
 * TanStack Query hooks — điều ước trong tất.
 * Public: useWishSocks, useSendWish. Admin: useWishes, useMarkWishRead, useDeleteWish, useUpdateWishSocks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWishSocks, sendWish, getWishes, markWishRead, deleteWish, deleteReadWishes, updateWishSocks,
} from "../api/index.js";

// Trạng thái bật/tắt từng tất. Chưa tải được => data undefined => tất chỉ để trang trí.
export function useWishSocks() {
  return useQuery({
    queryKey: ["wishSocks"],
    queryFn: getWishSocks,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useSendWish() {
  return useMutation({ mutationFn: sendWish });
}

export function useWishes(options = {}) {
  return useQuery({
    queryKey: ["wishes"],
    queryFn: getWishes,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
    ...options,
  });
}

export function useMarkWishRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read }) => markWishRead(id, read),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishes"] }),
  });
}

export function useDeleteWish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteWish,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishes"] }),
  });
}

export function useDeleteReadWishes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteReadWishes,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishes"] }),
  });
}

export function useUpdateWishSocks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateWishSocks,
    onSuccess: (socks) => qc.setQueryData(["wishSocks"], socks),
  });
}

    queryKey: ["wishSocks"],
    queryFn: getWishSocks,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useSendWish() {
  return useMutation({ mutationFn: sendWish });
}

export function useWishes(options = {}) {
  return useQuery({
    queryKey: ["wishes"],
    queryFn: getWishes,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    ...options,
  });
}

export function useMarkWishRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read }) => markWishRead(id, read),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishes"] }),
  });
}

export function useDeleteWish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteWish,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishes"] }),
  });
}

export function useDeleteReadWishes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteReadWishes,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishes"] }),
  });
}

export function useUpdateWishSocks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateWishSocks,
    onSuccess: (socks) => qc.setQueryData(["wishSocks"], socks),
  });
}
