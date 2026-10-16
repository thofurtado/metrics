import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CornerDownLeft,
  Loader2,
  PackageCheck,
  UtensilsCrossed,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import {
  PortioningConfig,
  StockIntakeDraft,
  StockIntakeItem,
} from '../use-stock-intake-draft'

interface Step4ConclusionProps {
  header?: StockIntakeDraft['header']
  items: StockIntakeItem[]
  onConfirmAndSave: (
    portioningMap: Record<string, PortioningConfig>,
  ) => Promise<void>
  onReviewItems: () => void
  isSaving: boolean
}

export const Step4Conclusion: React.FC<Step4ConclusionProps> = ({
  header,
  items,
  onConfirmAndSave,
  onReviewItems,
  isSaving,
}) => {
  const deliveredItems = items.filter((i) => !i.naoEntregue)
  const semDestino = deliveredItems.filter((i) => !i.targetId)
  const divergentItems = items.filter((i) => i.divergencia || i.naoEntregue)
  const totalValue =
    header?.valorTotal ||
    items.reduce((acc, i) => acc + (i.valorTotalNota || 0), 0)

  // Identifica itens elegíveis para porcionamento (carnes, peixes, insumos em kg/peça)
  const portionableCandidates = deliveredItems.filter((it) => {
    const unit = (it.unidadeEstoque || it.unidadeNota || '').toLowerCase()
    const name = (it.targetName || it.nomeNota || '').toLowerCase()
    return (
      unit === 'kg' ||
      unit === 'g' ||
      unit === 'pc' ||
      name.includes('carne') ||
      name.includes('picanha') ||
      name.includes('chuleta') ||
      name.includes('filé') ||
      name.includes('bov') ||
      name.includes('frango') ||
      name.includes('peixe') ||
      name.includes('salmão') ||
      name.includes('queijo')
    )
  })

  // Estado do porcionamento por item
  const [portioningMap, setPortioningMap] = useState<
    Record<string, PortioningConfig>
  >(() => {
    const initial: Record<string, PortioningConfig> = {}
    portionableCandidates.forEach((it) => {
      // Sugestão padrão inteligente: 180g para picanha/filé, 700g para chuleta, 200g para outros
      const name = (it.targetName || it.nomeNota || '').toLowerCase()
      let defaultGrams = 200
      if (name.includes('picanha') || name.includes('angus')) defaultGrams = 180
      else if (name.includes('chuleta') || name.includes('t-bone'))
        defaultGrams = 700
      else if (name.includes('salmão') || name.includes('peixe'))
        defaultGrams = 150

      const totalKg = it.quantidadeReal || it.quantidadeNota
      const totalGrams = totalKg * 1000
      const count = Math.floor(totalGrams / defaultGrams)
      const trim = Math.round(totalGrams - count * defaultGrams)
      const costPerKg = it.valorUnitarioNota || 0
      const costPerPortion = count > 0 ? (totalKg * costPerKg) / count : 0

      initial[it.id] = {
        // Opcional: como medir os insumos (quilo, unidade, porção) ainda está para decidir; a peça entra inteira
        enabled: false,
        portionSizeGrams: defaultGrams,
        portionCount: count,
        trimGrams: trim,
        costPerPortion: Number(costPerPortion.toFixed(2)),
        portionSupplyName: `${it.targetName || it.nomeNota} ${defaultGrams}g Porcionada`,
      }
    })
    return initial
  })

  // Atualiza cálculos quando o operador altera o peso da porção
  const handlePortionSizeChange = (
    itemId: string,
    gramsStr: string,
    totalKg: number,
    unitCost: number,
    itemName: string,
  ) => {
    const grams = parseFloat(gramsStr) || 0
    if (grams <= 0) return

    const totalGrams = totalKg * 1000
    const count = Math.floor(totalGrams / grams)
    const trim = Math.round(totalGrams - count * grams)
    const costPerPortion = count > 0 ? (totalKg * unitCost) / count : 0

    setPortioningMap((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        portionSizeGrams: grams,
        portionCount: count,
        trimGrams: trim,
        costPerPortion: Number(costPerPortion.toFixed(2)),
        portionSupplyName: `${itemName} ${grams}g Porcionada`,
      },
    }))
  }

  // Toggle de ativar/desativar porcionamento por item
  const handleTogglePortioning = (itemId: string) => {
    setPortioningMap((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        enabled: !(prev[itemId]?.enabled ?? false),
      },
    }))
  }

  // Atalho Enter para concluir
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))
        return
      if (e.key === 'Enter' && !isSaving && semDestino.length === 0) {
        e.preventDefault()
        onConfirmAndSave(portioningMap)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSaving, onConfirmAndSave, portioningMap, semDestino.length])

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-8 duration-300 animate-in fade-in">
      {/* Subheader Badge */}
      <div className="mb-4 flex w-full max-w-2xl items-center justify-between text-xs font-semibold">
        <span className="font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
          CAPÍTULO 4 DE 4: CONCLUSÃO
        </span>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-emerald-600 dark:text-emerald-400">
          100% Concluído
        </span>
      </div>

      {/* Pill de Sucesso */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" /> Conferência concluída com sucesso!
      </div>

      {/* Título Principal */}
      <h1 className="mb-8 text-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        Tudo pronto para atualizar o estoque
      </h1>

      {/* Card de Resumo Executivo */}
      <div className="mb-8 w-full max-w-2xl rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800/80 dark:bg-[#131B2A] dark:shadow-2xl dark:shadow-black/40 sm:p-8">
        {/* Grid de 4 Métricas */}
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-4">
          <div>
            <span className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              Itens Recebidos
            </span>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {deliveredItems.length}{' '}
              <span className="text-xs font-normal text-slate-600 dark:text-slate-400">
                conferidos
              </span>
            </p>
          </div>

          <div>
            <span className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              Valor da Carga
            </span>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              R${' '}
              {totalValue.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div>
            <span className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              Fornecedor
            </span>
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {header?.fornecedor.razaoSocial || 'Fornecedor Avulso'}
            </p>
          </div>

          <div>
            <span className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              Documento Fiscal
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {header?.numeroNfe ? `NF-e ${header.numeroNfe}` : 'Sem número'}
            </p>
          </div>
        </div>

        {/* Linhas Validadas em Docas */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <span>LINHAS VALIDADAS EM DOCAS</span>
            {divergentItems.length === 0 ? (
              <span className="font-semibold normal-case text-emerald-600 dark:text-emerald-400">
                ✓ Sem divergências
              </span>
            ) : (
              <span className="flex items-center gap-1 font-semibold normal-case text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />{' '}
                {divergentItems.length} divergência(s)
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {items.map((it, idx) => {
              const isMissing = it.naoEntregue
              const hasDiv = it.divergencia

              return (
                <div
                  key={it.id || idx}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold
                    ${
                      isMissing
                        ? 'border-red-500/30 bg-red-500/10 text-red-500'
                        : hasDiv
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                          : 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300'
                    }`}
                >
                  <CheckCircle2
                    className={`h-3.5 w-3.5 ${isMissing ? 'text-red-500' : hasDiv ? 'text-amber-500' : 'text-emerald-500'}`}
                  />
                  <span>{it.targetName || it.nomeNota}</span>
                  <span className="font-mono font-normal text-slate-600 dark:text-slate-400">
                    {it.quantidadeReal} {it.unidadeEstoque || 'un'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* PAINEL DE PORCIONAMENTO DA CARGA (SEMPRE NO FINAL DO FLUXO) */}
        {portionableCandidates.length > 0 && (
          <div className="mb-8 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-5 dark:bg-emerald-950/20">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    Porcionar para a cozinha (opcional)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Desligado, a peça entra inteira no insumo escolhido.
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Itens para Porcionar */}
            <div className="mt-4 flex flex-col gap-3">
              {portionableCandidates.map((it) => {
                const conf = portioningMap[it.id]
                const isEnabled = conf?.enabled ?? false
                const totalKg = it.quantidadeReal || it.quantidadeNota
                const unitCost = it.valorUnitarioNota || 0

                return (
                  <div
                    key={it.id}
                    className={`rounded-xl border p-4 transition-all ${
                      isEnabled
                        ? 'border-emerald-500/40 bg-white shadow-sm dark:bg-slate-900'
                        : 'border-slate-200 bg-slate-100/60 opacity-70 dark:border-slate-800 dark:bg-slate-900/40'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                          {it.targetName || it.nomeNota}
                          <span className="font-mono text-xs font-normal text-slate-600 dark:text-slate-400">
                            ({totalKg} kg recebidos)
                          </span>
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Custo bruto: R$ {unitCost.toFixed(2)}/kg
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {isEnabled ? 'Porcionar' : 'Peça inteira'}
                        </span>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleTogglePortioning(it.id)}
                        />
                      </div>
                    </div>

                    {isEnabled && (
                      <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Peso por porção (g)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min="1"
                              step="5"
                              value={conf?.portionSizeGrams || 180}
                              onChange={(e) =>
                                handlePortionSizeChange(
                                  it.id,
                                  e.target.value,
                                  totalKg,
                                  unitCost,
                                  it.targetName || it.nomeNota,
                                )
                              }
                              className="h-9 font-mono text-sm font-bold"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                              g
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Rendimento Calculado
                          </span>
                          <p className="pt-1.5 text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {conf?.portionCount || 0} porções
                            {conf?.trimGrams ? (
                              <span className="block text-[11px] font-normal text-slate-600 dark:text-slate-400">
                                (+ {conf.trimGrams}g aparas)
                              </span>
                            ) : null}
                          </p>
                        </div>

                        <div>
                          <span className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Custo por Porção (CMV)
                          </span>
                          <p className="pt-1.5 text-sm font-black text-slate-900 dark:text-white">
                            R$ {(conf?.costPerPortion || 0).toFixed(2)} / un
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {semDestino.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-bold">Falta escolher o produto ou insumo de:</p>
            <p className="mt-1 break-words">
              {semDestino.map((i) => i.nomeNota).join(', ')}
            </p>
            <button
              type="button"
              onClick={onReviewItems}
              className="mt-2 min-h-11 font-bold underline underline-offset-4"
            >
              Voltar à conferência
            </button>
          </div>
        )}

        {/* Botão de Conclusão Hero */}
        <Button
          disabled={isSaving || semDestino.length > 0}
          onClick={() => onConfirmAndSave(portioningMap)}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] hover:bg-emerald-600 active:bg-emerald-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Creditando estoque e gerando porcionamento...</span>
            </>
          ) : (
            <>
              <PackageCheck className="h-5 w-5" />
              <span>Concluir Entrada no Estoque</span>
              <kbd className="flex items-center gap-1 rounded border border-emerald-600/40 bg-emerald-600/30 px-2 py-0.5 font-mono text-xs text-slate-950">
                Enter <CornerDownLeft className="h-3 w-3" />
              </kbd>
            </>
          )}
        </Button>

        {/* Link de Revisão */}
        <div className="mt-4 text-center">
          <button
            type="button"
            disabled={isSaving}
            onClick={onReviewItems}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Revisar itens conferidos
          </button>
        </div>
      </div>

      <p className="max-w-md text-center text-xs text-slate-600 dark:text-slate-400">
        Cada item entra no estoque e no histórico com o seu nome.
      </p>
    </div>
  )
}
