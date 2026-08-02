import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { api } from '@/lib/axios'

const MarujoLanding = lazy(() => import('./Marujo/Cardapio'))
const GenericMenu = lazy(() => import('./GenericMenu'))

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

export function MenuResolver() {
  const { data: tenant, isLoading: isLoadingTenant, error: tenantError } = useQuery({
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
    // Cores neutras como fallback padrão (White Label Genérico)
    const primary = profile?.primaryColor || '#475569' // slate-600 (Cinza Neutro)
    const secondary = profile?.secondaryColor || '#ffffff'
    const background = profile?.backgroundColor || '#f8fafc' // slate-50

    document.documentElement.style.setProperty('--primary-color', primary)
    document.documentElement.style.setProperty('--secondary-color', secondary)
    document.documentElement.style.setProperty('--background-color', background)
  }, [profile])

  if (isLoadingTenant || isLoadingProfile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[var(--background-color,#f8fafc)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-color,#4f46e5)]" />
        <span className="animate-pulse text-sm text-slate-500">
          Carregando cardápio...
        </span>
      </div>
    )
  }

  // Se deu erro no tenant ou ele não quer cardápio, joga pro login/fallback
  if (tenantError || !tenant || tenant.landingPageType === 'NONE') {
    return <Navigate to="/sign-in" replace />
  }

  // Se for cliente VIP (Marujo) com layout customizado (preservando o funcionamento antigo)
  if (tenant.landingPageType === 'CUSTOM' && tenant.landingPageSlug === 'marujo') {
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

  // Comportamento Genérico (White Label)
  // Nota: O GenericMenu será renderizado independentemente se falhar em carregar o profile
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
