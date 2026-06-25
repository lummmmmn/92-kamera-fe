import React from "react";
import AdminLogin from "../components/admin/AdminLogin.jsx";
import AdminDashboard from "../components/admin/AdminDashboard.jsx";
import { useAdminAuth } from "../hooks/useAdminAuth.js";
import { useOrders } from "../hooks/useOrders.js";
import { useSiteContent, useUsers, useUpsertUser } from "../hooks/useAppData.js";

export default function AdminPage({
  onBack,
  isMobile,
  loggedUser,
  setLoggedUser,
  setPage,
}) {
  const { isAuthenticated, loginAsync, logout } = useAdminAuth();

  // Load necessary data for AdminLogin
  const { data: orders = [] } = useOrders();
  const { data: siteContent } = useSiteContent();
  const { data: usersMap = {} } = useUsers();
  const upsertUserMutation = useUpsertUser();

  const handleSetUsersMap = (updater) => {
    const nextUsers = typeof updater === "function" ? updater(usersMap) : updater;
    upsertUserMutation.mutate(nextUsers);
  };

  const handleAdminLogout = async () => {
    await logout();
    if (setLoggedUser) setLoggedUser(null); // Clear admin session từ header
    onBack();
  };

  if (isAuthenticated) {
    return (
      <AdminDashboard
        onBack={handleAdminLogout}
        isMobile={isMobile}
      />
    );
  }

  return (
    <AdminLogin
      onLogin={(token) => {
        const adminToken = token || localStorage.getItem("admin_token");
        if (setLoggedUser) setLoggedUser({ name: "Admin", role: "admin", token: adminToken });
        // isAuthenticated update handled by useAdminAuth hook
      }}
      onBack={onBack}
      orders={orders}
      loggedUser={loggedUser}
      setLoggedUser={setLoggedUser}
      setPage={setPage}
      usersMap={usersMap}
      setUsersMap={handleSetUsersMap}
      siteContent={siteContent}
      setOrders={() => {}} // No-op, synced via React Query
    />
  );
}
