// routes.tsx
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './pages/_layouts/app'
import { AuthLayout } from './pages/_layouts/auth'
import { LandingInterceptor } from './pages/landings/LandingInterceptor'

const EurecaLanding = lazy(() => import('./pages/landings/Eureca'))
const MarujoLanding = lazy(() => import('./pages/landings/Marujo'))
const Cardapio = lazy(() => import('./pages/landings/Marujo/Cardapio'))


const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';

import { DownloadsPage } from './pages/downloads'
import { NotFound } from './pages/404'
import { Dashboard } from './pages/app/dashboard/dashboard'
import { Transactions } from './pages/app/transactions/transactions'
import { Treatment } from './pages/app/treatments/treatment'
import { Treatments } from './pages/app/treatments/treatments'
import { SignIn } from './pages/auth/sign-in'
import { SignUp } from './pages/auth/sign-up'
import { Items } from './pages/app/items'
import { SettingsLayout } from './pages/app/settings/settings-layout'
import { Accounts } from './pages/app/settings/accounts'
import { Payments } from './pages/app/settings/payments'
import { SuppliersList } from './pages/app/suppliers/suppliers-list'
import { ModulesSettings } from './pages/app/settings/modules-settings'
import { ModuleGuard } from './components/module-guard'

import { TimeClockKiosk } from './pages/hr/time-clock/kiosk'
import { HRDashboard } from './pages/hr/dashboard'
import { TimeSheetPage } from './pages/hr/time-clock/timesheet-page'
import { PayrollHistory } from './pages/hr/payroll/history'


export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <LandingInterceptor />,
      },
      ...(isDev
        ? [
          {
            path: 'eureca',
            element: (
              <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
                <EurecaLanding />
              </Suspense>
            ),
          },
          {
            path: 'marujo',
            element: (
              <div className="theme-marujo">
                <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
                  <MarujoLanding />
                </Suspense>
              </div>
            ),
          },
        ]
        : []),
      ...(window.location.hostname.includes('marujogastrobar') || window.location.hostname.includes('metrics-two-gamma') || isDev
        ? [
          {
            path: 'cardapio',
            element: (
              <div className="theme-marujo">
                <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
                  <Cardapio />
                </Suspense>
              </div>
            )
          }
        ]
        : []),
      {
        path: 'downloads',
        element: <DownloadsPage />,
      },
      {
        path: 'time-clock',
        element: <TimeClockKiosk />,
      },
      {
        path: 'hr/timesheet/:employeeId',
        element: (
          <ModuleGuard module="hr_module">
            <TimeSheetPage />
          </ModuleGuard>
        ),
      },
      {
        element: <AppLayout />,
        children: [
          { path: 'dashboard', element: <Dashboard /> },
          {
            path: 'treatments',
            element: (
              <ModuleGuard module="treatments">
                <Treatments />
              </ModuleGuard>
            )
          },
          {
            path: 'treatment/new',
            element: (
              <ModuleGuard module="treatments">
                <Treatment />
              </ModuleGuard>
            )
          },
          {
            path: 'transactions',
            element: (
              <ModuleGuard module="financial">
                <Transactions />
              </ModuleGuard>
            )
          },
          {
            path: 'items',
            element: (
              <ModuleGuard module="merchandise">
                <Items />
              </ModuleGuard>
            )
          },
          { path: 'suppliers', element: <SuppliersList /> },
          {
            path: 'settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="modules" replace /> }, // Default to modules or accounts? Modules seems appropriate for admin.
              { path: 'accounts', element: <Accounts /> },
              { path: 'payments', element: <Payments /> },
              { path: 'modules', element: <ModulesSettings /> },
            ]
          },
          {
            path: 'hr',
            element: (
              <ModuleGuard module="hr_module">
                <HRDashboard />
              </ModuleGuard>
            ),
          },
          {
            path: 'hr/payroll/history',
            element: (
              <ModuleGuard module="hr_module">
                <PayrollHistory />
              </ModuleGuard>
            ),
          }
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          { path: 'sign-in', element: <SignIn /> },
          { path: 'sign-up', element: <SignUp /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  }
])