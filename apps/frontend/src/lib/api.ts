import axios from 'axios'

// All API calls go through this instance.
// Credentials (httpOnly cookies) are included automatically.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercept 401 responses — redirect to /login (auth guard wired in Step 03)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
