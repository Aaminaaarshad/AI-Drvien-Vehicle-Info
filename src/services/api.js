import axios from "axios";

const API_BASE = "https://ai-drvien-vehicle-info-backend-production.up.railway.app/api";

export const analyseTyre = (formData) => {
  return axios.post(`${API_BASE}/analysis/tyre`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// FIXED CHAT ENDPOINT
export const askChat = (payload) => {
  return axios.post(`${API_BASE}/chat`, {
    message: payload.prompt, // backend expects "message"
  });
};
