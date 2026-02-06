import axiosInstance from "./axiosInstance";

// Signup
export const signup = (data) =>
  axiosInstance.post("/auth/register", data);

// Login
export const login = (data) =>
  axiosInstance.post("/auth/login", data);

// Get profile
export const getProfile = () =>
  axiosInstance.get("/auth/profile");
