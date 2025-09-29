// frontend/src/utils/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "https://aktiv-backend.onrender.com/api",
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
  getUnreadCount: () => api.get("/chat/unread-count"),
  searchConversations: (query) => api.get("/chat/search", { params: { q: query } }),
};

// ✅ Upload APIs
export const uploadAPI = {
  uploadMedia: (formData) => api.post("/upload/media", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getUploadInfo: () => api.get("/upload/info"),
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
  updateGroupSettings: (groupId, data) => api.put(`/groups/${groupId}/settings`, data),
  updateUserSettings: (groupId, data) => api.put(`/groups/${groupId}/user-settings`, data),
  getGroupMessages: (groupId, params) => api.get(`/groups/${groupId}/messages`, { params }),
};

// ✅ Leaderboard APIs
export const leaderboardAPI = {
  getLeaderboard: (params) => api.get("/leaderboard", { params }),
  getRankHistory: (userId, params) => api.get(`/leaderboard/rank-history/${userId}`, { params }),
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

// ✅ Posts APIs
export const postsAPI = {
  getPosts: (params) => api.get("/posts", { params }),
  getPost: (id) => api.get(`/posts/${id}`),
  createPost: (data) => api.post("/posts", data),
  deletePost: (id) => api.delete(`/posts/${id}`),
  likePost: (id) => api.put(`/posts/${id}/like`),
  commentPost: (id, data) => api.post(`/posts/${id}/comment`, data),
  sharePost: (id, data) => api.put(`/posts/${id}/share`, data),
  congratulatePost: (id) => api.put(`/posts/${id}/congratulate`),
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
  getSentPartners: (params) => api.get("/partners", { params: { ...params, status: 'sent' } }),
  
  // Count endpoint
  getPartnerCounts: () => api.get("/partners/count"),
};

// ✅ AI Coach APIs
export const aiCoachAPI = {
  chat: (data) => api.post("/ai-coach/chat", data),
  getSuggestions: () => api.get("/ai-coach/suggestions"),
};

export default api;
