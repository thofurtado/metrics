import { isAxiosError } from 'axios'
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { Sidebar } from '@/components/sidebar'
import { useSidebar } from '@/context/sidebar-context'
import { api } from '@/lib/axios'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const navigate = useNavigate()
  const { isCollapsed } = useSidebar()

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
        return Promise.reject(error)
      },
    )

    return () => {
      api.interceptors.response.eject(interceptorId)
    }
  }, [navigate])

  return (
    <div className="flex min-h-screen bg-background font-manrope text-foreground antialiased">
      <Sidebar />

      <main
        className={cn(
          'relative flex min-h-screen w-full flex-1 flex-col transition-[margin] duration-300 ease-in-out',
          isCollapsed ? 'lg:ml-[80px]' : 'lg:ml-[260px]',
        )}
      >
        <div className="mx-auto mt-16 flex w-full max-w-[1700px] flex-1 flex-col gap-8 p-6 md:p-10 lg:mt-0 lg:p-14">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
