import { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentTenant } from '../../config/tenants';

const isAuthenticated = () => !!localStorage.getItem('token');

export function LandingInterceptor() {
    if (isAuthenticated()) {
        return <Navigate to="/dashboard" replace />;
    }

    const tenant = getCurrentTenant();
    const LandingComponent = tenant.landingComponent;

    return (
        <div className={tenant.themeClass}>
            <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
                <LandingComponent />
            </Suspense>
        </div>
    );
}
