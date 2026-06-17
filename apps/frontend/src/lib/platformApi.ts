/**
 * Separate axios instance for the /platform/* backend routes.
 *
 * Why separate from api.ts?
 *  1. 401 redirects should go to /platform/login, not /login.
 *  2. Keeps the platform auth context fully decoupled from tenant auth.
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api/v1', '/platform')
  : '/platform'

const platformAxios = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

platformAxios.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 && !window.location.pathname.startsWith('/platform/login')) {
        window.location.href = '/platform/login'
      }

      const serverError = error.response?.data?.error as { message?: string } | undefined
      if (serverError?.message) {
        return Promise.reject(new Error(serverError.message))
      }
    }
    return Promise.reject(error)
  },
)

export const platformApi = {
  get<T = unknown>(url: string): Promise<T> {
    return platformAxios
      .get<{ success: true; data: T }>(url)
      .then((r) => r.data.data)
  },

  post<T = unknown>(url: string, data?: unknown): Promise<T> {
    return platformAxios
      .post<{ success: true; data: T }>(url, data)
      .then((r) => r.data.data)
  },

  patch<T = unknown>(url: string, data?: unknown): Promise<T> {
    return platformAxios
      .patch<{ success: true; data: T }>(url, data)
      .then((r) => r.data.data)
  },
}
