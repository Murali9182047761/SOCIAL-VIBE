import axios from "axios";
import { API_URL } from "../config";

const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Automatically attach token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
