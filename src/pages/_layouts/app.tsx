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
      },
    )

    return () => {
      api.interceptors.response.eject(interceptorId)
    }
  }, [navigate])

  return (
    <div className="flex min-h-screen bg-background font-manrope antialiased text-foreground">
      <Sidebar />
      
      <main 
        className={cn(
          "flex-1 flex flex-col min-h-screen w-full relative transition-[margin] duration-300 ease-in-out",
          isCollapsed ? "lg:ml-[80px]" : "lg:ml-[260px]"
        )}
      >
        <div className="flex flex-1 flex-col gap-8 p-6 md:p-10 lg:p-14 w-full mx-auto max-w-[1700px] mt-16 lg:mt-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}