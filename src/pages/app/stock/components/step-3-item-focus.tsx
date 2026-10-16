import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  CornerDownLeft,
  Link2,
  Package,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { searchStockItems, type StockItemOption } from '@/api/stock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { StockIntakeItem } from '../use-stock-intake-draft'

interface Step3ItemFocusProps {
  item: StockIntakeItem
  currentIndex: number
  totalItems: number
  allItems: StockIntakeItem[]
  supplierName: string
  nfeNumber?: string
  onValidateItem: (updated: Partial<StockIntakeItem>, advance?: boolean) => void
  onSelectIndex: (index: number) => void
  onBack: () => void
}

const lerNumero = (v: string) => Number(v.replace(',', '.'))
const mostrar = (n: number) =>
  n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })

/** Escolher o produto ou insumo do Metrics em que o item da nota entra (o vínculo fica guardado para as próximas notas). */
function EscolherDestino({
  onEscolher,
  sugestao,
}: {
  onEscolher: (o: StockItemOption) => void
  sugestao: string
}) {
  const [texto, setTexto] = useState(sugestao)
  const [busca, setBusca] = useState(sugestao.trim())
  useEffect(() => {
    const t = setTimeout(() => setBusca(texto.trim()), 300)
    return () => clearTimeout(t)
  }, [texto])
  const { data: opcoes = [], isFetching } = useQuery({
    queryKey: ['stock-items-search', busca],
    queryFn: () => searchStockItems(busca),
    enabled: busca.length >= 2 || /^\d+$/.test(busca),
  })
  return (
    <div className="space-y-2">
      <label
        htmlFor="destino-busca"
        className="block text-sm font-bold text-slate-900 dark:text-white"
      >
        Produto ou insumo do Metrics
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <Input
          id="destino-busca"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="h-11 pl-9 text-base"
          placeholder="Nome ou código"
          autoComplete="off"
        />
      </div>
      {isFetching && opcoes.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Procurando...
        </p>
      )}
      {!isFetching && busca.length >= 2 && opcoes.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Nada com esse nome. Cadastre o insumo na Posição de Estoque ou o
          produto em Mercadorias e volte aqui.
        </p>
      )}
      {opcoes.length > 0 && (
        <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
          {opcoes.map((o) => (
            <li key={`${o.type}-${o.id}`}>
              <button
                type="button"
                onClick={() => onEscolher(o)}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-100 focus:bg-slate-100 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-slate-800"
              >
                <span className="min-w-0 break-words">
                  <span className="font-semibold">
                    {o.code ? `${o.code} · ` : ''}
                    {o.name}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {' '}
                    · {o.type === 'SUPPLY' ? 'insumo' : 'produto'} ({o.unit})
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const Step3ItemFocus: React.FC<Step3ItemFocusProps> = ({
  item,
  currentIndex,
  totalItems,
  allItems,
  supplierName,
  nfeNumber,
  onValidateItem,
  onSelectIndex,
  onBack,
}) => {
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustedQty, setAdjustedQty] = useState(String(item.quantidadeReal))
  const [trocando, setTrocando] = useState(false)
  const [fator, setFator] = useState(String(item.conversionFactor || 1))

  useEffect(() => {
    setIsAdjusting(false)
    setAdjustedQty(mostrar(item.quantidadeReal))
    setTrocando(false)
    setFator(String(item.conversionFactor || 1).replace('.', ','))
    // Só ao trocar de item: o fator digitado ("2,5") não pode ser reescrito no meio da digitação
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  const ligado = !!item.targetId
  const fatorNumero = lerNumero(fator) > 0 ? lerNumero(fator) : 1
  const previsto = item.quantidadeNota * fatorNumero
  const progressPercent = Math.round(((currentIndex + 1) / totalItems) * 100)

  const escolher = (o: StockItemOption) => {
    onValidateItem(
      {
        targetId: o.id,
        targetType: o.type,
        targetName: o.name,
        unidadeEstoque: o.unit,
      },
      false,
    )
    setTrocando(false)
  }

  const mudarFator = (v: string) => {
    setFator(v)
    const n = lerNumero(v)
    if (n > 0)
      onValidateItem(
        { conversionFactor: n, quantidadeReal: item.quantidadeNota * n },
        false,
      )
  }

  // Confere: entra o previsto (quantidade da nota × quantas unidades vêm em cada uma)
  const handleConfirm = () => {
    if (!ligado) return
    onValidateItem(
      {
        conferido: true,
        divergencia: false,
        naoEntregue: false,
        conversionFactor: fatorNumero,
        quantidadeReal: previsto,
      },
      true,
    )
  }

  const handleSaveAdjustment = () => {
    const qty = lerNumero(adjustedQty)
    if (!Number.isFinite(qty) || qty < 0 || !ligado) return
    onValidateItem(
      {
        conferido: true,
        divergencia: qty !== previsto,
        quantidadeReal: qty,
        naoEntregue: qty === 0,
        conversionFactor: fatorNumero,
      },
      true,
    )
    setIsAdjusting(false)
  }

  const handleMarkNotDelivered = () => {
    onValidateItem(
      {
        conferido: true,
        divergencia: true,
        naoEntregue: true,
        quantidadeReal: 0,
      },
      true,
    )
  }

  // Atalhos: Enter confere, A ajusta, ! não entregue, setas trocam de item
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        if (e.key === 'Enter' && isAdjusting) {
          e.preventDefault()
          handleSaveAdjustment()
        }
        return
      }
      if (e.key === 'Enter' && ligado) {
        e.preventDefault()
        handleConfirm()
      } else if ((e.key === 'a' || e.key === 'A') && ligado) {
        e.preventDefault()
        setIsAdjusting(true)
      } else if (e.key === '!') {
        e.preventDefault()
        handleMarkNotDelivered()
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault()
        onSelectIndex(currentIndex - 1)
      } else if (e.key === 'ArrowRight' && currentIndex < totalItems - 1) {
        e.preventDefault()
        onSelectIndex(currentIndex + 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-4 duration-300 animate-in fade-in">
      <div className="mb-6 flex w-full max-w-2xl flex-col gap-2">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-slate-700 dark:text-slate-300">
            Item {currentIndex + 1} de {totalItems}
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            {progressPercent}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mb-6 w-full max-w-2xl rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800/80 dark:bg-[#131B2A] sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-mono text-slate-600 dark:text-slate-400">
            Cód. na nota: {item.codigoNota}
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            {nfeNumber ? `NF-e ${nfeNumber}` : 'Entrada'} · {supplierName}
          </span>
        </div>

        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
            <Package className="h-7 w-7 text-emerald-500" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Na nota
            </p>
            <h2 className="break-words text-xl font-black leading-tight text-slate-900 dark:text-white sm:text-2xl">
              {item.nomeNota}
            </h2>
            {(item.lote || item.validade) && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {item.lote ? `Lote ${item.lote}` : ''}
                {item.lote && item.validade ? ' · ' : ''}
                {item.validade ? `Validade ${item.validade}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Em que produto ou insumo entra */}
        <div className="mb-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          {ligado && !trocando ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <Link2 className="h-4 w-4" aria-hidden />
                  {item.isNewItem ? 'Sugestão (confira)' : 'Entra em'}
                </p>
                <p className="break-words text-base font-bold text-slate-900 dark:text-white">
                  {item.targetName} ·{' '}
                  {item.targetType === 'SUPPLY' ? 'insumo' : 'produto'}
                </p>
              </div>
              <Button
                variant="outline"
                className="h-11"
                onClick={() => setTrocando(true)}
              >
                Trocar
              </Button>
            </div>
          ) : (
            <>
              {!ligado && (
                <p className="mb-3 text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Este item ainda não está ligado a um produto ou insumo do
                  Metrics. Escolha abaixo.
                </p>
              )}
              <EscolherDestino
                onEscolher={escolher}
                sugestao={item.nomeNota.split(' ').slice(0, 2).join(' ')}
              />
              {ligado && (
                <Button
                  variant="ghost"
                  className="mt-2 h-11"
                  onClick={() => setTrocando(false)}
                >
                  Manter {item.targetName}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Quanto entra */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
          <p className="mb-3 text-base font-bold text-slate-900 dark:text-white">
            A nota indica {mostrar(item.quantidadeNota)} {item.unidadeNota}.
            Confere?
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label
              htmlFor="fator"
              className="text-slate-700 dark:text-slate-300"
            >
              Cada {item.unidadeNota} da nota tem
            </label>
            <Input
              id="fator"
              inputMode="decimal"
              value={fator}
              onChange={(e) => mudarFator(e.target.value)}
              className="h-11 w-24 text-center text-base font-bold"
            />
            <span className="text-slate-700 dark:text-slate-300">
              {item.unidadeEstoque || 'un'}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
            Entra no estoque:{' '}
            <strong className="text-lg text-emerald-700 dark:text-emerald-400">
              {mostrar(previsto)} {item.unidadeEstoque || 'un'}
            </strong>
          </p>
        </div>

        {isAdjusting && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <label
              htmlFor="qtd-real"
              className="mb-2 block text-sm font-bold text-amber-800 dark:text-amber-300"
            >
              Quanto chegou de verdade ({item.unidadeEstoque || 'un'})
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="qtd-real"
                autoFocus
                inputMode="decimal"
                value={adjustedQty}
                onChange={(e) => setAdjustedQty(e.target.value)}
                className="h-11 w-32 bg-white text-lg font-bold dark:bg-slate-900"
              />
              <Button
                onClick={handleSaveAdjustment}
                className="h-11 bg-amber-600 font-bold text-white hover:bg-amber-700"
              >
                Salvar quantidade
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsAdjusting(false)}
                className="h-11"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            onClick={handleConfirm}
            disabled={!ligado}
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600"
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            <span>
              {ligado ? 'Sim, confere' : 'Escolha o produto ou insumo'}
            </span>
            {ligado && (
              <kbd className="rounded border border-emerald-600/40 bg-emerald-600/30 px-1.5 py-0.5 font-mono text-xs text-slate-950">
                Enter <CornerDownLeft className="inline h-3 w-3" aria-hidden />
              </kbd>
            )}
          </Button>
          <Button
            variant="outline"
            disabled={!ligado}
            onClick={() => setIsAdjusting(!isAdjusting)}
            className="flex h-14 items-center justify-center gap-2 rounded-xl text-sm font-bold"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Chegou outra quantidade
            <kbd className="rounded border px-1.5 py-0.5 text-xs">A</kbd>
          </Button>
          <Button
            variant="outline"
            onClick={handleMarkNotDelivered}
            className="flex h-14 items-center justify-center gap-2 rounded-xl text-sm font-bold hover:border-red-500/60 hover:text-red-600"
          >
            <Ban className="h-4 w-4 text-red-500" aria-hidden />
            Não chegou
            <kbd className="rounded border px-1.5 py-0.5 text-xs">!</kbd>
          </Button>
        </div>
      </div>

      <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-2 py-2">
        {allItems.map((it, idx) => {
          const isActive = idx === currentIndex
          const hasDiv = it.divergencia || it.naoEntregue
          return (
            <button
              key={it.id || idx}
              type="button"
              onClick={() => onSelectIndex(idx)}
              aria-current={isActive}
              className={`inline-flex min-h-11 max-w-[14rem] items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : it.conferido
                    ? hasDiv
                      ? 'border border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300'
                      : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : !it.targetId
                      ? 'border border-amber-500/40 bg-white text-amber-800 dark:bg-slate-900 dark:text-amber-300'
                      : 'border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300'
              }`}
            >
              <span className="truncate">{it.targetName || it.nomeNota}</span>
              {it.conferido && (
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              )}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar ao fornecedor
      </button>
    </div>
  )
}
