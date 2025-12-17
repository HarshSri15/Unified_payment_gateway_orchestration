// src/api/index.js
import axios from "axios";
import { toast } from "react-hot-toast";

// ---------------------------------------------
// BASE URL (auto-loads from Vite env)
// ---------------------------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL + "/api",
  withCredentials: true,
});

// ---------------------------------------------
// REQUEST INTERCEPTOR (attach token)
// ---------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------
// RESPONSE INTERCEPTOR (error handling)
// ---------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "Something went wrong.";

    if (error.response) {
      message =
        error.response.data?.message ||
        error.response.data?.error ||
        error.response.statusText ||
        "Server error";
    } else if (error.request) {
      message = "No response from server. Check your network.";
    }

    toast.error(message);

    return Promise.reject(error);
  }
);

export default api;
