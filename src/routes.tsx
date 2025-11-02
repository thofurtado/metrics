// routes.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './pages/_layouts/app'
import { AuthLayout } from './pages/_layouts/auth'
import { LandingPage } from './pages/landing-page' // Nova página
import { NotFound } from './pages/404'
import { Dashboard } from './pages/app/dashboard/dashboard'
import { Transactions } from './pages/app/transactions/transactions'
import { Treatment } from './pages/app/treatments/treatment'
import { Treatments } from './pages/app/treatments/treatments'
import { SignIn } from './pages/auth/sign-in'
import { SignUp } from './pages/auth/sign-up'

// Função para verificar se o usuário está autenticado
const isAuthenticated = () => {
  return !!localStorage.getItem('token')
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: isAuthenticated() ? <Navigate to="/dashboard" replace /> : <LandingPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFound />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/treatments', element: <Treatments /> },
      { path: '/treatment/new', element: <Treatment /> },
      { path: '/transactions', element: <Transactions /> },
    ],
  },
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { path: '/sign-in', element: <SignIn /> },
      { path: '/sign-up', element: <SignUp /> },
    ],
  },
])