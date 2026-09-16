import React, { useEffect } from 'react'
import { CheckCircle2, ArrowLeft, PackageCheck, Loader2, CornerDownLeft, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StockIntakeDraft, StockIntakeItem } from '../use-stock-intake-draft'

interface Step4ConclusionProps {
  header?: StockIntakeDraft['header']
  items: StockIntakeItem[]
  onConfirmAndSave: () => Promise<void>
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

  // Atalho Enter para concluir
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isSaving) {
        e.preventDefault()
        onConfirmAndSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSaving, onConfirmAndSave])

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
      <div className="w-full max-w-2xl bg-white dark:bg-[#131B2A] rounded-2xl border-2 border-slate-200 dark:border-slate-800/80 p-8 shadow-xl dark:shadow-2xl dark:shadow-black/40 mb-8">
        {/* Grid de 4 Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 mb-8">
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
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
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

          {/* Chips com Checkmark */}
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

        {/* Botão de Conclusão Hero */}
        <Button
          disabled={isSaving}
          onClick={onConfirmAndSave}
          className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-base rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creditando estoque e gravando movimentações...</span>
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
        Os saldos físicos serão creditados imediatamente nos seus respectivos estoques e as movimentações serão auditadas no histórico.
      </p>
    </div>
  )
}
