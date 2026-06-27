/**
 * TanStack Query hooks — catalog data (cameras, accessories, site, etc.)
 * Gọi BE API qua api/index.js
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCameras, getCamerasPage, updateCamera, createCamera, deleteCamera,
  getAccessories, updateAccessory, createAccessory, deleteAccessory,
  getSiteContent, updateSiteContent,
  getFeedbacks, getFeedbacksPage, createFeedback, updateFeedback, deleteFeedback,
  getAlbumsPage, createAlbum, updateAlbum, deleteAlbum,
  getPhotosPage, deletePhoto,
  getDeliveryFees, updateDeliveryFees,
  getDiscounts, createDiscount, updateDiscount, deleteDiscount,
  getStaticCatalog,
} from "../api/index.js";

import { CAMS_INIT, ACC_INIT, SITE_INIT, DELIVERY_AREAS_DEFAULT } from "../lib/constants.js";

// ── STALE TIME ──
const CATALOG_STALE = 5 * 60 * 1000; // 5 phút

const asArray = (data, fallback = []) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.photos)) return data.photos;
  return fallback;
};

// ─────────────────────────────────────────────
// 📷 CAMERAS
// ─────────────────────────────────────────────
export function useCameras(options = {}) {
  const { limit, offset, ...queryOptions } = options;
  const hasPaging = typeof limit === "number" || typeof offset === "number";
  return useQuery({
    queryKey: hasPaging ? ["cameras", { limit, offset }] : ["cameras"],
    queryFn: hasPaging ? () => getCamerasPage({ limit, offset }) : getCameras,
    staleTime: CATALOG_STALE,
    placeholderData: CAMS_INIT,
    select: (data) => asArray(data, CAMS_INIT),
    ...queryOptions,
  });
}

export function useUpdateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateCamera(id, data),
    onSuccess: (updatedCamera, variables) => {
      qc.setQueryData(["cameras"], (old) =>
        (old ?? []).map((c) => c.id === variables.id ? { ...c, ...updatedCamera } : c)
      );
      qc.invalidateQueries({ queryKey: ["cameras"] });
    },
  });
}

export function useCreateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCamera,
    onSuccess: (newCamera) => {
      qc.setQueryData(["cameras"], (old) => [newCamera, ...(old ?? [])]);
      qc.invalidateQueries({ queryKey: ["cameras"] });
    },
  });
}

export function useDeleteCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCamera,
    onSuccess: (deletedCamera, deletedId) => {
      qc.setQueryData(["cameras"], (old) =>
        (old ?? []).filter((c) => c.id !== deletedId)
      );
      qc.invalidateQueries({ queryKey: ["cameras"] });
    },
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
      asArray(data, ACC_INIT).map((a) => ({
        qty: 1, active: true, priceShift: null, desc: "",
        ...a,
      })),
  });
}

export function useUpdateAccessory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateAccessory(id, data),
    onSuccess: (updatedAccessory, variables) => {
      qc.setQueryData(["accessories"], (old) =>
        (old ?? []).map((a) => a.id === variables.id ? { ...a, ...updatedAccessory } : a)
      );
      qc.invalidateQueries({ queryKey: ["accessories"] });
    },
  });
}

export function useCreateAccessory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAccessory,
    onSuccess: (newAccessory) => {
      qc.setQueryData(["accessories"], (old) => [newAccessory, ...(old ?? [])]);
      qc.invalidateQueries({ queryKey: ["accessories"] });
    },
  });
}

export function useDeleteAccessory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAccessory,
    onSuccess: (deletedAccessory, deletedId) => {
      qc.setQueryData(["accessories"], (old) =>
        (old ?? []).filter((a) => a.id !== deletedId)
      );
      qc.invalidateQueries({ queryKey: ["accessories"] });
    },
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
export function useFeedbacks(options = {}) {
  const { limit, offset, ...queryOptions } = options;
  const hasPaging = typeof limit === "number" || typeof offset === "number";
  return useQuery({
    queryKey: hasPaging ? ["feedbacks", { limit, offset }] : ["feedbacks"],
    queryFn: hasPaging ? () => getFeedbacksPage({ limit, offset }) : getFeedbacks,
    staleTime: CATALOG_STALE,
    placeholderData: [],
    select: (data) => asArray(data, []),
    ...queryOptions,
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
export function useAlbums(options = {}) {
  const { limit = 20, offset = 0, ...queryOptions } = options;
  return useQuery({
    queryKey: ["albums", { limit, offset }],
    queryFn:  () => getAlbumsPage({ limit, offset }),
    staleTime: CATALOG_STALE,
    placeholderData: [],
    select: (data) => data?.items ?? data ?? [],
    ...queryOptions,
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
export function usePhotos(options = {}) {
  const { limit = 24, offset = 0, ...queryOptions } = options;
  return useQuery({
    queryKey: ["photos", { limit, offset }],
    queryFn:  () => getPhotosPage({ limit, offset }),
    staleTime: CATALOG_STALE,
    placeholderData: [],
    select: (data) => (data?.photos || data?.items || data) ?? [],
    ...queryOptions,
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
    select: (data) => asArray(data, []),
  });
}

export function useCreateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDiscount,
    onSuccess: (newDiscount) => {
      qc.setQueryData(["discounts"], (old) => [newDiscount, ...(old ?? [])]);
      qc.invalidateQueries({ queryKey: ["discounts"] });
    },
  });
}

export function useUpdateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateDiscount(id, data),
    onSuccess: (updatedDiscount, variables) => {
      qc.setQueryData(["discounts"], (old) =>
        (old ?? []).map((d) => d.id === variables.id ? { ...d, ...updatedDiscount } : d)
      );
      qc.invalidateQueries({ queryKey: ["discounts"] });
    },
  });
}

export function useDeleteDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDiscount,
    onSuccess: (deletedDiscount, deletedId) => {
      qc.setQueryData(["discounts"], (old) =>
        (old ?? []).filter((d) => d.id !== deletedId)
      );
      qc.invalidateQueries({ queryKey: ["discounts"] });
    },
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

