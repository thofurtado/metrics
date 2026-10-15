import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Landmark,
  Loader2,
  ShoppingBag,
  Undo2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { getAccounts } from '@/api/get-accounts'
import { getProfile } from '@/api/get-profile'
import {
  getPlatformSettlements,
  PlatformSettlementGroup,
  PlatformSettlementTransaction,
  revertPlatformSettlement,
  settlePlatformPayout,
} from '@/api/platform-settlements'
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
import { diaOperacional } from '@/lib/dia-operacional'
import { cn } from '@/lib/utils'
import { diaBR, diaDaSemana, moeda } from '@/utils/plataformas'

/**
 * Liquidações > Plataformas (15/10/2026, plano 2.3 e 3): o repasse do iFood/99Food de cada data, com a receita prevista
 * (o que foi pago no app, valor cheio) e as comissões. Baixar digitando o que caiu no banco: o repasse e as comissões da
 * mesma plataforma e data, de todos os caixas, vão juntos; a diferença vira um ajuste com motivo. Desfazer volta tudo.
 */

const MOTIVOS_RAPIDOS = ['Promoção', 'Estorno', 'Cancelamento', 'Taxa extra']

const centavos = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

function situacaoDaData(payoutDate: string, hoje: string) {
  if (payoutDate < hoje)
    return {
      texto: 'Atrasado',
      classe:
        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    }
  if (payoutDate === hoje)
    return {
      texto: 'Hoje',
      classe:
        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    }
  const [a1, m1, d1] = hoje.split('-').map(Number)
  const [a2, m2, d2] = payoutDate.split('-').map(Number)
  const dias = Math.round(
    (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000,
  )
  return {
    texto: dias === 1 ? 'Amanhã' : `Em ${dias} dias`,
    classe:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }
}

function nomeDaPlataforma(g: PlatformSettlementGroup) {
  return g.plataforma?.name || 'Plataforma removida'
}

function ListaDeLancamentos({
  titulo,
  itens,
  sinal,
}: {
  titulo: string
  itens: PlatformSettlementTransaction[]
  sinal: '+' | '−'
}) {
  if (itens.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </p>
      {itens.map((t) => (
        <div
          key={t.id}
          className="flex items-start justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <span className="min-w-0 break-words text-muted-foreground">
            {(t.description || '').replace(/\s*\[DEST:[^\]]*\]/g, '')}
          </span>
          <span className="shrink-0 font-mono font-semibold">
            {sinal} {moeda(t.totalValue ?? t.amount)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PlatformPayoutsTab({
  month,
  year,
  monthName,
}: {
  month: number
  year: number
  monthName: string
}) {
  const queryClient = useQueryClient()
  const hoje = diaOperacional()
  const [aberto, setAberto] = useState<Record<string, boolean>>({})
  const [paraBaixar, setParaBaixar] = useState<PlatformSettlementGroup | null>(
    null,
  )
  const [paraDesfazer, setParaDesfazer] =
    useState<PlatformSettlementGroup | null>(null)

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: Infinity,
  })
  const isAdmin = profile?.role === 'ADMIN'

  // Pendentes: todos (o repasse do iFood cai 4 semanas depois; não some por estar em outro mês)
  const { data: pendentes, isLoading: carregandoPendentes } = useQuery({
    queryKey: ['platform-settlements', 'pending'],
    queryFn: () => getPlatformSettlements({ status: 'pending' }),
  })

  // Liquidados: os do mês escolhido (pela data do repasse)
  const { data: liquidados, isLoading: carregandoLiquidados } = useQuery({
    queryKey: ['platform-settlements', 'settled', month, year],
    queryFn: () => getPlatformSettlements({ status: 'settled', month, year }),
  })

  const { data: accountsResult } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })
  const contas = useMemo(
    () => (accountsResult?.accounts || []).filter((a: any) => !a.is_transit),
    [accountsResult],
  )
  const nomeDaConta = (id: string | null | undefined) =>
    accountsResult?.accounts?.find((a) => a.id === id)?.name

  const totalPendente = (pendentes || []).reduce(
    (acc, g) => acc + Number(g.previsto || 0),
    0,
  )

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ['platform-settlements'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }

  const { mutate: desfazer, isPending: desfazendo } = useMutation({
    mutationFn: revertPlatformSettlement,
    onSuccess: (r) => {
      toast.success(
        r?.message ||
          'Liquidação desfeita: o repasse e as comissões voltaram a pendentes.',
      )
      invalidar()
      setParaDesfazer(null)
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'Não deu para desfazer a liquidação.',
      )
      setParaDesfazer(null)
    },
  })

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="flex flex-col gap-2 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 text-sm text-violet-950 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-100 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2">
          <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            O repasse e as comissões de cada plataforma e data se baixam
            juntos. Digite o que caiu no banco.
          </span>
        </p>
        <p className="shrink-0 font-semibold">
          A receber:{' '}
          <span className="font-mono text-base">{moeda(totalPendente)}</span>
        </p>
      </div>

      {/* A RECEBER */}
      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
          A receber ({(pendentes || []).length})
        </h3>
        {carregandoPendentes ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white p-8 text-sm text-slate-500 dark:bg-slate-900">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando repasses...
          </div>
        ) : (pendentes || []).length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
            Nenhum repasse de plataforma a receber.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {(pendentes || []).map((g) => {
              const sit = situacaoDaData(g.payout_date, hoje)
              const chave = `p-${g.chave}`
              const qtd = g.receitas.length + g.comissoes.length
              return (
                <div
                  key={g.chave}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {nomeDaPlataforma(g)}
                      </p>
                      <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <CalendarClock className="h-4 w-4" />
                        <span>
                          Repasse de {diaDaSemana(g.payout_date)},{' '}
                          {diaBR(g.payout_date)}
                        </span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-xs font-bold',
                            sit.classe,
                          )}
                        >
                          {sit.texto}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {g.caixas.length === 1
                          ? '1 caixa'
                          : `${g.caixas.length} caixas`}
                        {g.plataforma?.account_id
                          ? ` · cai em ${nomeDaConta(g.plataforma.account_id) || 'conta da plataforma'}`
                          : ' · conta a escolher'}
                      </p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950">
                    <div>
                      <dt className="text-xs text-slate-500">Receita prevista</dt>
                      <dd className="font-mono font-semibold">
                        {moeda(g.total_receitas)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Comissões</dt>
                      <dd className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                        − {moeda(g.total_comissoes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Líquido previsto</dt>
                      <dd className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400">
                        {moeda(g.previsto)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAberto((a) => ({ ...a, [chave]: !a[chave] }))
                      }
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-expanded={Boolean(aberto[chave])}
                    >
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          aberto[chave] && 'rotate-180',
                        )}
                      />
                      Ver lançamentos ({qtd})
                    </button>
                    <Button
                      className="min-h-11 gap-1.5 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                      disabled={!isAdmin || !g.plataforma}
                      title={
                        !isAdmin
                          ? 'Só o administrador baixa o repasse'
                          : undefined
                      }
                      onClick={() => setParaBaixar(g)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isAdmin ? 'Baixar' : 'Só o administrador baixa'}
                    </Button>
                  </div>

                  {aberto[chave] && (
                    <div className="space-y-3 border-t pt-3">
                      <ListaDeLancamentos
                        titulo="Receita (pago no app)"
                        itens={g.receitas}
                        sinal="+"
                      />
                      <ListaDeLancamentos
                        titulo="Comissões"
                        itens={g.comissoes}
                        sinal="−"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* LIQUIDADOS NO MÊS */}
      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Liquidados em {monthName} de {year} ({(liquidados || []).length})
        </h3>
        {carregandoLiquidados ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white p-8 text-sm text-slate-500 dark:bg-slate-900">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (liquidados || []).length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
            Nenhum repasse de plataforma liquidado em {monthName}.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {(liquidados || []).map((g) => {
              const recebido = Number(g.recebido ?? g.previsto)
              const diferenca = centavos(recebido - Number(g.previsto || 0))
              const contaId =
                g.receitas[0]?.account_id || g.comissoes[0]?.account_id
              const chave = `l-${g.chave}`
              return (
                <div
                  key={g.chave}
                  className="flex flex-col gap-3 rounded-2xl border border-emerald-200/70 bg-white p-4 shadow-sm dark:border-emerald-900/40 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-lg font-black tracking-tight">
                        {nomeDaPlataforma(g)}
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> Liquidado
                        </span>
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Repasse de {diaBR(g.payout_date)}
                        {contaId && nomeDaConta(contaId)
                          ? ` · em ${nomeDaConta(contaId)}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950">
                    <div>
                      <dt className="text-xs text-slate-500">Previsto</dt>
                      <dd className="font-mono font-semibold">
                        {moeda(g.previsto)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Caiu no banco</dt>
                      <dd className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400">
                        {moeda(recebido)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Diferença</dt>
                      <dd
                        className={cn(
                          'font-mono font-semibold',
                          diferenca < 0 && 'text-rose-700 dark:text-rose-400',
                          diferenca > 0 &&
                            'text-emerald-700 dark:text-emerald-400',
                        )}
                      >
                        {diferenca === 0
                          ? 'Nenhuma'
                          : `${diferenca > 0 ? '+' : '−'} ${moeda(Math.abs(diferenca))}`}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAberto((a) => ({ ...a, [chave]: !a[chave] }))
                      }
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-expanded={Boolean(aberto[chave])}
                    >
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          aberto[chave] && 'rotate-180',
                        )}
                      />
                      Ver lançamentos
                    </button>
                    <Button
                      variant="outline"
                      className="min-h-11 gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-900 dark:text-orange-300"
                      disabled={!isAdmin || !g.settlement_id}
                      onClick={() => setParaDesfazer(g)}
                    >
                      <Undo2 className="h-4 w-4" />
                      Desfazer
                    </Button>
                  </div>

                  {aberto[chave] && (
                    <div className="space-y-3 border-t pt-3">
                      <ListaDeLancamentos
                        titulo="Receita (pago no app)"
                        itens={g.receitas}
                        sinal="+"
                      />
                      <ListaDeLancamentos
                        titulo="Comissões"
                        itens={g.comissoes}
                        sinal="−"
                      />
                      <ListaDeLancamentos
                        titulo="Ajuste da diferença"
                        itens={g.ajustes}
                        sinal={diferenca >= 0 ? '+' : '−'}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <BaixarRepasseDialog
        grupo={paraBaixar}
        contas={contas}
        onClose={() => setParaBaixar(null)}
        onBaixado={() => {
          invalidar()
          setParaBaixar(null)
        }}
      />

      <AlertDialog
        open={Boolean(paraDesfazer)}
        onOpenChange={(open) => !open && setParaDesfazer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Desfazer a liquidação do {paraDesfazer && nomeDaPlataforma(paraDesfazer)}{' '}
              de {paraDesfazer && diaBR(paraDesfazer.payout_date)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O valor sai da conta, o ajuste da diferença é apagado e o repasse e
              as comissões voltam a pendentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 bg-orange-600 hover:bg-orange-700"
              disabled={desfazendo}
              onClick={(e) => {
                e.preventDefault()
                if (paraDesfazer?.settlement_id)
                  desfazer(paraDesfazer.settlement_id)
              }}
            >
              {desfazendo ? 'Desfazendo...' : 'Desfazer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function BaixarRepasseDialog({
  grupo,
  contas,
  onClose,
  onBaixado,
}: {
  grupo: PlatformSettlementGroup | null
  contas: { id: string; name: string }[]
  onClose: () => void
  onBaixado: () => void
}) {
  const [valor, setValor] = useState(0)
  const [contaId, setContaId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (grupo) {
      setValor(Number(grupo.previsto || 0))
      const daPlataforma = grupo.plataforma?.account_id || ''
      setContaId(contas.some((c) => c.id === daPlataforma) ? daPlataforma : '')
      setMotivo('')
      setErro(null)
    }
  }, [grupo, contas])

  const { mutate: baixar, isPending } = useMutation({
    mutationFn: settlePlatformPayout,
    onSuccess: (r) => {
      toast.success(r?.message || 'Repasse liquidado.')
      onBaixado()
    },
    onError: (err: any) => {
      const code = err?.response?.data?.code
      const msg = err?.response?.data?.message
      if (code === 'ESCOLHA_A_CONTA') setErro(msg || 'Escolha a conta onde o repasse caiu.')
      else if (code === 'MOTIVO_DA_DIFERENCA')
        setErro(msg || 'Diga o motivo da diferença.')
      else setErro(msg || 'Não deu para baixar o repasse. Tente de novo.')
    },
  })

  if (!grupo) return null

  const previsto = Number(grupo.previsto || 0)
  const diferenca = centavos(valor - previsto)
  const temDiferenca = Math.abs(diferenca) >= 0.01
  const falta = !contaId
    ? 'Escolha a conta'
    : temDiferenca && !motivo.trim()
      ? 'Diga o motivo da diferença'
      : ''

  return (
    <Dialog open={Boolean(grupo)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-emerald-600" />
            Baixar repasse do {nomeDaPlataforma(grupo)}
          </DialogTitle>
          <DialogDescription>
            Repasse de {diaDaSemana(grupo.payout_date)},{' '}
            {diaBR(grupo.payout_date)} ·{' '}
            {grupo.caixas.length === 1
              ? '1 caixa'
              : `${grupo.caixas.length} caixas`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <dl className="space-y-1.5 rounded-xl border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between">
              <dt>Receita prevista</dt>
              <dd className="font-mono font-semibold">
                {moeda(grupo.total_receitas)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Comissões</dt>
              <dd className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                − {moeda(grupo.total_comissoes)}
              </dd>
            </div>
            <div className="flex items-end justify-between border-t pt-2">
              <dt className="font-bold">Líquido previsto</dt>
              <dd className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-400">
                {moeda(previsto)}
              </dd>
            </div>
          </dl>

          <div className="space-y-2">
            <Label htmlFor="repasse-valor">Quanto caiu no banco</Label>
            <CurrencyInput
              id="repasse-valor"
              value={valor}
              onValueChange={(n) => {
                setValor(n)
                setErro(null)
              }}
              className="h-12 font-mono text-lg font-bold"
              autoFocus
            />
            {temDiferenca && (
              <p
                className={cn(
                  'flex items-center gap-1.5 text-sm font-semibold',
                  diferenca < 0
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-emerald-700 dark:text-emerald-400',
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                Caiu {moeda(Math.abs(diferenca))}{' '}
                {diferenca < 0 ? 'a menos' : 'a mais'} que o previsto.
              </p>
            )}
          </div>

          {temDiferenca && (
            <div className="space-y-2">
              <Label htmlFor="repasse-motivo">Motivo da diferença</Label>
              <div className="flex flex-wrap gap-2">
                {MOTIVOS_RAPIDOS.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    variant={motivo === m ? 'default' : 'outline'}
                    size="sm"
                    className="min-h-11"
                    onClick={() => {
                      setMotivo(m)
                      setErro(null)
                    }}
                  >
                    {m}
                  </Button>
                ))}
              </div>
              <Input
                id="repasse-motivo"
                value={motivo}
                maxLength={300}
                onChange={(e) => {
                  setMotivo(e.target.value)
                  setErro(null)
                }}
                placeholder="Ex.: promoção do iFood"
                className="h-11 text-base"
              />
              <p className="text-xs text-muted-foreground">
                A diferença vira um ajuste no setor "Taxas de plataforma"
                {diferenca > 0 ? ' (como receita)' : ''}.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="repasse-conta">Conta onde caiu</Label>
            <Select
              value={contaId}
              onValueChange={(v) => {
                setContaId(v)
                setErro(null)
              }}
            >
              <SelectTrigger id="repasse-conta" className="h-11 text-base">
                <SelectValue placeholder="Escolha a conta..." />
              </SelectTrigger>
              <SelectContent>
                {contas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {erro && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {erro}
            </p>
          )}

          <Button
            size="lg"
            className="min-h-11 w-full bg-emerald-600 font-bold text-white hover:bg-emerald-700"
            disabled={isPending || Boolean(falta) || !grupo.plataforma}
            onClick={() =>
              baixar({
                platform_id: grupo.plataforma!.id,
                payout_date: grupo.payout_date,
                received_amount: centavos(valor),
                account_id: contaId,
                ...(temDiferenca ? { reason: motivo.trim() } : {}),
              })
            }
          >
            {isPending
              ? 'Baixando...'
              : falta || `Baixar ${moeda(valor)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
