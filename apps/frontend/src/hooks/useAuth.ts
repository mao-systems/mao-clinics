// Stub — full implementation in Step 03 (auth module)
// Will query GET /api/v1/auth/me and expose user + logout()
export function useAuth() {
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    logout: async () => {},
  }
}
