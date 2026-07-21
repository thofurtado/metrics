import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Angry, ChevronDown, LogOut, Settings } from 'lucide-react'
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

export function AccountMenu({ isCollapsed }: { isCollapsed?: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: Infinity,
  })
  const { mutateAsync: signOutFn, isPending: isSigningOut } = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear()
      navigate('/sign-in', { replace: true })
    },
  })

  return (
    <Dialog>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {isCollapsed ? (
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors ring-1 ring-border/50">
              {isLoadingProfile ? (
                <Skeleton className="h-10 w-10 rounded-full" />
              ) : (
                profile?.name ? (
                  profile.name.trim().split(/\s+/).length === 1 
                    ? profile.name.trim().substring(0, 2).toUpperCase() 
                    : (profile.name.trim().split(/\s+/)[0][0] + profile.name.trim().split(/\s+/).pop()![0]).toUpperCase()
                ) : 'User'
              )}
            </button>
          ) : (
            <Button
              variant={'outline'}
              className="flex select-none items-center gap-2"
            >
              {isLoadingProfile ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                profile?.name ? profile.name.trim().split(/\s+/)[0] : 'User'
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
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

          {profile?.role === 'ADMIN' && (
            <DropdownMenuItem onClick={() => navigate('/settings/accounts')}>
              <Settings className="ml-5 h-4" /> <span>Configurações</span>
            </DropdownMenuItem>
          )}

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
