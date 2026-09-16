import React, { useState, useEffect } from 'react'
import {
  CheckCircle2,
  ArrowLeft,
  PackageCheck,
  Loader2,
  CornerDownLeft,
  AlertTriangle,
  UtensilsCrossed,
  Layers,
  Sparkles,
  Scale
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { StockIntakeDraft, StockIntakeItem, PortioningConfig } from '../use-stock-intake-draft'

interface Step4ConclusionProps {
  header?: StockIntakeDraft['header']
  items: StockIntakeItem[]
  onConfirmAndSave: (portioningMap: Record<string, PortioningConfig>) => Promise<void>
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
  const divergentItems = items.filter((i) => i.divergencia || i.naoEntregue)
  const totalValue = header?.valorTotal || items.reduce((acc, i) => acc + (i.valorTotalNota || 0), 0)

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
  const [portioningMap, setPortioningMap] = useState<Record<string, PortioningConfig>>(() => {
    const initial: Record<string, PortioningConfig> = {}
    portionableCandidates.forEach((it) => {
      // Sugestão padrão inteligente: 180g para picanha/filé, 700g para chuleta, 200g para outros
      const name = (it.targetName || it.nomeNota || '').toLowerCase()
      let defaultGrams = 200
      if (name.includes('picanha') || name.includes('angus')) defaultGrams = 180
      else if (name.includes('chuleta') || name.includes('t-bone')) defaultGrams = 700
      else if (name.includes('salmão') || name.includes('peixe')) defaultGrams = 150

      const totalKg = it.quantidadeReal || it.quantidadeNota
      const totalGrams = totalKg * 1000
      const count = Math.floor(totalGrams / defaultGrams)
      const trim = Math.round(totalGrams - count * defaultGrams)
      const costPerKg = it.valorUnitarioNota || 0
      const costPerPortion = count > 0 ? ((totalKg * costPerKg) / count) : 0

      initial[it.id] = {
        enabled: true,
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
  const handlePortionSizeChange = (itemId: string, gramsStr: string, totalKg: number, unitCost: number, itemName: string) => {
    const grams = parseFloat(gramsStr) || 0
    if (grams <= 0) return

    const totalGrams = totalKg * 1000
    const count = Math.floor(totalGrams / grams)
    const trim = Math.round(totalGrams - count * grams)
    const costPerPortion = count > 0 ? ((totalKg * unitCost) / count) : 0

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
        enabled: !prev[itemId]?.enabled,
      },
    }))
  }

  // Atalho Enter para concluir
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return
      if (e.key === 'Enter' && !isSaving) {
        e.preventDefault()
        onConfirmAndSave(portioningMap)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSaving, onConfirmAndSave, portioningMap])

  return (
    <div className="flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      {/* Subheader Badge */}
      <div className="w-full max-w-2xl flex items-center justify-between text-xs font-semibold mb-4">
        <span className="text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono">
          CAPÍTULO 4 DE 4: CONCLUSÃO
        </span>
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
          100% Concluído
        </span>
      </div>

      {/* Pill de Sucesso */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 mb-4">
        <CheckCircle2 className="w-4 h-4" /> Conferência concluída com sucesso!
      </div>

      {/* Título Principal */}
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center text-slate-900 dark:text-white mb-8">
        Tudo pronto para atualizar o estoque
      </h1>

      {/* Card de Resumo Executivo */}
      <div className="w-full max-w-2xl bg-white dark:bg-[#131B2A] rounded-2xl border-2 border-slate-200 dark:border-slate-800/80 p-6 sm:p-8 shadow-xl dark:shadow-2xl dark:shadow-black/40 mb-8">
        {/* Grid de 4 Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 mb-6">
          <div>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
              Itens Recebidos
            </span>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {deliveredItems.length} <span className="text-xs font-normal text-slate-600 dark:text-slate-400">conferidos</span>
            </p>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
              Valor da Carga
            </span>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
              Fornecedor
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {header?.fornecedor.razaoSocial || 'Fornecedor Avulso'}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
              Documento Fiscal
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              NF-e #{header?.numeroNfe || 'Manual'}
            </p>
          </div>
        </div>

        {/* Linhas Validadas em Docas */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            <span>LINHAS VALIDADAS EM DOCAS</span>
            {divergentItems.length === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold normal-case">
                ✓ Sem divergências
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-semibold normal-case flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {divergentItems.length} divergência(s)
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border
                    ${isMissing
                      ? 'bg-red-500/10 text-red-500 border-red-500/30'
                      : hasDiv
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isMissing ? 'text-red-500' : hasDiv ? 'text-amber-500' : 'text-emerald-500'}`} />
                  <span>{it.targetName || it.nomeNota}</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400 font-normal">
                    {it.quantidadeReal} {it.unidadeEstoque || 'un'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* PAINEL DE PORCIONAMENTO DA CARGA (SEMPRE NO FINAL DO FLUXO) */}
        {portionableCandidates.length > 0 && (
          <div className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border-2 border-emerald-500/30 mb-8">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Porcionamento & Rendimento para Cozinha
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase">
                      Recomendado
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Transforme insumos brutos recebidos em porções padrão para baixa automática nas vendas do PDV.
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Itens para Porcionar */}
            <div className="flex flex-col gap-3 mt-4">
              {portionableCandidates.map((it) => {
                const conf = portioningMap[it.id]
                const isEnabled = conf?.enabled ?? true
                const totalKg = it.quantidadeReal || it.quantidadeNota
                const unitCost = it.valorUnitarioNota || 0

                return (
                  <div
                    key={it.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isEnabled
                        ? 'bg-white dark:bg-slate-900 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {it.targetName || it.nomeNota}
                          <span className="text-xs font-mono font-normal text-slate-600 dark:text-slate-400">
                            ({totalKg} kg recebidos)
                          </span>
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Custo bruto: R$ {unitCost.toFixed(2)}/kg
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
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
                                  it.targetName || it.nomeNota
                                )
                              }
                              className="h-9 text-sm font-bold font-mono"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">g</span>
                          </div>
                        </div>

                        <div>
                          <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Rendimento Calculado
                          </span>
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 pt-1.5">
                            {conf?.portionCount || 0} porções
                            {conf?.trimGrams ? (
                              <span className="text-[11px] font-normal text-slate-600 dark:text-slate-400 block">
                                (+ {conf.trimGrams}g aparas)
                              </span>
                            ) : null}
                          </p>
                        </div>

                        <div>
                          <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Custo por Porção (CMV)
                          </span>
                          <p className="text-sm font-black text-slate-900 dark:text-white pt-1.5">
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

        {/* Botão de Conclusão Hero */}
        <Button
          disabled={isSaving}
          onClick={() => onConfirmAndSave(portioningMap)}
          className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-base rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creditando estoque e gerando porcionamento...</span>
            </>
          ) : (
            <>
              <PackageCheck className="w-5 h-5" />
              <span>Concluir Entrada no Estoque</span>
              <kbd className="px-2 py-0.5 rounded bg-emerald-600/30 text-slate-950 font-mono text-xs flex items-center gap-1 border border-emerald-600/40">
                Enter <CornerDownLeft className="w-3 h-3" />
              </kbd>
            </>
          )}
        </Button>

        {/* Link de Revisão */}
        <div className="text-center mt-4">
          <button
            type="button"
            disabled={isSaving}
            onClick={onReviewItems}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Revisar itens conferidos
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 text-center max-w-md">
        Os saldos físicos e as porções serão creditados imediatamente nos seus respectivos estoques e auditados nas fichas técnicas.
      </p>
    </div>
  )
}
