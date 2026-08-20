import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useEffect } from 'react'
import { Navigate } from 'react-router-dom'

import { api } from '@/lib/axios'

const EurecaLanding = lazy(() => import('./Eureca'))
const MarujoLanding = lazy(() => import('./Marujo'))
const GenericMenu = lazy(() => import('./GenericMenu'))

const isAuthenticated = () => !!localStorage.getItem('token')

interface TenantInfo {
  name: string
  landingPageType: 'NONE' | 'MENU' | 'CUSTOM'
  landingPageSlug: string | null
}

interface CompanyProfile {
  tradeName: string
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  logo_url: string | null
  banner_url: string | null
  isOpenManual: boolean
  businessHours: any[]
}

async function fetchTenantInfo() {
  const response = await api.get<TenantInfo>('/public/tenant-info')
  return response.data
}

async function fetchCompanyProfile() {
  const response = await api.get<CompanyProfile>('/public/profile')
  return response.data
}

export function LandingInterceptor() {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  const {
    data: tenant,
    isLoading: isLoadingTenant,
    error,
  } = useQuery({
    queryKey: ['tenant-landing-info'],
    queryFn: fetchTenantInfo,
    retry: false,
    staleTime: Infinity,
  })

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['company-profile'],
    queryFn: fetchCompanyProfile,
    retry: false,
    staleTime: Infinity,
  })

  useEffect(() => {
    const primary = profile?.primaryColor || '#475569'
    const secondary = profile?.secondaryColor || '#ffffff'
    const background = profile?.backgroundColor || '#f8fafc'

    document.documentElement.style.setProperty('--primary-color', primary)
    document.documentElement.style.setProperty('--secondary-color', secondary)
    document.documentElement.style.setProperty('--background-color', background)
  }, [profile])

  if (isLoadingTenant || isLoadingProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="animate-pulse text-sm text-muted-foreground">
          Carregando ambiente...
        </span>
      </div>
    )
  }

  // Se deu erro ou não tem landing page, joga pro login
  if (error || !tenant || tenant.landingPageType === 'NONE') {
    return <Navigate to="/sign-in" replace />
  }

  if (tenant.landingPageType === 'MENU') {
    return (
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            Carregando...
          </div>
        }
      >
        <GenericMenu tenantName={tenant.name} profile={profile} />
      </Suspense>
    )
  }

  if (tenant.landingPageType === 'CUSTOM') {
    if (tenant.landingPageSlug === 'eureca') {
      return (
        <Suspense
          fallback={
            <div className="flex h-screen items-center justify-center">
              Carregando...
            </div>
          }
        >
          <EurecaLanding />
        </Suspense>
      )
    }

    if (tenant.landingPageSlug === 'marujo') {
      return (
        <div className="theme-marujo">
          <Suspense
            fallback={
              <div className="flex h-screen items-center justify-center">
                Carregando...
              </div>
            }
          >
            <MarujoLanding />
          </Suspense>
        </div>
      )
    }
  }

  // Fallback de segurança
  return <Navigate to="/sign-in" replace />
}
