/**
 * TanStack Query hooks — catalog data (cameras, accessories, site, etc.)
 * Gọi BE API qua api/index.js
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCameras, updateCamera, createCamera, deleteCamera,
  getAccessories, updateAccessory, createAccessory, deleteAccessory,
  getSiteContent, updateSiteContent,
  getFeedbacks, createFeedback, updateFeedback, deleteFeedback,
  getAlbums, createAlbum, updateAlbum, deleteAlbum,
  getPhotos, deletePhoto,
  getDeliveryFees, updateDeliveryFees,
  getDiscounts, createDiscount, updateDiscount, deleteDiscount,
  getStaticCatalog,
} from "../api/index.js";

import { CAMS_INIT, ACC_INIT, SITE_INIT, DELIVERY_AREAS_DEFAULT } from "../lib/constants.js";

// ── STALE TIME ──
const CATALOG_STALE = 5 * 60 * 1000; // 5 phút

// ─────────────────────────────────────────────
// 📷 CAMERAS
// ─────────────────────────────────────────────
export function useCameras() {
  return useQuery({
    queryKey: ["cameras"],
    queryFn:  getCameras,
    staleTime: CATALOG_STALE,
    placeholderData: CAMS_INIT,
    select: (data) => data ?? CAMS_INIT,
  });
}

export function useUpdateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateCamera(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cameras"] }),
  });
}

export function useCreateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCamera,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cameras"] }),
  });
}

export function useDeleteCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCamera,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cameras"] }),
  });
}

// ─────────────────────────────────────────────
// 🎒 ACCESSORIES
// ─────────────────────────────────────────────
export function useAccessories() {
  return useQuery({
    queryKey: ["accessories"],
    queryFn:  getAccessories,
    staleTime: CATALOG_STALE,
    placeholderData: ACC_INIT,
    select: (data) =>
      (data ?? ACC_INIT).map((a) => ({
        qty: 1, active: true, priceShift: null, desc: "",
        ...a,
      })),
  });
}

export function useUpdateAccessory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateAccessory(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accessories"] }),
  });
}

export function useCreateAccessory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAccessory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accessories"] }),
  });
}

export function useDeleteAccessory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAccessory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accessories"] }),
  });
}

// ─────────────────────────────────────────────
// 🌐 SITE CONTENT
// ─────────────────────────────────────────────
export function useSiteContent() {
  return useQuery({
    queryKey: ["site"],
    queryFn:  getSiteContent,
    staleTime: CATALOG_STALE,
    placeholderData: SITE_INIT,
    select: (data) => data ?? SITE_INIT,
  });
}

export function useUpdateSiteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSiteContent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site"] }),
  });
}

// ─────────────────────────────────────────────
// 🚗 DELIVERY FEES
// ─────────────────────────────────────────────
export function useDeliveryFees() {
  return useQuery({
    queryKey: ["deliveryFees"],
    queryFn:  getDeliveryFees,
    staleTime: CATALOG_STALE,
    placeholderData: DELIVERY_AREAS_DEFAULT,
    select: (data) =>
      data?.length > 0 ? data : DELIVERY_AREAS_DEFAULT,
  });
}

export function useUpdateDeliveryFees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateDeliveryFees,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliveryFees"] }),
  });
}

// ─────────────────────────────────────────────
// ⭐ FEEDBACKS
// ─────────────────────────────────────────────
export function useFeedbacks() {
  return useQuery({
    queryKey: ["feedbacks"],
    queryFn:  getFeedbacks,
    staleTime: CATALOG_STALE,
    placeholderData: [],
    select: (data) => data ?? [],
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFeedback,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedbacks"] }),
  });
}

export function useUpdateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateFeedback(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedbacks"] }),
  });
}

export function useDeleteFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFeedback,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedbacks"] }),
  });
}

// ─────────────────────────────────────────────
// 🖼️ ALBUMS
// ─────────────────────────────────────────────
export function useAlbums() {
  return useQuery({
    queryKey: ["albums"],
    queryFn:  getAlbums,
    staleTime: CATALOG_STALE,
    placeholderData: [],
    select: (data) => data ?? [],
  });
}

export function useCreateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAlbum,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["albums"] }),
  });
}

export function useUpdateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateAlbum(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["albums"] }),
  });
}

export function useDeleteAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAlbum,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["albums"] }),
  });
}

// ─────────────────────────────────────────────
// 📷 PHOTOS
// ─────────────────────────────────────────────
export function usePhotos() {
  return useQuery({
    queryKey: ["photos"],
    queryFn:  getPhotos,
    staleTime: CATALOG_STALE,
    placeholderData: [],
    select: (data) => (data?.photos || data) ?? [],
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePhoto,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos"] }),
  });
}

// ─────────────────────────────────────────────
// 🏷️ DISCOUNTS
// ─────────────────────────────────────────────
export function useDiscounts() {
  return useQuery({
    queryKey: ["discounts"],
    queryFn:  getDiscounts,
    staleTime: CATALOG_STALE,
    placeholderData: [],
    select: (data) => data ?? [],
  });
}

export function useCreateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDiscount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useUpdateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateDiscount(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useDeleteDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDiscount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

// ─────────────────────────────────────────────
// 👥 USERS
// ─────────────────────────────────────────────
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => import("../api/index.js").then((m) => m.getUsers()),
    staleTime: 5 * 60 * 1000,
    placeholderData: {},
    select: (data) => data ?? {},
  });
}

export function useUpsertUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => import("../api/index.js").then((m) => m.upsertUser(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

