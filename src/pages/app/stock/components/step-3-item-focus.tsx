import React, { useState, useEffect } from 'react'
import {
  Package,
  CheckCircle2,
  SlidersHorizontal,
  Ban,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CornerDownLeft,
  Edit2
} from 'lucide-react'
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
  const [adjustedQty, setAdjustedQty] = useState(item.quantidadeReal.toString())
  const [lote, setLote] = useState(item.lote || '')
  const [validade, setValidade] = useState(item.validade || '')
  const [friendlyName, setFriendlyName] = useState(item.targetName || item.nomeNota)
  const [isEditingName, setIsEditingName] = useState(false)

  // Atualiza os estados locais quando o item mudar
  useEffect(() => {
    setIsAdjusting(false)
    setAdjustedQty(item.quantidadeReal.toString())
    setLote(item.lote || '')
    setValidade(item.validade || '')
    setFriendlyName(item.targetName || item.nomeNota)
  }, [item])

  const progressPercent = Math.round(((currentIndex + 1) / totalItems) * 100)

  // Confirma item como 100% OK
  const handleConfirm = () => {
    onValidateItem({
      conferido: true,
      divergencia: false,
      naoEntregue: false,
      quantidadeReal: item.quantidadeNota * (item.conversionFactor || 1),
      targetName: friendlyName,
      lote: lote || undefined,
      validade: validade || undefined,
    }, true)
  }

  // Salva ajuste com divergência
  const handleSaveAdjustment = () => {
    const qty = parseFloat(adjustedQty.replace(',', '.')) || 0
    onValidateItem({
      conferido: true,
      divergencia: qty !== (item.quantidadeNota * (item.conversionFactor || 1)),
      quantidadeReal: qty,
      naoEntregue: qty === 0,
      targetName: friendlyName,
      lote: lote || undefined,
      validade: validade || undefined,
    }, true)
    setIsAdjusting(false)
  }

  // Marca como não entregue
  const handleMarkNotDelivered = () => {
    onValidateItem({
      conferido: true,
      divergencia: true,
      naoEntregue: true,
      quantidadeReal: 0,
    }, true)
  }

  // Atalhos de teclado (Enter para avançar, A para ajustar, ! para não entregue)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        if (e.key === 'Enter' && isAdjusting) {
          e.preventDefault()
          handleSaveAdjustment()
        }
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        handleConfirm()
      } else if (e.key === 'a' || e.key === 'A') {
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
  }, [currentIndex, isAdjusting, totalItems, friendlyName, lote, validade, adjustedQty, item])

  const expectedConvertedQty = item.quantidadeNota * (item.conversionFactor || 1)

  return (
    <div className="flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-4 animate-in fade-in duration-300">
      {/* Subheader Badge e Barra de Progresso */}
      <div className="w-full max-w-2xl flex flex-col gap-2 mb-6">
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            CAPÍTULO 3 DE 4 • CONFERÊNCIA ITEM A ITEM
          </div>
          <span className="text-slate-600 dark:text-slate-400 font-mono">
            {progressPercent}% CONCLUÍDO
          </span>
        </div>

        {/* Linha de Progresso */}
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Card Central de Foco no Produto */}
      <div className="w-full max-w-2xl bg-white dark:bg-[#131B2A] rounded-2xl border-2 border-slate-200 dark:border-slate-800/80 p-6 sm:p-8 shadow-xl dark:shadow-2xl dark:shadow-black/40 mb-6">
        {/* Metadados Superiores */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {item.targetType === 'SUPPLY' ? 'Insumo / Matéria-Prima' : 'Produto / Bar'}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-600 dark:text-slate-400">
              Cód: {item.codigoNota}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> NFe #{nfeNumber || '004.892'} / {supplierName}
          </span>
        </div>

        {/* Informações do Produto (Nome e Lote) */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
            <Package className="w-8 h-8 text-emerald-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2 w-full">
                  <Input
                    autoFocus
                    value={friendlyName}
                    onChange={(e) => setFriendlyName(e.target.value)}
                    className="h-9 text-lg font-bold"
                  />
                  <Button size="sm" onClick={() => setIsEditingName(false)}>OK</Button>
                </div>
              ) : (
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight truncate">
                  {friendlyName}
                </h2>
              )}
              {!isEditingName && (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="text-slate-600 dark:text-slate-400 hover:text-emerald-500 p-1 rounded"
                  title="Editar nome"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Aviso se for item novo */}
            {item.isNewItem && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Sparkles className="w-3 h-3" /> Novo insumo! O sistema aprenderá este nome para as próximas compras.
              </div>
            )}

            {/* Lote e Validade */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Lote: <strong>{lote || 'L2024-X49'}</strong>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Validade: <strong>{validade || '11/2025'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Caixa de Verificação Rápida */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
              VERIFICAÇÃO RÁPIDA
            </span>
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              A nota indica {item.quantidadeNota} {item.unidadeNota}. Confere fisicamente?
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-600 dark:text-slate-400">
              Qtd. Prevista
            </span>
            <span className="text-xl font-black font-mono">
              {item.quantidadeNota} {item.unidadeNota} = {expectedConvertedQty} {item.unidadeEstoque || 'un'}
            </span>
          </div>
        </div>

        {/* Painel de Ajuste de Quantidade (Expansível) */}
        {isAdjusting && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6 animate-in slide-in-from-top-2 duration-200">
            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-2">
              Ajustar Quantidade Recebida (Divergência)
            </h4>
            <div className="flex items-center gap-3">
              <Input
                autoFocus
                type="number"
                step="any"
                value={adjustedQty}
                onChange={(e) => setAdjustedQty(e.target.value)}
                placeholder="Qtd real que chegou"
                className="h-11 text-lg font-bold bg-white dark:bg-slate-900"
              />
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                {item.unidadeEstoque || 'un'}
              </span>
              <Button
                onClick={handleSaveAdjustment}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 shrink-0"
              >
                Salvar Divergência
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsAdjusting(false)}
                className="h-11 shrink-0"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Botão Primário Verde */}
          <Button
            onClick={handleConfirm}
            className="sm:col-span-1 h-14 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Sim, confere</span>
            <kbd className="px-1.5 py-0.5 rounded bg-emerald-600/30 text-slate-950 font-mono text-[11px] border border-emerald-600/40">
              Enter <CornerDownLeft className="w-2.5 h-2.5 inline" />
            </kbd>
          </Button>

          {/* Botão Secundário Ajustar */}
          <Button
            variant="outline"
            onClick={() => setIsAdjusting(!isAdjusting)}
            className="h-14 border-slate-300 dark:border-slate-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Ajustar quantidade</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] border border-slate-300 dark:border-slate-700">
              A
            </kbd>
          </Button>

          {/* Botão Não Entregue */}
          <Button
            variant="outline"
            onClick={handleMarkNotDelivered}
            className="h-14 border-slate-300 dark:border-slate-700 hover:border-red-500/60 hover:text-red-500 font-bold text-sm rounded-xl flex items-center justify-center gap-2"
          >
            <Ban className="w-4 h-4 text-red-500" />
            <span>Não entregue</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] border border-slate-300 dark:border-slate-700">
              !
            </kbd>
          </Button>
        </div>

        {/* Dica de Teclado */}
        <p className="text-center text-xs text-slate-600 dark:text-slate-400">
          💡 Dica: Pressione <strong className="text-slate-900 dark:text-white">Enter ↵</strong> para validar e passar para o próximo item.
        </p>
      </div>

      {/* Pílulas Inferiores de Itens da Carga */}
      <div className="w-full max-w-3xl flex items-center justify-center gap-2 overflow-x-auto py-2 px-1">
        {allItems.map((it, idx) => {
          const isActive = idx === currentIndex
          const isChecked = it.conferido
          const hasDiv = it.divergencia || it.naoEntregue

          return (
            <button
              key={it.id || idx}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0
                ${isActive
                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900 shadow-md'
                  : isChecked
                    ? hasDiv
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-slate-950' : isChecked ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span className="truncate max-w-[120px]">{it.targetName || it.nomeNota}</span>
              {isChecked && <CheckCircle2 className="w-3 h-3 ml-0.5" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
