import axiosClient from "./axiosClient";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const login = async (username, password) => {
  const { data } = await axiosClient.post("/auth/login/", { username, password });
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  return data;
};

export const register = async ({ username, password, email, first_name, last_name }) => {
  const { data } = await axios.post(`${BASE_URL}/auth/register/`, {
    username,
    password,
    email,
    first_name,
    last_name,
  });
  return data;
};

export const logout = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};

export const isAuthenticated = () => !!localStorage.getItem("access_token");
