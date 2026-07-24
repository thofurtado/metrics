import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Lock, UserCheck, KeyRound, Loader2, ArrowLeft, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { getCashierUsers, CashierUser } from '@/api/cashier/get-cashier-users'
import { signIn } from '@/api/sign-in'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CashierSignIn() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedUser, setSelectedUser] = useState<CashierUser | null>(null)
  const [password, setPassword] = useState('')

  const { data: cashierUsers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['cashier-users'],
    queryFn: getCashierUsers,
    staleTime: 1000 * 60 * 2,
  })

  const { mutateAsync: login, isPending: isLoggingIn } = useMutation({
    mutationFn: signIn,
    onSuccess: () => {
      if (selectedUser) {
        localStorage.setItem('metrics.lastUserId', selectedUser.id)
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
      toast.success(`Bem-vindo, ${selectedUser?.name}!`)
      navigate('/cashier', { replace: true })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Senha incorreta. Tente novamente.')
    },
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !password) return
    await login({ userId: selectedUser.id, password })
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 font-manrope text-slate-100">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        
        {/* Topo / Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shadow-lg">
            <Wallet size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">
              Login do Caixa
            </h1>
            <p className="text-xs font-medium text-slate-400 mt-1">
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
              <div className="p-8 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin text-blue-500" />
                Carregando operadores...
              </div>
            ) : isError ? (
              <div className="p-4 text-center text-xs font-bold text-red-400 space-y-2">
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
              <div className="grid grid-cols-1 gap-3 max-h-[320px] overflow-y-auto pr-1">
                {cashierUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user)
                      setPassword('')
                    }}
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-blue-950/40 hover:border-blue-500/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center justify-center font-black text-sm uppercase">
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

                    <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
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
          <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in duration-200">
            {/* Usuário Selecionado */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-blue-500/30 bg-blue-950/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs uppercase">
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
                className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Trocar
              </button>
            </div>

            {/* Input de Senha */}
            <div className="space-y-2">
              <Label className="text-xs font-extrabold uppercase text-slate-300 block">
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
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoggingIn || !password}
              className="w-full py-6 rounded-2xl bg-blue-600 text-xs font-black uppercase text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
