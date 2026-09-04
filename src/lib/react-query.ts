import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds default freshness
      refetchOnWindowFocus: false, // Prevent request storms on window focus / tab switch
      retry: (failureCount, error) => {
        // Do not retry 4xx errors (client errors: 400, 401, 403, 404, 409)
        if (
          isAxiosError(error) &&
          error.response?.status &&
          error.response.status >= 400 &&
          error.response.status < 500
        ) {
          return false
        }
        return failureCount < 2
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 401) return

      toast.error('Ocorreu um erro ao carregar os dados.')
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 401) return

      const message =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Erro ao processar a solicitação.'

      toast.error(message)
    },
  }),
})
