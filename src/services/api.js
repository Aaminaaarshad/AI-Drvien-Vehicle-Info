import axios from "axios";

const API_BASE = "http://localhost:5000/api";

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
