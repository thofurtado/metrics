import React, { useState, useEffect } from 'react'
import { Building2, CheckCircle2, Search, ArrowLeft, ShieldCheck, Activity, CornerDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StockIntakeDraft } from '../use-stock-intake-draft'

interface Step2SupplierProps {
  originMode: 'XML' | 'MANUAL'
  header?: StockIntakeDraft['header']
  onConfirmSupplier: (supplier: { cnpj: string; razaoSocial: string }) => void
  onBack: () => void
}

export const Step2Supplier: React.FC<Step2SupplierProps> = ({
  originMode,
  header,
  onConfirmSupplier,
  onBack,
}) => {
  const [manualSearch, setManualSearch] = useState('')
  const [isManualOverride, setIsManualOverride] = useState(originMode === 'MANUAL')

  const detectedSupplier = header?.fornecedor || {
    cnpj: '02.449.992/0001-64',
    razaoSocial: 'Distribuidora Ambev S/A',
  }

  // Atalho Enter para confirmar e ESC para voltar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (isManualOverride && manualSearch.trim()) {
          onConfirmSupplier({
            cnpj: '00.000.000/0000-00',
            razaoSocial: manualSearch.trim(),
          })
        } else if (!isManualOverride) {
          onConfirmSupplier(detectedSupplier)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [detectedSupplier, isManualOverride, manualSearch, onConfirmSupplier, onBack])

  return (
    <div className="flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      {/* Subheader Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-3">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        CAPÍTULO 2 DE 4 • FORNECEDOR
      </div>

      {/* Tag de Origem */}
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider mb-4">
        {originMode === 'XML' ? '⛶ FORNECEDOR DETECTADO NO XML' : 'ENTRADA MANUAL'}
      </div>

      {/* Título Principal */}
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center text-slate-900 dark:text-white mb-2">
        Confirmar fornecedor da mercadoria
      </h1>
      <p className="text-slate-600 dark:text-slate-400 text-center text-sm sm:text-base max-w-xl mb-10">
        Valide a entidade comercial responsável pela carga antes da conferência física.
      </p>

      {/* Card Principal */}
      <div className="w-full max-w-2xl bg-white dark:bg-[#131B2A] rounded-2xl border-2 border-slate-200 dark:border-slate-800/80 p-8 shadow-xl dark:shadow-2xl dark:shadow-black/40 mb-8">
        {!isManualOverride ? (
          <div>
            {/* Cabeçalho do Fornecedor */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Building2 className="w-7 h-7" />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {detectedSupplier.razaoSocial}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Fornecedor homologado
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Logística e Bebidas Premium do Brasil
                </p>
              </div>
            </div>

            {/* Barra de Detalhes da Nota */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 font-mono mb-6">
              <span>CNPJ <strong className="text-slate-900 dark:text-white">{detectedSupplier.cnpj}</strong></span>
              <span>•</span>
              <span>NF-e <strong className="text-slate-900 dark:text-white">#{header?.numeroNfe || '004.892'}</strong></span>
              <span>•</span>
              <span>Emissão: <strong className="text-slate-900 dark:text-white">{header?.dataEmissao || 'Hoje, 14:15'}</strong></span>
            </div>

            {/* Histórico e Confiabilidade */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Histórico de Confiabilidade: 99.4%
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    148 recebimentos anteriores sem divergência
                  </p>
                </div>
              </div>
              <Activity className="w-5 h-5 text-emerald-500 animate-pulse hidden sm:block" />
            </div>

            {/* Botão de Confirmação Hero */}
            <Button
              onClick={() => onConfirmSupplier(detectedSupplier)}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-base rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <span>Confirmar Fornecedor</span>
              <kbd className="px-2 py-0.5 rounded bg-emerald-600/30 text-slate-950 font-mono text-xs flex items-center gap-1 border border-emerald-600/40">
                Enter <CornerDownLeft className="w-3 h-3" />
              </kbd>
            </Button>

            {/* Link Secundário */}
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setIsManualOverride(true)}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 underline underline-offset-4 transition-colors"
              >
                🔍 Ou buscar outro fornecedor manualmente...
              </button>
            </div>
          </div>
        ) : (
          /* Modo de Seleção Manual */
          <div>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                Nome ou CNPJ do Fornecedor
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-600 dark:text-slate-400" />
                <Input
                  autoFocus
                  placeholder="Ex: Distribuidora Ambev, Ceasa, Hortifrúti São Paulo..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="pl-11 h-12 text-base rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Botão de Fornecedor Avulso Rápido */}
            <div className="flex flex-wrap gap-2 mb-8">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setManualSearch('Compras de Feira / Produtor Local')}
                className="rounded-lg text-xs"
              >
                🌾 Compras de Feira / Produtor Local
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setManualSearch('Supermercado / Atacadista Avulso')}
                className="rounded-lg text-xs"
              >
                🛒 Atacadista Avulso
              </Button>
            </div>

            <Button
              disabled={!manualSearch.trim()}
              onClick={() => onConfirmSupplier({ cnpj: '00.000.000/0000-00', razaoSocial: manualSearch.trim() })}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <span>Confirmar Fornecedor</span>
              <kbd className="px-2 py-0.5 rounded bg-emerald-600/30 text-slate-950 font-mono text-xs flex items-center gap-1 border border-emerald-600/40">
                Enter <CornerDownLeft className="w-3 h-3" />
              </kbd>
            </Button>

            {originMode === 'XML' && (
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsManualOverride(false)}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-500 underline underline-offset-4"
                >
                  Voltar para o fornecedor detectado no XML
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Link de Voltar */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Capítulo 1: Origem <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] border border-slate-200 dark:border-slate-700">ESC</kbd>
      </button>
    </div>
  )
}
