// frontend/src/utils/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Auth APIs
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  getProfile: () => api.get("/users/profile"),
};

// ✅ User APIs
export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data) => api.put("/users/profile", data),
  setPreferences: (data) => api.put("/users/preferences", data),
};

// ✅ Match APIs
export const matchAPI = {
  getMatches: (filters) =>
    api.get("/matches", {
      params: { ...filters, gender: filters.genderPreference },
    }),
};

// ✅ Feed APIs
export const feedAPI = {
  getFeed: () => api.get("/feed"),
  postFeed: (data) => api.post("/feed", data),
};

// ✅ Partner APIs
export const partnerAPI = {
  setGoal: (data) => api.post("/partners/goals", data),
  checkIn: (data) => api.post("/partners/checkins", data),
};

// ✅ Chat APIs
export const chatAPI = {
  getContacts: () => api.get("/chat/contacts"), // ✅ FIXED
  getMessages: (partnerId) => api.get(`/chat/${partnerId}`),
  sendMessage: (partnerId, data) => api.post(`/chat/${partnerId}`, data),
};

// ✅ Leaderboard APIs
export const leaderboardAPI = {
  getLeaderboard: () => api.get("/leaderboard"),
};

export default api;
