import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { createQuickClient } from '@/api/get-clients'

interface QuickClientDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (client: { id: string; name: string }) => void
}

export function QuickClientDialog({ isOpen, onClose, onSuccess }: QuickClientDialogProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [identification, setIdentification] = useState('')
  const [phone, setPhone] = useState('')

  const { mutateAsync: saveClient, isPending } = useMutation({
    mutationFn: createQuickClient,
    onSuccess: (data) => {
      toast.success('Cliente cadastrado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      const createdClient = data?.client || data
      if (createdClient && createdClient.id) {
        onSuccess({ id: createdClient.id, name: createdClient.name || name })
      } else {
        onSuccess({ id: name, name })
      }
      onClose()
    },
    onError: () => {
      toast.error('Erro ao cadastrar cliente. Verifique se o CPF/CNPJ já existe.')
    },
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Informe o nome do cliente.')
      return
    }
    await saveClient({
      name: name.trim(),
      identification: identification.trim() || undefined,
      phone: phone.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-900">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <UserPlus size={18} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider">Novo Cliente Rápido</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-black uppercase text-slate-500">
              Nome Completo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João da Silva"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-black uppercase text-slate-500">
                CPF / CNPJ
              </label>
              <input
                type="text"
                value={identification}
                onChange={(e) => setIdentification(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-black uppercase text-slate-500">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 90000-0000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-black uppercase text-white shadow-md transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
            >
              <Check size={14} /> {isPending ? 'Salvando...' : 'Salvar & Selecionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
