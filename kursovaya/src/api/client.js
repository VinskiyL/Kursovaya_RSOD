import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'https://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.response.use(
  response => response,
  error => Promise.reject(error)
)

export default apiClient
