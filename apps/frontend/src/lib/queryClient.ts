import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch on window focus in dev — too noisy
      refetchOnWindowFocus: import.meta.env.PROD,
      // Treat data as fresh for 30 seconds before background refetch
      staleTime: 30_000,
      // Retry failed queries once before showing error
      retry: 1,
    },
  },
})
