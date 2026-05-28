import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // treat data as fresh for 5 minutes
      // Don't retry on auth errors — the api interceptor already handles redirects
      retry: (count, error) =>
        count < 2 && (error as Error).message !== 'UNAUTHORIZED',
      refetchOnWindowFocus: false,
    },
  },
})
