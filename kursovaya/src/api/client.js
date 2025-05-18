import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
apiClient.interceptors.response.use(
  response => response,
  error => Promise.reject(error)
)

export default apiClient
