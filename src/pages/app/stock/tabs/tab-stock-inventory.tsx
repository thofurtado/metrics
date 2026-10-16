import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Check,
  Loader2,
  Minus,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  applyInventorySession,
  getActiveInventorySession,
  type InventoryItemDTO,
  type MotivoDaContagem,
} from '@/api/stock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import {
  formatarDataHora,
  formatarQuantidade,
  mensagemDoErro,
} from '../components/formatos-do-estoque'

const MOTIVOS_DA_FALTA: { value: MotivoDaContagem; label: string }[] = [
  { value: 'AJUSTE_NEGATIVO', label: 'Falta na contagem' },
  { value: 'QUEBRA', label: 'Quebra / avaria' },
  { value: 'PERDA', label: 'Perda / validade' },
  { value: 'CONSUMO_INTERNO', label: 'Consumo interno' },
]

const POR_VEZ = 100

interface TabStockInventoryProps {
  onFinished?: () => void
}

/**
 * Contagem de estoque (etapa 4, 16/10/2026): só itens de verdade. Antes, sem contagem aberta, a tela mostrava gin, cerveja e
 * Red Bull de exemplo, dizia "Estoque atualizado" mesmo quando a nuvem recusava e não mandava o motivo escolhido. Agora cada
 * diferença vai com o motivo e entra no histórico com quem contou.
 */
export function TabStockInventory({ onFinished }: TabStockInventoryProps) {
  const queryClient = useQueryClient()
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [soDiferencas, setSoDiferencas] = useState(false)
  const [mostrar, setMostrar] = useState(POR_VEZ)
  const [contagens, setContagens] = useState<Record<string, string>>({})
  const [motivos, setMotivos] = useState<Record<string, MotivoDaContagem>>({})

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['active-inventory-session'],
    queryFn: getActiveInventorySession,
  })
  const itens: InventoryItemDTO[] = useMemo(() => data?.items ?? [], [data])

  useEffect(() => {
    setContagens({})
    setMotivos({})
  }, [data?.sessionId])

  const lerNumero = (v: string) => Number(v.replace(',', '.'))
  const contado = (item: InventoryItemDTO) => {
    const v = contagens[item.id]
    if (v === undefined) return item.countedQuantity
    const n = lerNumero(v)
    return Number.isFinite(n) && n >= 0 ? n : item.countedQuantity
  }
  const diferenca = (item: InventoryItemDTO) =>
    Number((contado(item) - item.systemQuantity).toFixed(6))

  const categorias = useMemo(
    () =>
      [...new Set(itens.map((i) => i.category))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      ),
    [itens],
  )
  const comDiferenca = itens.filter((i) => diferenca(i) !== 0)

  const filtrados = itens.filter((i) => {
    const t = texto.trim().toLowerCase()
    if (t && !i.name.toLowerCase().includes(t)) return false
    if (categoria !== 'Todas' && i.category !== categoria) return false
    if (soDiferencas && diferenca(i) === 0) return false
    return true
  })

  const aplicar = useMutation({
    mutationFn: () => {
      if (!data?.sessionId) throw new Error('sem contagem')
      const mudados = itens.filter(
        (i) => contagens[i.id] !== undefined || diferenca(i) !== 0,
      )
      return applyInventorySession(
        data.sessionId,
        mudados.map((i) => ({
          itemId: i.id,
          countedQuantity: contado(i),
          reason:
            diferenca(i) < 0
              ? motivos[i.id] ?? 'AJUSTE_NEGATIVO'
              : diferenca(i) > 0
                ? 'AJUSTE_POSITIVO'
                : null,
        })),
      )
    },
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['active-inventory-session'] })
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] })
      queryClient.invalidateQueries({ queryKey: ['stock-history'] })
      onFinished?.()
    },
    onError: (err: unknown) => {
      toast.error(
        mensagemDoErro(
          err,
          'Não foi possível aplicar a contagem. Nada mudou; tente de novo.',
        ),
      )
    },
  })

  const passo = (item: InventoryItemDTO, delta: number) => {
    const n = Math.max(0, Number((contado(item) + delta).toFixed(3)))
    setContagens((c) => ({ ...c, [item.id]: String(n).replace('.', ',') }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border p-8 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Abrindo a
        contagem...
      </div>
    )
  }
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
        <span className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4" aria-hidden /> Não foi possível abrir
          a contagem.
        </span>
        <Button variant="outline" className="h-11" onClick={() => refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }
  if (!data?.sessionId || itens.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center">
        <p className="text-base font-semibold">
          Nenhum produto ou insumo para contar.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre produtos ou insumos em Mercadorias.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-28">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Contagem de estoque
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Aberta em{' '}
          {data.openedAt
            ? `${formatarDataHora(data.openedAt).data} às ${formatarDataHora(data.openedAt).hora}`
            : '—'}{' '}
          · {itens.length.toLocaleString('pt-BR')} itens · digite o que tem na
          prateleira; o que não mudar fica como está.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end">
        <div className="min-w-0">
          <label
            htmlFor="contagem-busca"
            className="mb-1 block text-sm font-semibold"
          >
            Procurar
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="contagem-busca"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value)
                setMostrar(POR_VEZ)
              }}
              className="h-11 pl-9 pr-10 text-base"
              placeholder="Nome do item"
            />
            {texto && (
              <button
                type="button"
                onClick={() => setTexto('')}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Limpar a procura"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
        <div>
          <label
            htmlFor="contagem-categoria"
            className="mb-1 block text-sm font-semibold"
          >
            Categoria
          </label>
          <Select
            value={categoria}
            onValueChange={(v) => {
              setCategoria(v)
              setMostrar(POR_VEZ)
            }}
          >
            <SelectTrigger id="contagem-categoria" className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          aria-pressed={soDiferencas}
          onClick={() => setSoDiferencas(!soDiferencas)}
          className={cn(
            'min-h-11 rounded-lg border px-4 text-sm font-semibold transition-colors',
            soDiferencas
              ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
              : 'bg-background hover:bg-muted',
          )}
        >
          Só com diferença ({comDiferenca.length})
        </button>
      </div>

      <ul className="divide-y rounded-xl border">
        {filtrados.slice(0, mostrar).map((item) => {
          const d = diferenca(item)
          return (
            <li
              key={item.id}
              className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_9rem_13rem_10rem_13rem] md:items-center"
            >
              <div className="min-w-0">
                <p className="break-words font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.type === 'SUPPLY' ? 'Insumo' : 'Produto'} ·{' '}
                  {item.category}
                </p>
              </div>
              <div className="text-sm md:text-right">
                <span className="text-muted-foreground">No sistema </span>
                <strong>
                  {formatarQuantidade(item.systemQuantity, item.unit)}
                </strong>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-11 shrink-0 p-0"
                  onClick={() => passo(item, -1)}
                  aria-label={`Menos 1 ${item.unit}`}
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </Button>
                <Input
                  inputMode="decimal"
                  aria-label={`Contado de ${item.name}`}
                  value={
                    contagens[item.id] ??
                    String(item.countedQuantity).replace('.', ',')
                  }
                  onChange={(e) =>
                    setContagens((c) => ({ ...c, [item.id]: e.target.value }))
                  }
                  className="h-11 min-w-0 text-center text-base font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-11 shrink-0 p-0"
                  onClick={() => passo(item, 1)}
                  aria-label={`Mais 1 ${item.unit}`}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <div className="text-sm font-semibold md:text-right">
                {d === 0 ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Check className="h-4 w-4" aria-hidden /> Confere
                  </span>
                ) : d < 0 ? (
                  <span className="text-rose-700 dark:text-rose-400">
                    Falta {formatarQuantidade(Math.abs(d), item.unit)}
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Sobra {formatarQuantidade(d, item.unit)}
                  </span>
                )}
              </div>
              <div>
                {d < 0 && (
                  <Select
                    value={motivos[item.id] ?? 'AJUSTE_NEGATIVO'}
                    onValueChange={(v) =>
                      setMotivos((m) => ({
                        ...m,
                        [item.id]: v as MotivoDaContagem,
                      }))
                    }
                  >
                    <SelectTrigger
                      className="h-11"
                      aria-label={`Motivo da falta de ${item.name}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOTIVOS_DA_FALTA.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </li>
          )
        })}
        {filtrados.length === 0 && (
          <li className="p-6 text-center text-sm text-muted-foreground">
            Nenhum item com este filtro.
          </li>
        )}
      </ul>
      {filtrados.length > mostrar && (
        <Button
          variant="outline"
          className="h-11 w-full"
          onClick={() => setMostrar((m) => m + POR_VEZ)}
        >
          Mostrar mais {Math.min(POR_VEZ, filtrados.length - mostrar)} de{' '}
          {filtrados.length - mostrar}
        </Button>
      )}

      {/* Barra fixa: uma ação principal */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur lg:pl-[280px]">
        <div className="mx-auto flex max-w-[1700px] flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold">
            {comDiferenca.length === 0
              ? 'Nenhuma diferença ainda.'
              : `${comDiferenca.length} item(ns) com diferença`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => {
                setContagens({})
                setMotivos({})
              }}
              disabled={aplicar.isPending}
            >
              Desfazer o digitado
            </Button>
            <Button
              className="h-11 flex-1 bg-emerald-600 font-bold text-white hover:bg-emerald-700 sm:flex-none"
              onClick={() => aplicar.mutate()}
              disabled={aplicar.isPending}
            >
              {aplicar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
              {aplicar.isPending ? 'Aplicando...' : 'Aplicar a contagem'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
