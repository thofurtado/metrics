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
    'metrics-two-gamma.vercel.app': {
        id: 'marujo',
        name: 'Marujo Gastro Bar',
        logo: '/assets/marujo/logo.svg',
        themeClass: 'theme-marujo',
        landingComponent: lazy(() => import('../pages/landings/Marujo')),
    }
};

const DEFAULT_TENANT = 'localhost';

export function getCurrentTenant() {
    const host = window.location.hostname;
    return TENANTS_CONFIG[host as keyof typeof TENANTS_CONFIG] || TENANTS_CONFIG[DEFAULT_TENANT];
}
