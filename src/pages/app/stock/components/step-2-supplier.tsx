import { ArrowLeft, Building2, CornerDownLeft, Search } from 'lucide-react'
import React, { useEffect, useState } from 'react'

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
  // Sem fornecedor na nota (entrada manual), a pessoa digita
  const detectedSupplier = header?.fornecedor?.razaoSocial
    ? header.fornecedor
    : null
  const [isManualOverride, setIsManualOverride] = useState(
    originMode === 'MANUAL' || !detectedSupplier,
  )

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
        } else if (!isManualOverride && detectedSupplier) {
          onConfirmSupplier(detectedSupplier)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    detectedSupplier,
    isManualOverride,
    manualSearch,
    onConfirmSupplier,
    onBack,
  ])

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-8 duration-300 animate-in fade-in">
      {/* Subheader Badge */}
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        CAPÍTULO 2 DE 4 • FORNECEDOR
      </div>

      {/* Tag de Origem */}
      <div className="mb-4 inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {originMode === 'XML'
          ? '⛶ FORNECEDOR DETECTADO NO XML'
          : 'ENTRADA MANUAL'}
      </div>

      {/* Título Principal */}
      <h1 className="mb-2 text-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        Confirmar fornecedor da mercadoria
      </h1>
      <p className="mb-10 max-w-xl text-center text-sm text-slate-600 dark:text-slate-400 sm:text-base">
        Valide a entidade comercial responsável pela carga antes da conferência
        física.
      </p>

      {/* Card Principal */}
      <div className="mb-8 w-full max-w-2xl rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800/80 dark:bg-[#131B2A] dark:shadow-2xl dark:shadow-black/40">
        {!isManualOverride && detectedSupplier ? (
          <div>
            {/* Cabeçalho do Fornecedor */}
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Building2 className="h-7 w-7" />
              </div>

              <div className="flex-1">
                <h2 className="break-words text-2xl font-bold text-slate-900 dark:text-white">
                  {detectedSupplier.razaoSocial}
                </h2>
                {detectedSupplier.nomeFantasia && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {detectedSupplier.nomeFantasia}
                  </p>
                )}
              </div>
            </div>

            {/* Barra de Detalhes da Nota */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              <span>
                CNPJ{' '}
                <strong className="text-slate-900 dark:text-white">
                  {detectedSupplier.cnpj}
                </strong>
              </span>
              <span>•</span>
              <span>
                NF-e{' '}
                <strong className="text-slate-900 dark:text-white">
                  {header?.numeroNfe || '—'}
                </strong>
              </span>
              <span>•</span>
              <span>
                Emissão:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {header?.dataEmissao || '—'}
                </strong>
              </span>
            </div>

            {/* Botão de Confirmação Hero */}
            <Button
              onClick={() => onConfirmSupplier(detectedSupplier)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] hover:bg-emerald-600 active:bg-emerald-700"
            >
              <span>Confirmar Fornecedor</span>
              <kbd className="flex items-center gap-1 rounded border border-emerald-600/40 bg-emerald-600/30 px-2 py-0.5 font-mono text-xs text-slate-950">
                Enter <CornerDownLeft className="h-3 w-3" />
              </kbd>
            </Button>

            {/* Link Secundário */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsManualOverride(true)}
                className="text-xs text-slate-600 underline underline-offset-4 transition-colors hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400"
              >
                🔍 Ou buscar outro fornecedor manualmente...
              </button>
            </div>
          </div>
        ) : (
          /* Modo de Seleção Manual */
          <div>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-bold text-slate-900 dark:text-white">
                Nome ou CNPJ do Fornecedor
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-600 dark:text-slate-400" />
                <Input
                  autoFocus
                  placeholder="Ex: Distribuidora Ambev, Ceasa, Hortifrúti São Paulo..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 text-base text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Botão de Fornecedor Avulso Rápido */}
            <div className="mb-8 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() =>
                  setManualSearch('Compras de Feira / Produtor Local')
                }
                className="rounded-lg text-xs"
              >
                🌾 Compras de Feira / Produtor Local
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() =>
                  setManualSearch('Supermercado / Atacadista Avulso')
                }
                className="rounded-lg text-xs"
              >
                🛒 Atacadista Avulso
              </Button>
            </div>

            <Button
              disabled={!manualSearch.trim()}
              onClick={() =>
                onConfirmSupplier({
                  cnpj: '00.000.000/0000-00',
                  razaoSocial: manualSearch.trim(),
                })
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-600"
            >
              <span>Confirmar Fornecedor</span>
              <kbd className="flex items-center gap-1 rounded border border-emerald-600/40 bg-emerald-600/30 px-2 py-0.5 font-mono text-xs text-slate-950">
                Enter <CornerDownLeft className="h-3 w-3" />
              </kbd>
            </Button>

            {originMode === 'XML' && detectedSupplier && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setIsManualOverride(false)}
                  className="text-xs text-slate-600 underline underline-offset-4 hover:text-emerald-500 dark:text-slate-400"
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
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Capítulo 1: Origem{' '}
        <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-800">
          ESC
        </kbd>
      </button>
    </div>
  )
}
