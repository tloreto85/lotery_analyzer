import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const uploadContests = (content) => axios.post(`${API}/contests/upload`, { content }).then((r) => r.data);
export const fetchStats = (window) => axios.get(`${API}/stats`, { params: { window } }).then((r) => r.data);
export const fetchContests = (limit = 10) => axios.get(`${API}/contests`, { params: { limit } }).then((r) => r.data);
export const clearContests = () => axios.delete(`${API}/contests`).then((r) => r.data);
export const generateGames = (window, quantity, opts = {}) =>
  axios.post(`${API}/generate`, { window, quantity, ...opts }).then((r) => r.data);
export const fetchBatches = () => axios.get(`${API}/batches`).then((r) => r.data);
export const checkBatch = (id, concurso) =>
  axios.get(`${API}/batches/${id}`, { params: concurso ? { concurso } : {} }).then((r) => r.data);
export const deleteBatch = (id) => axios.delete(`${API}/batches/${id}`).then((r) => r.data);
export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (Array.isArray(d)) return d.map((x) => x.msg.replace(/^Value error, /, "")).join("; ");
  return d || e.message || "Erro inesperado";
};
