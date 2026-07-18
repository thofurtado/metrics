import { Suspense, lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

const EurecaLanding = lazy(() => import('./Eureca'));
const MarujoLanding = lazy(() => import('./Marujo'));
const GenericMenu = lazy(() => import('./GenericMenu'));

const isAuthenticated = () => !!localStorage.getItem('token');

interface TenantInfo {
  name: string
  landingPageType: 'NONE' | 'MENU' | 'CUSTOM'
  landingPageSlug: string | null
}

async function fetchTenantInfo() {
  const response = await api.get<TenantInfo>('/public/tenant-info');
  return response.data;
}

export function LandingInterceptor() {
    if (isAuthenticated()) {
        return <Navigate to="/dashboard" replace />;
    }

    const { data: tenant, isLoading, error } = useQuery({
      queryKey: ['tenant-landing-info'],
      queryFn: fetchTenantInfo,
      retry: false,
      staleTime: Infinity, // Cache the landing configuration
    });

    if (isLoading) {
      return <div className="flex h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground animate-pulse">Carregando ambiente...</span>
      </div>;
    }

    // Se deu erro ou não tem landing page, joga pro login
    if (error || !tenant || tenant.landingPageType === 'NONE') {
        return <Navigate to="/sign-in" replace />;
    }

    if (tenant.landingPageType === 'MENU') {
      return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
          <GenericMenu tenantName={tenant.name} />
        </Suspense>
      );
    }

    if (tenant.landingPageType === 'CUSTOM') {
      if (tenant.landingPageSlug === 'eureca') {
        return (
          <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
            <EurecaLanding />
          </Suspense>
        );
      }
      
      if (tenant.landingPageSlug === 'marujo') {
        return (
          <div className="theme-marujo">
            <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
              <MarujoLanding />
            </Suspense>
          </div>
        );
      }
    }

    // Fallback de segurança
    return <Navigate to="/sign-in" replace />;
}
