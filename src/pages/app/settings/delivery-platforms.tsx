import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleSlash,
  Info,
  Pencil,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import {
  createDeliveryPlatform,
  deleteDeliveryPlatform,
  DeliveryPlatform,
  getDeliveryPlatforms,
  SaveDeliveryPlatformBody,
  updateDeliveryPlatform,
} from '@/api/delivery-platforms'
import { getAccounts } from '@/api/get-accounts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { diaOperacional } from '@/lib/dia-operacional'
import { cn } from '@/lib/utils'
import {
  codigoDePlataforma,
  dataDoRepasse,
  diaCurto,
  lerNumero,
  moeda,
  MODELOS_DE_PLATAFORMA,
  numeroParaCampo,
  percentual,
  semanaDoDia,
} from '@/utils/plataformas'

/**
 * Plataformas de entrega (iFood, 99Food), 15/10/2026 (plano 3, decisões D1 e D3 do Thomás): comissão quando a loja entrega,
 * comissão quando a plataforma entrega, taxa do pagamento online, mensalidade (só informativa), semanas até o repasse e a
 * conta do repasse. Mesmo lugar, padrão e proteção da tela de Maquininhas.
 */

const SEM_CONTA = 'none'

interface Formulario {
  name: string
  code: string
  codeEditado: boolean
  accountId: string
  comissaoLoja: string
  comissaoPlataforma: string
  taxaOnline: string
  mensalidade: number
  semanas: string
  active: boolean
}

const formularioVazio: Formulario = {
  name: '',
  code: '',
  codeEditado: false,
  accountId: SEM_CONTA,
  comissaoLoja: '',
  comissaoPlataforma: '',
  taxaOnline: '',
  mensalidade: 0,
  semanas: '1',
  active: true,
}

/** O que falta para salvar (o botão diz); vazio = pode salvar. */
function oQueFalta(f: Formulario): string {
  if (!f.name.trim()) return 'Informe o nome'
  if (!codigoDePlataforma(f.code)) return 'Informe o código'
  for (const [rotulo, valor] of [
    ['A comissão da entrega da loja', f.comissaoLoja],
    ['A comissão da entrega da plataforma', f.comissaoPlataforma],
    ['A taxa do pagamento online', f.taxaOnline],
  ] as const) {
    const n = lerNumero(valor)
    if (n < 0 || n > 100) return `${rotulo} vai de 0 a 100%`
  }
  const semanas = Number(f.semanas)
  if (!Number.isInteger(semanas) || semanas < 1 || semanas > 12)
    return 'Semanas até o repasse: de 1 a 12'
  return ''
}

function textoDoRepasse(semanas: number): string {
  if (semanas <= 1) return 'quarta-feira seguinte à semana'
  return `quarta-feira, ${semanas} semanas depois`
}

export function DeliveryPlatformsSettings() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Formulario>(formularioVazio)
  const [paraExcluir, setParaExcluir] = useState<DeliveryPlatform | null>(null)

  const { data: platforms, isLoading } = useQuery({
    queryKey: ['delivery-platforms'],
    queryFn: getDeliveryPlatforms,
  })

  const { data: accountsResult } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })

  // A Conta de Transação não é escolha: sem conta o repasse já espera nela (e a liquidação a recusa como destino)
  const contas = useMemo(
    () =>
      (accountsResult?.accounts || []).filter(
        (a: any) => !a.is_transit,
      ),
    [accountsResult],
  )

  // Exemplo da data do repasse com a semana de hoje (dia operacional de Brasília)
  const hoje = diaOperacional()
  const semanaAtual = semanaDoDia(hoje)

  const { mutate: savePlatform, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const body: SaveDeliveryPlatformBody = {
        name: form.name.trim(),
        code: codigoDePlataforma(form.code),
        account_id: form.accountId === SEM_CONTA ? null : form.accountId,
        commission_own_delivery_pct: lerNumero(form.comissaoLoja),
        commission_platform_delivery_pct: lerNumero(form.comissaoPlataforma),
        online_payment_fee_pct: lerNumero(form.taxaOnline),
        monthly_fee: form.mensalidade || 0,
        payout_weeks_after: Number(form.semanas),
        active: form.active,
      }
      return editingId
        ? updateDeliveryPlatform({ id: editingId, ...body })
        : createDeliveryPlatform(body)
    },
    onSuccess: (salva) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-platforms'] })
      queryClient.invalidateQueries({ queryKey: ['payment-identifiers'] })
      toast.success(
        editingId
          ? `${salva?.name || 'Plataforma'} atualizada.`
          : `${salva?.name || 'Plataforma'} cadastrada.`,
      )
      handleCloseModal()
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'Não deu para salvar a plataforma.',
      )
    },
  })

  const { mutate: removePlatform, isPending: isRemoving } = useMutation({
    mutationFn: deleteDeliveryPlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-platforms'] })
      queryClient.invalidateQueries({ queryKey: ['payment-identifiers'] })
      toast.success('Plataforma excluída.')
      setParaExcluir(null)
    },
    onError: (err: any) => {
      // 409 PLATFORM_IN_USE: já tem repasse/comissão lançados; a nuvem diz para desativar
      toast.error(
        err?.response?.data?.message || 'Não deu para excluir a plataforma.',
      )
      setParaExcluir(null)
    },
  })

  const codigosCadastrados = new Set((platforms || []).map((p) => p.code))
  const modelosDisponiveis = MODELOS_DE_PLATAFORMA.filter(
    (m) => !codigosCadastrados.has(m.code),
  )

  function handleOpenCreate() {
    setEditingId(null)
    setForm(formularioVazio)
    setIsModalOpen(true)
  }

  function handleOpenEdit(p: DeliveryPlatform) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      code: p.code,
      codeEditado: true,
      accountId: p.account_id || SEM_CONTA,
      comissaoLoja: numeroParaCampo(p.commission_own_delivery_pct),
      comissaoPlataforma: numeroParaCampo(p.commission_platform_delivery_pct),
      taxaOnline: numeroParaCampo(p.online_payment_fee_pct),
      mensalidade: p.monthly_fee || 0,
      semanas: String(p.payout_weeks_after || 1),
      active: p.active,
    })
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingId(null)
    setForm(formularioVazio)
  }

  function usarModelo(m: (typeof MODELOS_DE_PLATAFORMA)[number]) {
    setForm((f) => ({
      ...f,
      name: m.name,
      code: m.code,
      codeEditado: true,
      comissaoLoja: numeroParaCampo(m.commission_own_delivery_pct),
      comissaoPlataforma: numeroParaCampo(m.commission_platform_delivery_pct),
      taxaOnline: numeroParaCampo(m.online_payment_fee_pct),
      semanas: String(m.payout_weeks_after),
    }))
  }

  const falta = oQueFalta(form)
  const semanasDoForm = Math.min(12, Math.max(1, Number(form.semanas) || 1))
  const exemploRepasse = dataDoRepasse(hoje, semanasDoForm)

  // Simulação de um pedido de R$ 100 pago no app, entrega da loja
  const simulacaoTaxa =
    (100 * (lerNumero(form.comissaoLoja) + lerNumero(form.taxaOnline))) / 100

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <ShoppingBag className="h-8 w-8 text-primary" />
            Plataformas de entrega
          </h1>
          <p className="text-sm text-muted-foreground">
            iFood, 99Food e outras: comissões, taxa do pagamento online e
            quando o repasse cai.
          </p>
        </div>

        <Button
          size="lg"
          onClick={handleOpenCreate}
          className="min-h-11 bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25 transition-all hover:to-primary active:scale-95"
        >
          <Plus className="mr-2 h-5 w-5" /> Nova plataforma
        </Button>
      </div>

      {/* Como a data do repasse é calculada (uma linha, com o exemplo da semana de hoje) */}
      <div className="flex items-start gap-2 rounded-xl border bg-muted/30 p-3 text-sm text-foreground">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          <strong>Data do repasse:</strong> a quarta-feira depois da semana da
          venda (segunda a domingo), mais N−1 semanas. Ex.: vendas de{' '}
          {diaCurto(semanaAtual.segunda)} a {diaCurto(semanaAtual.domingo)} → 1
          semana = {diaCurto(dataDoRepasse(hoje, 1))}; 4 semanas ={' '}
          {diaCurto(dataDoRepasse(hoje, 4))}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-4 rounded-2xl border bg-card p-6">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))
        ) : (platforms || []).length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhuma plataforma cadastrada. Clique em "Nova plataforma" para
            cadastrar o iFood ou o 99Food.
          </div>
        ) : (
          platforms?.map((p) => {
            const conta =
              p.account ||
              accountsResult?.accounts?.find((a) => a.id === p.account_id)
            const identificadores = (p.identifiers || []).filter(
              (i) => i.active !== false,
            )

            return (
              <div
                key={p.id}
                className={cn(
                  'flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md sm:p-6',
                  !p.active && 'opacity-80',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight">
                      <span className="break-words">{p.name}</span>
                      <Badge
                        variant="outline"
                        className="font-mono text-xs font-semibold"
                      >
                        {p.code}
                      </Badge>
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                      {p.active ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> Ativa
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                          <CircleSlash className="h-4 w-4" /> Desativada
                        </span>
                      )}
                      {conta ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        >
                          <Wallet className="mr-1 h-3 w-3" />
                          {conta.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          Conta de Transação até escolher
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenEdit(p)}
                      className="h-11 w-11 text-muted-foreground hover:text-foreground"
                      aria-label={`Editar ${p.name}`}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setParaExcluir(p)}
                      className="h-11 w-11 text-muted-foreground hover:text-red-600"
                      aria-label={`Excluir ${p.name}`}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 rounded-xl bg-muted/40 p-3 text-sm sm:grid-cols-3">
                  <div className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2 sm:flex-col sm:items-start">
                    <span className="text-muted-foreground">Loja entrega</span>
                    <span className="font-mono font-bold">
                      {percentual(p.commission_own_delivery_pct)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2 sm:flex-col sm:items-start">
                    <span className="text-muted-foreground">
                      Plataforma entrega
                    </span>
                    <span className="font-mono font-bold">
                      {percentual(p.commission_platform_delivery_pct)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2 sm:flex-col sm:items-start">
                    <span className="text-muted-foreground">Pago no app</span>
                    <span className="font-mono font-bold">
                      +{percentual(p.online_payment_fee_pct)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      Repasse na {textoDoRepasse(p.payout_weeks_after)}
                    </span>
                  </p>
                  {p.monthly_fee > 0 && (
                    <p className="pl-6 text-muted-foreground">
                      Mensalidade {moeda(p.monthly_fee)} (só informativa)
                    </p>
                  )}
                  {identificadores.length > 0 ? (
                    <p className="flex items-center gap-2">
                      <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 break-words">
                        Identificador:{' '}
                        {identificadores.map((i) => i.name).join(', ')}
                      </span>
                    </p>
                  ) : (
                    <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Sem identificador ligado: o PDV não sabe qual venda
                        paga no app é desta plataforma.{' '}
                        <Link
                          to="/settings/payment-identifiers"
                          className="font-semibold underline underline-offset-2"
                        >
                          Ligar em Identificadores
                        </Link>
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Cadastro / edição */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => (open ? setIsModalOpen(true) : handleCloseModal())}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              {editingId ? `Editar ${form.name || 'plataforma'}` : 'Nova plataforma'}
            </DialogTitle>
            <DialogDescription>
              As taxas valem para as próximas conferências de caixa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {!editingId && modelosDisponiveis.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Começar com:
                </span>
                {modelosDisponiveis.map((m) => (
                  <Button
                    key={m.code}
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => usarModelo(m)}
                  >
                    {m.name}
                  </Button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plat-name">Nome</Label>
                <Input
                  id="plat-name"
                  placeholder="Ex.: iFood"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setForm((f) => ({
                      ...f,
                      name,
                      code: f.codeEditado ? f.code : codigoDePlataforma(name),
                    }))
                  }}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plat-code">Código</Label>
                <Input
                  id="plat-code"
                  placeholder="Ex.: IFOOD"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                      codeEditado: true,
                    }))
                  }
                  className="h-11 font-mono text-base"
                  autoCapitalize="characters"
                />
                <p className="text-xs text-muted-foreground">
                  O PDV reconhece a plataforma por ele (IFOOD, 99FOOD).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plat-account">Conta do repasse</Label>
              <Select
                value={form.accountId}
                onValueChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
              >
                <SelectTrigger id="plat-account" className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_CONTA}>
                    Conta de Transação até escolher
                  </SelectItem>
                  {contas.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sem conta, o repasse espera na Conta de Transação e você escolhe
                a conta ao liquidar.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoPercentual
                id="plat-own"
                rotulo="Comissão quando a loja entrega"
                valor={form.comissaoLoja}
                onChange={(v) => setForm((f) => ({ ...f, comissaoLoja: v }))}
              />
              <CampoPercentual
                id="plat-platform"
                rotulo="Comissão quando a plataforma entrega"
                valor={form.comissaoPlataforma}
                onChange={(v) =>
                  setForm((f) => ({ ...f, comissaoPlataforma: v }))
                }
              />
              <CampoPercentual
                id="plat-online"
                rotulo="Taxa do pagamento online"
                ajuda="Só nas vendas pagas no app."
                valor={form.taxaOnline}
                onChange={(v) => setForm((f) => ({ ...f, taxaOnline: v }))}
              />
              <div className="space-y-2">
                <Label htmlFor="plat-fee">Mensalidade (R$)</Label>
                <CurrencyInput
                  id="plat-fee"
                  value={form.mensalidade}
                  onValueChange={(n) =>
                    setForm((f) => ({ ...f, mensalidade: n }))
                  }
                  className="h-11 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Só informativa: não entra em nenhuma conta.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plat-weeks">Semanas até o repasse</Label>
              <Input
                id="plat-weeks"
                type="number"
                inputMode="numeric"
                min={1}
                max={12}
                value={form.semanas}
                onChange={(e) =>
                  setForm((f) => ({ ...f, semanas: e.target.value }))
                }
                className="h-11 w-32 text-base"
              />
              <p className="text-xs text-muted-foreground">
                Vendas desta semana ({diaCurto(semanaAtual.segunda)} a{' '}
                {diaCurto(semanaAtual.domingo)}) → repasse na quarta,{' '}
                {diaCurto(exemploRepasse)}. iFood: 4; 99Food: 1.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
              <div>
                <Label htmlFor="plat-active" className="cursor-pointer">
                  Ativa
                </Label>
                <p className="text-xs text-muted-foreground">
                  Já tem repasse lançado? Desative em vez de excluir.
                </p>
              </div>
              <Switch
                id="plat-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Pedido de R$ 100,00 pago no app, entrega da loja: a plataforma
                fica com {moeda(simulacaoTaxa)} e repassa{' '}
                <strong>{moeda(100 - simulacaoTaxa)}</strong>.
              </span>
            </p>

            <Button
              onClick={() => savePlatform()}
              disabled={isSaving || Boolean(falta)}
              size="lg"
              className="min-h-11 w-full"
            >
              {isSaving
                ? 'Salvando...'
                : falta ||
                  (editingId ? 'Salvar alterações' : 'Cadastrar plataforma')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excluir: só sem repasse lançado (a nuvem recusa com 409 e manda desativar) */}
      <AlertDialog
        open={Boolean(paraExcluir)}
        onOpenChange={(open) => !open && setParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {paraExcluir?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Só dá para excluir a plataforma que ainda não tem repasse lançado.
              Se já tiver, desative em vez de excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 bg-red-600 hover:bg-red-700"
              disabled={isRemoving}
              onClick={(e) => {
                e.preventDefault()
                if (paraExcluir) removePlatform(paraExcluir.id)
              }}
            >
              {isRemoving ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CampoPercentual({
  id,
  rotulo,
  ajuda,
  valor,
  onChange,
}: {
  id: string
  rotulo: string
  ajuda?: string
  valor: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          placeholder="0"
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
          className="h-11 pr-8 font-mono text-base"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
          %
        </span>
      </div>
      {ajuda && <p className="text-xs text-muted-foreground">{ajuda}</p>}
    </div>
  )
}
