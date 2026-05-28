import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true, // CRITICAL: sends httpOnly cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
})

// On 401: redirect to /login unless already there (avoids infinite redirects)
// On any error: extract the server's error message and rethrow as a plain Error
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }

      const serverError = error.response?.data?.error as
        | { code?: string; message?: string }
        | undefined

      if (serverError?.message) {
        return Promise.reject(new Error(serverError.message))
      }
    }

    return Promise.reject(error)
  },
)

// Server always responds with { success: true, data: T }
// These helpers unwrap the envelope and return T directly.
export const api = {
  get<T = unknown>(url: string): Promise<T> {
    return axiosInstance
      .get<{ success: true; data: T }>(url)
      .then((r) => r.data.data)
  },

  post<T = unknown>(url: string, data?: unknown): Promise<T> {
    return axiosInstance
      .post<{ success: true; data: T }>(url, data)
      .then((r) => r.data.data)
  },

  put<T = unknown>(url: string, data?: unknown): Promise<T> {
    return axiosInstance
      .put<{ success: true; data: T }>(url, data)
      .then((r) => r.data.data)
  },

  delete<T = unknown>(url: string): Promise<T> {
    return axiosInstance
      .delete<{ success: true; data: T }>(url)
      .then((r) => r.data.data)
  },
}
