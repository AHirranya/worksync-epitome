// Client/src/api/api.js

import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("worksync_token");

    if (token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url || "");
    const manualLogout = localStorage.getItem("worksync_manual_logout") === "true";

    const isAuthRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/logout") ||
      requestUrl.includes("/auth/me");

    if (status === 401 && !isAuthRequest && !manualLogout) {
      localStorage.removeItem("worksync_user");
      localStorage.removeItem("worksync_token");

      window.dispatchEvent(new Event("worksync-auth-cleared"));

      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/session-expired"
      ) {
        window.location.href = "/session-expired";
      }
    }

    return Promise.reject(error);
  }
);

export default api;