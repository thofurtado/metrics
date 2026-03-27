import { isAxiosError } from 'axios'
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { api } from '@/lib/axios'

export function AppLayout() {
  const navigate = useNavigate()

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (status === 401) {
            navigate('/sign-in', { replace: true })
          }
        }
      },
    )

    return () => {
      api.interceptors.response.eject(interceptorId)
    }
  }, [navigate])

  return (
    <div className="flex min-h-screen flex-col antialiased bg-background selection:bg-primary/20">
      <Header />
      <div className="flex flex-1 pt-16">
        <Sidebar />
        <main className="flex-1 md:ml-24">
          <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}