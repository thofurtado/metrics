// routes.tsx
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AdminGuard } from './components/admin-guard'
import { ModuleGuard } from './components/module-guard'
import { AppLayout } from './pages/_layouts/app'
import { AuthLayout } from './pages/_layouts/auth'
import { NotFound } from './pages/404'
import { PaymentConfig } from './pages/app/admin-cashier/payment-config'
import { CashierDashboard } from './pages/app/cashier/dashboard'
import { CashierSessionDetails } from './pages/app/cashier/session/[id]'
import { ClientsEquipments } from './pages/app/clients-equipments'
import { Dashboard } from './pages/app/dashboard/dashboard'
import { Items } from './pages/app/items'
import { Accounts } from './pages/app/settings/accounts'
import { CreditCards } from './pages/app/settings/credit-cards'
import { MenuSettings } from './pages/app/settings/menu-settings'
import { ModulesSettings } from './pages/app/settings/modules-settings'
import { PaymentIdentifiersSettings } from './pages/app/settings/payment-identifiers'
import { Payments } from './pages/app/settings/payments'
import { Permissions } from './pages/app/settings/permissions'
import { POSMachinesSettings } from './pages/app/settings/pos-machines'
import { SettingsLayout } from './pages/app/settings/settings-layout'
import { SuppliersList } from './pages/app/suppliers/suppliers-list'
import { Settlements } from './pages/app/transactions/settlements'
import { Transactions } from './pages/app/transactions/transactions'
import { Treatment } from './pages/app/treatments/treatment'
import { Treatments } from './pages/app/treatments/treatments'
import { CashierSignIn } from './pages/auth/cashier-sign-in'
import { SignIn } from './pages/auth/sign-in'
import { SignUp } from './pages/auth/sign-up'
import { DownloadsPage } from './pages/downloads'
import { HRDashboard } from './pages/hr/dashboard'
import { PayrollHistory } from './pages/hr/payroll/history'
import { TimeClockKiosk } from './pages/hr/time-clock/kiosk'
import { TimeSheetPage } from './pages/hr/time-clock/timesheet-page'
import { LandingInterceptor } from './pages/landings/LandingInterceptor'
import { MenuResolver } from './pages/landings/MenuResolver'
import { ReceiptPage } from './pages/public/receipt-page'
import { EquipmentHistoryPage } from './pages/public/equipment-history'

const EurecaLanding = lazy(() => import('./pages/landings/Eureca'))
const MarujoLanding = lazy(() => import('./pages/landings/Marujo'))

const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development'

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
                <Suspense
                  fallback={
                    <div className="flex h-screen items-center justify-center">
                      Carregando...
                    </div>
                  }
                >
                  <EurecaLanding />
                </Suspense>
              ),
            },
            {
              path: 'marujo',
              element: (
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
              ),
            },
          ]
        : []),
      {
        path: 'cardapio',
        element: <MenuResolver />,
      },
      {
        path: 'comprovante/:transactionId',
        element: <ReceiptPage />,
      },
      {
        path: 'equipamento/:id',
        element: <EquipmentHistoryPage />,
      },
      {
        path: 'equipment/:id',
        element: <EquipmentHistoryPage />,
      },
      {
        path: 'equipment-history/:id',
        element: <EquipmentHistoryPage />,
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
            path: 'clients-equipments',
            element: (
              <ModuleGuard module="treatments">
                <ClientsEquipments />
              </ModuleGuard>
            ),
          },
          {
            path: 'treatments',
            element: (
              <ModuleGuard module="treatments">
                <Treatments />
              </ModuleGuard>
            ),
          },
          {
            path: 'treatment/new',
            element: (
              <ModuleGuard module="treatments">
                <Treatment />
              </ModuleGuard>
            ),
          },
          {
            path: 'transactions',
            element: (
              <ModuleGuard module="financial">
                <Transactions />
              </ModuleGuard>
            ),
          },
          {
            path: 'transactions/settlements',
            element: (
              <ModuleGuard module="financial">
                <Settlements />
              </ModuleGuard>
            ),
          },
          {
            path: 'cashier',
            element: (
              <ModuleGuard module="cashier">
                <CashierDashboard />
              </ModuleGuard>
            ),
          },
          {
            path: 'cashier/session/:id',
            element: (
              <ModuleGuard module="cashier">
                <CashierSessionDetails />
              </ModuleGuard>
            ),
          },
          {
            path: 'items',
            element: (
              <ModuleGuard module="merchandise">
                <Items />
              </ModuleGuard>
            ),
          },
          { path: 'suppliers', element: <SuppliersList /> },
          {
            path: 'settings',
            element: (
              <AdminGuard>
                <SettingsLayout />
              </AdminGuard>
            ),
            children: [
              { index: true, element: <Navigate to="modules" replace /> }, // Default to modules or accounts? Modules seems appropriate for admin.
              { path: 'accounts', element: <Accounts /> },
              { path: 'credit-cards', element: <CreditCards /> },
              { path: 'payments', element: <Payments /> },
              { path: 'pos-machines', element: <POSMachinesSettings /> },
              {
                path: 'payment-identifiers',
                element: <PaymentIdentifiersSettings />,
              },
              { path: 'modules', element: <ModulesSettings /> },
              { path: 'cardapio', element: <MenuSettings /> },
              { path: 'permissions', element: <Permissions /> },
              { path: 'payment-config', element: <PaymentConfig /> },
            ],
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
          },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          { path: 'sign-in', element: <SignIn /> },
          { path: 'sign-up', element: <SignUp /> },
          { path: 'cashier/sign-in', element: <CashierSignIn /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])
