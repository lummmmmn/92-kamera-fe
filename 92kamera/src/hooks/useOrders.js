import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrders, createOrder, updateOrder, updateOrderStatus,
  deleteOrder, markOrderSeen,
} from "../api/index.js";
import { ORDERS_INIT } from "../lib/constants.js";

export const ORDERS_QK = ["orders"];

// ── READ ──
export function useOrders(options = {}) {
  return useQuery({
    queryKey: ORDERS_QK,
    queryFn:  getOrders,
    staleTime: 0,           // orders luôn fresh
    gcTime: 2 * 60 * 1000,
    placeholderData: ORDERS_INIT,
    select: (data) => (Array.isArray(data) ? data : ORDERS_INIT),
    ...options,
  });
}

// ── CREATE ──
export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ORDERS_QK }),
  });
}

// ── UPDATE ──
export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateOrder(id, data),
    onSuccess: (updatedOrder, variables) => {
      qc.setQueryData(ORDERS_QK, (old) =>
        (old ?? []).map((o) => o.id === variables.id ? { ...o, ...updatedOrder } : o)
      );
      qc.invalidateQueries({ queryKey: ORDERS_QK });
    },
  });
}

// ── UPDATE STATUS ──
export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, adminNote }) =>
      updateOrderStatus(id, { status, adminNote }),
    onSuccess: (updatedOrder, variables) => {
      qc.setQueryData(ORDERS_QK, (old) =>
        (old ?? []).map((o) => o.id === variables.id ? { ...o, ...updatedOrder } : o)
      );
      qc.invalidateQueries({ queryKey: ORDERS_QK });
    },
  });
}

// ── DELETE ──
export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteOrder,
    onSuccess: (deletedOrder, deletedId) => {
      qc.setQueryData(ORDERS_QK, (old) =>
        (old ?? []).filter((o) => o.id !== deletedId)
      );
      qc.invalidateQueries({ queryKey: ORDERS_QK });
    },
  });
}

// ── MARK SEEN ──
export function useMarkOrderSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markOrderSeen,
    onMutate: async (orderId) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ORDERS_QK });
      const prev = qc.getQueryData(ORDERS_QK);
      qc.setQueryData(ORDERS_QK, (old) =>
        (old ?? []).map((o) => o.id === orderId ? { ...o, seen: true } : o)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ORDERS_QK, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ORDERS_QK }),
  });
}
