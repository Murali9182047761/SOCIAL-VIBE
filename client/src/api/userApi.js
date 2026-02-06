import axiosInstance from "./axiosInstance";

export const getProfile = () =>
  axiosInstance.get("/user/profile");

export const updateProfile = (data) =>
  axiosInstance.put("/user/profile", data);
