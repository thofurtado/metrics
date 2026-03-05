import { lazy } from 'react';

export const TENANTS_CONFIG = {
    // Domínio de Desenvolvimento / Local
    'localhost': {
        id: 'eureca',
        name: 'Eureca Tech',
        logo: '/assets/eureca/logo.svg',
        themeClass: '', // Tema padrão
        landingComponent: lazy(() => import('../pages/landings/Eureca')),
    },
    // Configuração Eureca
    'eureca': {
        id: 'eureca',
        name: 'Eureca Tech',
        logo: '/assets/eureca/logo.svg',
        themeClass: '',
        landingComponent: lazy(() => import('../pages/landings/Eureca')),
    },
    // Configuração Marujo
    'marujo': {
        id: 'marujo',
        name: 'Marujo Gastro Bar',
        logo: '/assets/marujo/logo.svg',
        themeClass: 'theme-marujo',
        landingComponent: lazy(() => import('../pages/landings/Marujo')),
    }
};

const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';

export function getCurrentTenant() {
    const hostname = window.location.hostname;

    // 1. Verificação para Marujo (Cobre www, sem www e o link antigo da Vercel)
    if (hostname.includes('marujo') || hostname.includes('metrics-two-gamma')) {
        return TENANTS_CONFIG['marujo'];
    }

    // 2. Verificação para Eureca (Cobre www e sem www)
    if (hostname.includes('eurecatech')) {
        return TENANTS_CONFIG['eureca'];
    }

    // 3. Ambiente de desenvolvimento
    if (isDev) {
        return TENANTS_CONFIG['localhost'];
    }

    // Fallback padrão para produção (Eureca)
    return TENANTS_CONFIG['eureca'];
}