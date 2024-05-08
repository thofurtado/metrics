import { Pyramid } from 'lucide-react'
import { Outlet } from 'react-router-dom'
export function AuthLayout() {
  return (
    <div className="grid min-h-screen grid-cols-2 antialiased">
      <div className="flex h-full flex-col justify-between border-r border-foreground/5 bg-stone-300 p-10 text-muted-foreground dark:bg-stone-200">
        <div className="flex items-center gap-3 text-lg text-foreground">
          <Pyramid className="text-minsk-400 dark:text-minsk-400  h-5 w-5" />
          <span className="text-minsk-600 dark:text-minsk-300 font-semibold ">
            metrics
          </span>
        </div>
        <footer className="dark:text-stone-400">
          Painel do parceiro &copy; metrics - {new Date().getFullYear()}
        </footer>
      </div>
      <div className="relative flex flex-col items-center justify-center">
        <Outlet />
      </div>
    </div>
  )
}
