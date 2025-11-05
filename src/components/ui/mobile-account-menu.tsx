// components/ui/mobile-account-menu.tsx
import { useMutation, useQuery } from '@tanstack/react-query'
import { Angry, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { getProfile } from '@/api/get-profile'
import { signOut } from '@/api/sign-out'

import { Button } from './button'
import { Dialog, DialogTrigger } from './dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { Skeleton } from './skeleton'
import { StoreProfileDialog } from './store-profile-dialog'

export function MobileAccountMenu() {
  const navigate = useNavigate()

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: Infinity,
  })
  const { mutateAsync: signOutFn, isPending: isSigningOut } = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      navigate('/sign-in', { replace: true })
    },
  })

  // Função para pegar as iniciais do nome
  const getInitials = (name: string) => {
    if (!name) return 'US'
    
    return name
      .split(' ')
      .map(word => word[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full p-0"
          >
            {isLoadingProfile ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {getInitials(profile?.name || '')}
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span className="pb-2">
              {isLoadingProfile ? (
                <Skeleton className="h-4 w-32" />
              ) : profile?.role === 'TECHNICIAN' ? (
                'Técnico'
              ) : (
                'Admin'
              )}
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {isLoadingProfile ? (
                <Skeleton className="h-3 w-24" />
              ) : (
                profile?.email
              )}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DialogTrigger asChild>
            <DropdownMenuItem>
              <Angry className="ml-5 h-4" /> <span> Perfil do usuário</span>
            </DropdownMenuItem>
          </DialogTrigger>

          <DropdownMenuItem
            asChild
            className="text-rose-500 dark:text-rose-400"
            disabled={isSigningOut}
          >
            <button className="w-full" onClick={() => signOutFn()}>
              <LogOut className="ml-5 h-4" /> <span>Sair</span>
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <StoreProfileDialog />
    </Dialog>
  )
}