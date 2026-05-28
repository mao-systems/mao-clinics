import axios from 'axios'
import type { PaginationMeta } from '@mao-systems/shared'

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

// Export the raw axios instance for non-JSON responses (e.g. PDF blobs)
export { axiosInstance as apiInstance }

// Server always responds with { success: true, data: T }
// These helpers unwrap the envelope and return T directly.
export const api = {
  // Accepts optional params for query strings (e.g. search filters)
  get<T = unknown>(url: string, config?: { params?: Record<string, unknown> }): Promise<T> {
    return axiosInstance
      .get<{ success: true; data: T }>(url, config)
      .then((r) => r.data.data)
  },

  // For paginated list endpoints: returns { data: T[], meta: PaginationMeta }
  getList<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
  ): Promise<{ data: T[]; meta: PaginationMeta }> {
    return axiosInstance
      .get<{ success: true; data: T[]; meta: PaginationMeta }>(url, { params })
      .then((r) => ({ data: r.data.data, meta: r.data.meta }))
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

  patch<T = unknown>(url: string, data?: unknown): Promise<T> {
    return axiosInstance
      .patch<{ success: true; data: T }>(url, data)
      .then((r) => r.data.data)
  },

  delete<T = unknown>(url: string): Promise<T> {
    return axiosInstance
      .delete<{ success: true; data: T }>(url)
      .then((r) => r.data.data)
  },

  // Used for multipart/form-data uploads (logos, attachments)
  postForm<T = unknown>(url: string, formData: FormData): Promise<T> {
    return axiosInstance
      .post<{ success: true; data: T }>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data)
  },
}
