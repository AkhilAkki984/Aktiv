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
  // Legacy endpoints (for backward compatibility)
  getContacts: () => api.get("/chat/contacts"),
  getMessages: (partnerId) => api.get(`/chat/${partnerId}`),
  sendMessage: (partnerId, data) => api.post(`/chat/${partnerId}`, data),
  
  // Enhanced chat endpoints
  getConversations: () => api.get("/chat/conversations"),
  getChatMessages: (chatId, params) => api.get(`/chat/messages/${chatId}`, { params }),
  sendChatMessage: (chatId, data) => api.post(`/chat/messages/${chatId}`, data),
  updateChatSettings: (chatId, data) => api.put(`/chat/settings/${chatId}`, data),
  markAsRead: (chatId, data) => api.put(`/chat/read/${chatId}`, data),
  searchConversations: (query) => api.get("/chat/search", { params: { q: query } }),
};

// ✅ Group APIs
export const groupAPI = {
  createGroup: (data) => api.post("/groups", data),
  getGroups: () => api.get("/groups"),
  getGroup: (groupId) => api.get(`/groups/${groupId}`),
  updateGroup: (groupId, data) => api.put(`/groups/${groupId}`, data),
  addMembers: (groupId, data) => api.post(`/groups/${groupId}/members`, data),
  removeMember: (groupId, memberId) => api.delete(`/groups/${groupId}/members/${memberId}`),
  leaveGroup: (groupId) => api.post(`/groups/${groupId}/leave`),
  getAvailableUsers: () => api.get("/groups/available-users"),
};

// ✅ Leaderboard APIs
export const leaderboardAPI = {
  getLeaderboard: () => api.get("/leaderboard"),
};

// ✅ Dashboard APIs
export const dashboardAPI = {
  getStats: () => api.get("/dashboard/stats"),
};

// ✅ Goals APIs
export const goalsAPI = {
  getGoals: (params) => api.get("/goals", { params }),
  getGoal: (id) => api.get(`/goals/${id}`),
  createGoal: (data) => api.post("/goals", data),
  updateGoal: (id, data) => api.put(`/goals/${id}`, data),
  deleteGoal: (id) => api.delete(`/goals/${id}`),
  checkIn: (id, data) => api.post(`/goals/${id}/checkin`, data),
  getCheckIns: (id) => api.get(`/goals/${id}/checkins`),
  getStats: () => api.get("/goals/stats/overview"),
};

// ✅ Partners APIs
export const partnersAPI = {
  getPartners: (params) => api.get("/partners", { params }),
  getPartner: (id) => api.get(`/partners/${id}`),
  connect: (id, data) => api.post(`/partners/connect/${id}`, data),
  acceptRequest: (connectionId) => api.put(`/partners/accept/${connectionId}`),
  rejectRequest: (connectionId) => api.put(`/partners/reject/${connectionId}`),
  cancelRequest: (connectionId) => api.delete(`/partners/cancel/${connectionId}`),
  getPendingRequests: () => api.get("/partners/pending-requests"),
  getActivePartners: () => api.get("/partners/active-partners"),
  getConnections: (id, type) => api.get(`/partners/connections/${id}`, { params: { type } }),
  
  // New status-based endpoints
  getAvailablePartners: (params) => api.get("/partners", { params: { ...params, status: 'available' } }),
  getPendingPartners: (params) => api.get("/partners", { params: { ...params, status: 'pending' } }),
  getAcceptedPartners: (params) => api.get("/partners", { params: { ...params, status: 'accepted' } }),
  
  // Count endpoint
  getPartnerCounts: () => api.get("/partners/count"),
};

export default api;
