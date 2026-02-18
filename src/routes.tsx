// routes.tsx
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppLayout } from './pages/_layouts/app'
import { AuthLayout } from './pages/_layouts/auth'
import { LandingPage } from './pages/landing-page'
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

// Função para verificar se o usuário está autenticado
const isAuthenticated = () => {
  return !!localStorage.getItem('token')
}

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: isAuthenticated() ? <Navigate to="/dashboard" replace /> : <LandingPage />,
      },
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