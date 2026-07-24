import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock, UserCheck, KeyRound, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { getCashierUsers, CashierUser } from '@/api/cashier/get-cashier-users'
import { signIn } from '@/api/sign-in'

export function CashierLoginDialog({ onSuccess }: { onSuccess?: () => void }) {
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
      if (onSuccess) onSuccess()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 space-y-6">
        
        {/* Topo do Modal */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center font-bold shadow-inner">
            <Lock size={22} />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
            Acesso ao Caixa
          </h2>
          <p className="text-xs font-medium text-slate-500">
            Selecione seu usuário operador para entrar na conferência de caixa.
          </p>
        </div>

        {/* Seleção de Operador / Input de Senha */}
        {!selectedUser ? (
          <div className="space-y-3">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
              Operadores Autorizados
            </span>

            {isLoading ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-blue-600" />
                Carregando operadores...
              </div>
            ) : isError ? (
              <div className="p-4 text-center text-xs font-bold text-red-500 space-y-2">
                <p>Erro ao carregar operadores do caixa.</p>
                <button
                  onClick={() => refetch()}
                  className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-[10px] font-black uppercase"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : cashierUsers.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                {cashierUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user)
                      setPassword('')
                    }}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/50 hover:border-blue-300 transition-all text-left group dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center font-black text-xs uppercase">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600">
                          {user.name}
                        </span>
                        <span className="block text-[10px] font-medium text-slate-400">
                          {user.email}
                        </span>
                      </div>
                    </div>

                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
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
          <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in duration-200">
            {/* Usuário Selecionado */}
            <div className="flex items-center justify-between p-3 rounded-2xl border border-blue-200 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs uppercase">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-100">
                    {selectedUser.name}
                  </span>
                  <span className="block text-[9px] font-medium text-slate-500">
                    {selectedUser.email}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Alterar
              </button>
            </div>

            {/* Input de Senha */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 block ml-1">
                Digite sua Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 pl-10 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900"
                />
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || !password}
              className="w-full py-3.5 rounded-2xl bg-blue-600 text-xs font-black uppercase text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Entrando...
                </>
              ) : (
                <>
                  <UserCheck size={16} /> Entrar no Caixa
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
