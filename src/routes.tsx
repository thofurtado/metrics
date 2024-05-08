import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from './pages/_layouts/app'
import { AuthLayout } from './pages/_layouts/auth'
import { NotFound } from './pages/404'
import { Dashboard } from './pages/app/dashboard/dashboard'
import { Treatment } from './pages/app/treatments/treatment'
import { Treatments } from './pages/app/treatments/treatments'
import { SignIn } from './pages/auth/sign-in'
import { SignUp } from './pages/auth/sign-up'
const token = localStorage.getItem('token')

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout></AppLayout>,
    errorElement: <NotFound />,

    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/treatments', element: <Treatments /> },
      { path: '/treatment/new', element: <Treatment /> },
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
