
// routes.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './pages/_layouts/app'
import { AuthLayout } from './pages/_layouts/auth'
import { LandingPage } from './pages/landing-page'
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
        element: <AppLayout />,
        children: [
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'treatments', element: <Treatments /> },
          { path: 'treatment/new', element: <Treatment /> },
          { path: 'transactions', element: <Transactions /> },
          { path: 'items', element: <Items /> },
          { path: 'suppliers', element: <SuppliersList /> },
          {
            path: 'settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="accounts" replace /> },
              { path: 'accounts', element: <Accounts /> },
              { path: 'payments', element: <Payments /> },
            ]
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