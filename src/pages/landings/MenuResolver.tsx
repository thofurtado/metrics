import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { lazy, Suspense, useEffect } from 'react'

import { api } from '@/lib/axios'

import { MenuErrorBoundary, MenuUnavailable } from './menu-error'

const GenericMenu = lazy(() => import('./GenericMenu'))
const MarujoMenu = lazy(() => import('./Marujo/MarujoMenu'))

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
  paymentMethods?: Array<{
    id: string
    name: string
    in_sight: boolean
    installment_limit: number
  }>
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
  useEffect(() => {
    const root = document.documentElement
    const hadDark = root.classList.contains('dark')
    root.classList.remove('dark')
    root.classList.add('light')
    return () => {
      if (hadDark) {
        root.classList.add('dark')
        root.classList.remove('light')
      }
    }
  }, [])
  const {
    data: tenant,
    isLoading: isLoadingTenant,
    error: tenantError,
  } = useQuery({
    queryKey: ['tenant-landing-info'],
    queryFn: fetchTenantInfo,
    retry: 2, // conexão de celular oscila: tenta de novo antes de desistir
    staleTime: Infinity,
  })

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['company-profile'],
    queryFn: fetchCompanyProfile,
    retry: 2,
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

  // O cardápio é público: NUNCA manda o cliente para o login/sistema. Falha de rede = "Recarregar";
  // restaurante sem cardápio ativo = aviso simples.
  if (tenantError) {
    return <MenuUnavailable />
  }
  if (!tenant || tenant.landingPageType === 'NONE') {
    return (
      <MenuUnavailable
        title="Cardápio indisponível"
        message="Este restaurante ainda não ativou o cardápio online."
        showRetry={false}
      />
    )
  }

  // Se for cliente VIP (Marujo) com layout customizado (preservando o funcionamento antigo)
  if (
    tenant.landingPageType === 'CUSTOM' &&
    tenant.landingPageSlug === 'marujo' &&
    new URLSearchParams(window.location.search).get('generic') !== '1'
  ) {
    return (
      <MenuErrorBoundary>
        <Suspense
          fallback={
            <div className="flex h-screen items-center justify-center bg-[#080E18] text-[#ffb77d]">
              Carregando cardápio Marujo...
            </div>
          }
        >
          <MarujoMenu tenantName={tenant.name} profile={profile} />
        </Suspense>
      </MenuErrorBoundary>
    )
  }

  // Comportamento Genérico (White Label)
  // Nota: O GenericMenu será renderizado independentemente se falhar em carregar o profile
  return (
    <MenuErrorBoundary>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            Carregando...
          </div>
        }
      >
        <GenericMenu tenantName={tenant.name} profile={profile} />
      </Suspense>
    </MenuErrorBoundary>
  )
}
