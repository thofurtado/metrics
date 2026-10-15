import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  deleteClient,
  duplicatePhoneMessage,
  updateClient,
  UpdateClientBody,
} from '@/api/update-client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export interface EditableClient {
  id: string
  name: string
  identification?: string | null
  phone?: string | null
  email?: string | null
  contact?: string | null
  contract?: boolean
}

interface EditClientDialogProps {
  client: EditableClient | null
  onClose: () => void
}

function serverMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || fallback
  )
}

// Fase 4 do Mergulho (16:A7): corrigir o cadastro do cliente (nome, telefone, documento) e excluir o cadastro feito por
// engano. A nuvem só exclui cliente sem nenhum histórico (O.S., equipamento, conta a prazo, caixa, pedido).
export function EditClientDialog({ client, onClose }: EditClientDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    identification: '',
    email: '',
    contact: '',
    contract: false,
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || '',
        phone: client.phone || '',
        identification: client.identification || '',
        email: client.email || '',
        contact: client.contact || '',
        contract: !!client.contract,
      })
      setConfirmDelete(false)
    }
  }, [client])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['clients-fleet'] })
    queryClient.invalidateQueries({ queryKey: ['clients'] })
  }

  const { mutateAsync: save, isPending: isSaving } = useMutation({
    mutationFn: (body: UpdateClientBody) => updateClient(client!.id, body),
  })
  const { mutateAsync: remove, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteClient(client!.id),
  })

  async function handleSave(allowDuplicatePhone = false) {
    if (!form.name.trim()) {
      toast.error('Informe o nome do cliente.')
      return
    }
    try {
      await save({
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, '') || null,
        identification: form.identification.replace(/\D/g, '') || null,
        email: form.email.trim() || null,
        contact: form.contact.trim() || null,
        contract: form.contract,
        allowDuplicatePhone,
      })
      toast.success('Cadastro do cliente atualizado.')
      refresh()
      onClose()
    } catch (err) {
      const duplicated = duplicatePhoneMessage(err)
      if (duplicated && !allowDuplicatePhone) {
        if (window.confirm(`${duplicated} Salvar mesmo assim?`)) {
          await handleSave(true)
        }
        return
      }
      toast.error(serverMessage(err, 'Não foi possível salvar o cadastro.'))
    }
  }

  async function handleDelete() {
    try {
      await remove()
      toast.success('Cadastro do cliente excluído.')
      refresh()
      onClose()
    } catch (err) {
      toast.error(serverMessage(err, 'Não foi possível excluir o cliente.'))
    }
  }

  const busy = isSaving || isDeleting

  return (
    <Dialog open={!!client} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
          <DialogDescription>
            A correção vale também para o PDV na próxima sincronia.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-client-name">Nome</Label>
            <Input
              id="edit-client-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-client-phone">Telefone (com DDD)</Label>
              <Input
                id="edit-client-phone"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-client-doc">CPF ou CNPJ</Label>
              <Input
                id="edit-client-doc"
                inputMode="numeric"
                value={form.identification}
                onChange={(e) =>
                  setForm({ ...form, identification: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-client-email">E-mail</Label>
              <Input
                id="edit-client-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-client-contact">Contato</Label>
              <Input
                id="edit-client-contact"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch
              checked={form.contract}
              onCheckedChange={(checked) =>
                setForm({ ...form, contract: checked })
              }
            />
            Cliente com contrato
          </label>

          {confirmDelete && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              Excluir o cadastro de <strong>{client?.name}</strong>? Só é
              possível quando o cliente não tem nenhum histórico (O.S.,
              equipamento, conta a prazo, caixa ou pedido).
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={busy}
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir de vez'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                  disabled={busy}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            onClick={() => setConfirmDelete(true)}
            disabled={busy || confirmDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir cadastro
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={() => handleSave()} disabled={busy}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
