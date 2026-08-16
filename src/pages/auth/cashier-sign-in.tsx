import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Lock,
  UserCheck,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { CashierUser, getCashierUsers } from '@/api/cashier/get-cashier-users'
import { signIn } from '@/api/sign-in'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CashierSignIn() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedUser, setSelectedUser] = useState<CashierUser | null>(null)
  const [password, setPassword] = useState('')

  const {
    data: cashierUsers = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['cashier-users'],
    queryFn: getCashierUsers,
    staleTime: 1000 * 60 * 2,
  })

  const { mutateAsync: login, isPending: isLoggingIn } = useMutation({
    mutationFn: signIn,
    onSuccess: (data: any) => {
      if (data?.data?.token) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('refreshToken', data.data.refreshToken)
        if (selectedUser) {
          localStorage.setItem('metrics.lastUserId', selectedUser.id)
        }
        window.dispatchEvent(new Event('auth-change'))
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
      toast.success(`Bem-vindo, ${selectedUser?.name}!`)
      navigate('/cashier', { replace: true })
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'Senha incorreta. Tente novamente.',
      )
    },
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !password) return
    await login({ userId: selectedUser.id, password })
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 p-4 font-manrope text-slate-100">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        {/* Topo / Header */}
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-600/20 font-bold text-blue-400 shadow-lg">
            <Wallet size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">
              Login do Caixa
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Selecione seu usuário para acessar a conferência de caixa
            </p>
          </div>
        </div>

        {/* Formulário / Lista */}
        {!selectedUser ? (
          <div className="space-y-4">
            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
              Operadores Autorizados
            </span>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-center text-xs font-bold text-slate-400">
                <Loader2 size={18} className="animate-spin text-blue-500" />
                Carregando operadores...
              </div>
            ) : isError ? (
              <div className="space-y-2 p-4 text-center text-xs font-bold text-red-400">
                <p>Erro ao carregar operadores do caixa.</p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="px-3 py-1.5 text-xs font-black uppercase"
                >
                  Tentar Novamente
                </Button>
              </div>
            ) : cashierUsers.length > 0 ? (
              <div className="grid max-h-[320px] grid-cols-1 gap-3 overflow-y-auto pr-1">
                {cashierUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user)
                      setPassword('')
                    }}
                    className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition-all hover:border-blue-500/50 hover:bg-blue-950/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/30 text-sm font-black uppercase text-blue-300">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-slate-100 group-hover:text-blue-400">
                          {user.name}
                        </span>
                        <span className="block text-[11px] font-medium text-slate-400">
                          {user.email}
                        </span>
                      </div>
                    </div>

                    <span className="rounded-md bg-slate-800 px-2.5 py-1 text-[9px] font-black uppercase text-slate-300">
                      {user.role === 'ADMIN' ? 'Admin' : 'Caixa'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs font-bold text-slate-400">
                Nenhum operador de caixa cadastrado.
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleLogin}
            className="space-y-5 duration-200 animate-in fade-in"
          >
            {/* Usuário Selecionado */}
            <div className="flex items-center justify-between rounded-2xl border border-blue-500/30 bg-blue-950/30 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-xs font-black uppercase text-white">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <span className="block text-xs font-black text-white">
                    {selectedUser.name}
                  </span>
                  <span className="block text-[10px] font-medium text-slate-400">
                    {selectedUser.email}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:underline"
              >
                <ArrowLeft size={14} /> Trocar
              </button>
            </div>

            {/* Input de Senha */}
            <div className="space-y-2">
              <Label className="block text-xs font-extrabold uppercase text-slate-300">
                Digite sua Senha
              </Label>
              <div className="relative">
                <Input
                  type="password"
                  autoFocus
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full rounded-2xl border-slate-700 bg-slate-950 p-4 pl-11 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
                <KeyRound
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoggingIn || !password}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-6 text-xs font-black uppercase text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Entrando...
                </>
              ) : (
                <>
                  <UserCheck size={18} /> Entrar no Caixa
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
