import './index.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { Helmet, HelmetProvider } from 'react-helmet-async'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'

import { ThemeProvider } from './components/theme/theme-provider'
import { queryClient } from './lib/react-query'
import { router } from './routes'

import { ModuleProvider } from './context/module-context'

export function App() {
  return (
    <HelmetProvider>
      <ThemeProvider storageKey="metrics-theme" defaultTheme="light">
        <Helmet titleTemplate="%s | metrics" />
        <QueryClientProvider client={queryClient}>
          <ModuleProvider>
            <RouterProvider router={router} />
            <Toaster richColors closeButton />
          </ModuleProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}
