import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminLogin, adminLogout } from "../api/index.js";
import { setAuthToken, clearAuthToken } from "../lib/axios.js";

const AUTH_KEY = ["admin_auth"];

export function useAdminAuth() {
  const queryClient = useQueryClient();

  const { data: isAuthenticated } = useQuery({
    queryKey: AUTH_KEY,
    queryFn: () => {
      const token = localStorage.getItem("admin_token");
      if (token) {
        setAuthToken(token);
        return true;
      }
      return false;
    },
    staleTime: Infinity, // Trạng thái auth chỉ thay đổi qua mutation
    initialData: () => {
      const token = localStorage.getItem("admin_token");
      if (token) {
        setAuthToken(token);
        return true;
      }
      return false;
    },
  });

  const loginMutation = useMutation({
    mutationFn: adminLogin,
    onSuccess: (data) => {
      // Giả sử BE trả về { token: "..." }
      const token = data?.token;
      if (token) {
        localStorage.setItem("admin_token", token);
        setAuthToken(token);
        queryClient.setQueryData(AUTH_KEY, true);
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: adminLogout,
    onSuccess: () => {
      localStorage.removeItem("admin_token");
      clearAuthToken();
      queryClient.setQueryData(AUTH_KEY, false);
      queryClient.clear(); // Clear all cache khi logout để bảo mật
    },
    onError: () => {
      // Vẫn logout ở client kể cả khi API call lỗi
      localStorage.removeItem("admin_token");
      clearAuthToken();
      queryClient.setQueryData(AUTH_KEY, false);
      queryClient.clear();
    },
  });

  return {
    isAuthenticated: !!isAuthenticated,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    logout: logoutMutation.mutate,
    logoutAsync: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
}
