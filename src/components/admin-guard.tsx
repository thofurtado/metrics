import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getProfile } from '@/api/get-profile'

export function AdminGuard({ children }: { children: ReactNode }) {
    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: getProfile,
        staleTime: Infinity,
    })

    if (isLoading) {
        return null 
    }

    if (profile?.role !== 'ADMIN') {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}
