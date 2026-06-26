/**
 * API service layer — tất cả requests đi qua đây
 *
 * ⚠️  STUB MODE: Các hàm hiện trả về mock data hoặc throw placeholder error.
 *     Khi BE sẵn sàng, chỉ cần uncomment dòng axios call và xoá mock.
 *
 * Naming convention:
 *   GET    → get<Resource>    (e.g. getCameras)
 *   POST   → create<Resource> (e.g. createOrder)
 *   PUT    → update<Resource> (e.g. updateCamera)
 *   DELETE → delete<Resource> (e.g. deleteOrder)
 */

import api from "../lib/axios.js";
import { CAMS_INIT, ACC_INIT, SITE_INIT, ORDERS_INIT, DELIVERY_AREAS_DEFAULT } from "../lib/constants.js";

const pathId = (id) => encodeURIComponent(String(id));

// ─────────────────────────────────────────────
// 📷 CAMERAS
// ─────────────────────────────────────────────
export const getCameras = () =>
  api.get("/cameras").then((r) => r.data);

export const updateCamera = (id, data) =>
  api.put(`/cameras/${pathId(id)}`, data).then((r) => r.data);

export const createCamera = (data) =>
  api.post("/cameras", data).then((r) => r.data);

export const deleteCamera = (id) =>
  api.delete(`/cameras/${pathId(id)}`).then((r) => r.data);

// ─────────────────────────────────────────────
// 🎒 ACCESSORIES
// ─────────────────────────────────────────────
export const getAccessories = () =>
  api.get("/accessories").then((r) => r.data);

export const updateAccessory = (id, data) =>
  api.put(`/accessories/${pathId(id)}`, data).then((r) => r.data);

export const createAccessory = (data) =>
  api.post("/accessories", data).then((r) => r.data);

export const deleteAccessory = (id) =>
  api.delete(`/accessories/${pathId(id)}`).then((r) => r.data);

// ─────────────────────────────────────────────
// 📋 ORDERS
// ─────────────────────────────────────────────
export const getOrders = () =>
  api.get("/orders").then((r) => r.data);

export const getOrderById = (id) =>
  api.get(`/orders/${pathId(id)}`).then((r) => r.data);

export const createOrder = (data) =>
  api.post("/orders", data).then((r) => r.data);

export const updateOrder = (id, data) =>
  api.put(`/orders/${pathId(id)}`, data).then((r) => r.data);

export const updateOrderStatus = (id, data) =>
  api.patch(`/orders/${pathId(id)}/status`, data).then((r) => r.data);

export const deleteOrder = (id) =>
  api.delete(`/orders/${pathId(id)}`).then((r) => r.data);

export const markOrderSeen = (id) =>
  api.patch(`/orders/${pathId(id)}/seen`).then((r) => r.data);

// ─────────────────────────────────────────────
// 🌐 SITE CONTENT
// ─────────────────────────────────────────────
export const getSiteContent = () =>
  api.get("/site").then((r) => r.data);

export const updateSiteContent = (data) =>
  api.put("/site", data).then((r) => r.data);

// ─────────────────────────────────────────────
// 🏷️ DISCOUNTS
// ─────────────────────────────────────────────
export const getDiscounts = () =>
  api.get("/discounts").then((r) => r.data);

export const createDiscount = (data) =>
  api.post("/discounts", data).then((r) => r.data);

export const updateDiscount = (id, data) =>
  api.put(`/discounts/${pathId(id)}`, data).then((r) => r.data);

export const deleteDiscount = (id) =>
  api.delete(`/discounts/${pathId(id)}`).then((r) => r.data);

export const applyDiscount = (code, orderTotal) =>
  api.post("/discounts/apply", { code, orderTotal }).then((r) => r.data);

// ─────────────────────────────────────────────
// ⭐ FEEDBACKS
// ─────────────────────────────────────────────
export const getFeedbacks = () =>
  api.get("/feedbacks").then((r) => r.data);

export const createFeedback = (data) =>
  api.post("/feedbacks", data).then((r) => r.data);

export const updateFeedback = (id, data) =>
  api.put(`/feedbacks/${pathId(id)}`, data).then((r) => r.data);

export const deleteFeedback = (id) =>
  api.delete(`/feedbacks/${pathId(id)}`).then((r) => r.data);

// ─────────────────────────────────────────────
// 🖼️ GALLERY / PHOTOS / ALBUMS
// ─────────────────────────────────────────────
export const getPhotos = () =>
  api.get("/photos").then((r) => r.data);

export const deletePhoto = (id) =>
  api.delete(`/photos/${pathId(id)}`).then((r) => r.data);

export const getAlbums = () =>
  api.get("/albums").then((r) => r.data);

export const createAlbum = (data) =>
  api.post("/albums", data).then((r) => r.data);

export const updateAlbum = (id, data) =>
  api.put(`/albums/${pathId(id)}`, data).then((r) => r.data);

export const deleteAlbum = (id) =>
  api.delete(`/albums/${pathId(id)}`).then((r) => r.data);

// Upload: multipart/form-data — BE xử lý Cloudinary
export const uploadPhoto = (formData) =>
  api.post("/photos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);

export const uploadCameraImage = (id, formData) =>
  api.post(`/cameras/${pathId(id)}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);

// ─────────────────────────────────────────────
// 🚗 DELIVERY FEES
// ─────────────────────────────────────────────
export const getDeliveryFees = () =>
  api.get("/delivery-fees").then((r) => r.data);

export const updateDeliveryFees = (data) =>
  api.put("/delivery-fees", data).then((r) => r.data);

// ─────────────────────────────────────────────
// 👤 AUTH (Admin)
// ─────────────────────────────────────────────
export const adminLogin = (credentials) =>
  api.post("/auth/login", credentials).then((r) => r.data);

export const adminLogout = () =>
  api.post("/auth/logout").then((r) => r.data);

export const googleLogin = (credential) =>
  api.post("/auth/google", { credential }).then((r) => r.data);

// ─────────────────────────────────────────────
// 👥 USERS (Customer accounts)
// ─────────────────────────────────────────────
export const getUsers = () =>
  api.get("/users").then((r) => r.data);

export const getUserByGoogleId = (googleId) =>
  api.get(`/users/google/${pathId(googleId)}`).then((r) => r.data);

export const upsertUser = (data) =>
  api.post("/users/upsert", data).then((r) => r.data);

// ─────────────────────────────────────────────
// 📊 STATIC CATALOG (data.json CDN — 0 server cost)
// ─────────────────────────────────────────────
export const getStaticCatalog = () =>
  api.get("/catalog").then((r) => r.data);
