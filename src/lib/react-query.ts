import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'

export const queryClient = new QueryClient({
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
