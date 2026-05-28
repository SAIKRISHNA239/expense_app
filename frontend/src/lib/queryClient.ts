import { QueryClient } from '@tanstack/react-query';

// Configure a default QueryClient with sensible defaults for our app
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      retry: 1, // Only retry failed queries once to avoid hanging
      refetchOnWindowFocus: false, // Don't refetch every time the user tabs back
    },
  },
});
