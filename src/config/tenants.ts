import { lazy } from 'react';

export const TENANTS_CONFIG = {
    // Domínio de Desenvolvimento / Produção Principal
    'localhost': {
        id: 'eureca',
        name: 'Eureca Tech',
        logo: '/assets/eureca/logo.svg',
        themeClass: '', // Tema padrão
        landingComponent: lazy(() => import('../pages/landings/Eureca')),
    },
    'www.eurecatech.com.br': {
        id: 'eureca',
        name: 'Eureca Tech',
        logo: '/assets/eureca/logo.svg',
        themeClass: '',
        landingComponent: lazy(() => import('../pages/landings/Eureca')),
    },
    // Domínio do White Label Marujo
    'marujogastrobar.vercel.app': {
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

    if (hostname === 'marujogastrobar.vercel.app' || hostname === 'metrics-two-gamma.vercel.app') {
        return TENANTS_CONFIG['marujogastrobar.vercel.app'];
    }

    if (hostname === 'www.eurecatech.com.br' || hostname === 'eurecatech.com.br') {
        return TENANTS_CONFIG['www.eurecatech.com.br'];
    }

    if (isDev) {
        return TENANTS_CONFIG['localhost'];
    }

    return TENANTS_CONFIG['www.eurecatech.com.br']; // Fallback padrão para prod
}
