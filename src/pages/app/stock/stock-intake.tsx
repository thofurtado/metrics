import { Box, Moon, Sun, X } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useTheme } from '@/components/theme/theme-provider'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/axios'

import { mensagemDoErro } from './components/formatos-do-estoque'
import { Step1Origin } from './components/step-1-origin'
import { Step2Supplier } from './components/step-2-supplier'
import { Step3ItemFocus } from './components/step-3-item-focus'
import { Step4Conclusion } from './components/step-4-conclusion'
import {
  PortioningConfig,
  StockIntakeDraft,
  StockIntakeItem,
  useStockIntakeDraft,
} from './use-stock-intake-draft'

/** O que a nuvem devolve ao ler o XML (POST /api/stock/nfe/parse). */
interface ItemDaNotaLida {
  codigo?: string
  nome?: string
  unidade?: string
  quantidade?: number
  valorUnitario?: number
  valorTotal?: number
}
interface ItemLido {
  itemNota?: ItemDaNotaLida
  isAlreadyMapped?: boolean
  matchedType?: 'SUPPLY' | 'PRODUCT' | null
  matchedId?: string | null
  matchedName?: string | null
  conversionFactor?: number
}
interface NotaLida {
  header?: {
    chaveNfe?: string
    numeroNota?: string
    dataEmissao?: string
    fornecedor?: { cnpj?: string; razaoSocial?: string; nomeFantasia?: string }
    total?: { valorNota?: number }
  }
  items?: ItemLido[]
}

export const StockIntakePage: React.FC = () => {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { draft, saveDraft, clearDraft } = useStockIntakeDraft()

  // Estados principais do fluxo
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [originMode, setOriginMode] = useState<'XML' | 'MANUAL'>('XML')
  const [header, setHeader] = useState<StockIntakeDraft['header']>()
  const [items, setItems] = useState<StockIntakeItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isParsingXml, setIsParsingXml] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showResumeBanner, setShowResumeBanner] = useState(false)

  // Ao montar, verifica se existe rascunho anterior
  useEffect(() => {
    if (draft && draft.items && draft.items.length > 0) {
      setShowResumeBanner(true)
    }
  }, [])

  // Restaura o rascunho
  const handleResumeDraft = () => {
    if (!draft) return
    setStep(draft.step)
    setOriginMode(draft.originMode)
    setHeader(draft.header)
    setItems(draft.items)
    setCurrentIndex(draft.currentItemIndex || 0)
    setShowResumeBanner(false)
    toast.success('Rascunho restaurado com sucesso!')
  }

  // Descarta o rascunho
  const handleDiscardDraft = () => {
    clearDraft()
    setShowResumeBanner(false)
    toast.info('Rascunho descartado.')
  }

  // Auto-save do rascunho sempre que os dados mudarem
  const persistCurrentState = useCallback(
    (
      newStep = step,
      newIndex = currentIndex,
      newItems = items,
      newHeader = header,
    ) => {
      saveDraft({
        step: newStep,
        originMode,
        header: newHeader,
        items: newItems,
        currentItemIndex: newIndex,
      })
    },
    [step, currentIndex, items, header, originMode, saveDraft],
  )

  // Ação de Sair / ESC: o rascunho fica guardado neste navegador e a tela volta para a Posição de Estoque
  const handleExit = () => {
    if (items.length > 0) {
      persistCurrentState()
      toast.success(
        'Rascunho guardado. Para continuar, abra Entrada de Mercadorias de novo.',
      )
    }
    navigate('/stock')
  }

  // Passo 1: Seleção de Origem
  const handleSelectOrigin = async (mode: 'XML' | 'MANUAL', file?: File) => {
    setOriginMode(mode)

    if (mode === 'XML' && file) {
      setIsParsingXml(true)
      try {
        const text = await file.text()

        // Só a leitura da nuvem vale (antes, se ela falhasse, a tela inventava uma nota de exemplo da "Distribuidora Ambev")
        let parseResult: NotaLida
        try {
          const res = await api.post('/api/stock/nfe/parse', { xml: text })
          parseResult = res.data
        } catch (apiErr) {
          toast.error(
            mensagemDoErro(
              apiErr,
              'Não foi possível ler esta nota. Confira se o arquivo é o XML da NF-e de compra e tente de novo.',
            ),
          )
          return
        }

        const h: NonNullable<NotaLida['header']> = parseResult.header || {}
        const emissao = h.dataEmissao ? new Date(h.dataEmissao) : null
        const parsedItems: ItemLido[] = parseResult.items || []
        const newHeader = {
          numeroNfe: h.numeroNota || '',
          chaveNfe: h.chaveNfe || '',
          dataEmissao:
            emissao && !Number.isNaN(emissao.getTime())
              ? emissao.toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : '',
          fornecedor: {
            cnpj: h.fornecedor?.cnpj || '',
            razaoSocial: h.fornecedor?.razaoSocial || '',
            nomeFantasia: h.fornecedor?.nomeFantasia,
          },
          valorTotal:
            Number(h.total?.valorNota) ||
            parsedItems.reduce(
              (t: number, m: ItemLido) =>
                t + (Number(m.itemNota?.valorTotal) || 0),
              0,
            ),
        }

        const newItems: StockIntakeItem[] = parsedItems.map(
          (m: ItemLido, idx: number) => {
            const raw: ItemDaNotaLida = m.itemNota || {}
            const factor = m.conversionFactor || 1
            const targetQty = (Number(raw.quantidade) || 0) * factor

            return {
              id: crypto.randomUUID(),
              codigoNota: raw.codigo || `ITEM-${idx + 1}`,
              nomeNota: raw.nome || `Item ${idx + 1} da nota`,
              unidadeNota: raw.unidade || 'UN',
              quantidadeNota: Number(raw.quantidade) || 0,
              valorUnitarioNota: Number(raw.valorUnitario) || 0,
              valorTotalNota: Number(raw.valorTotal) || 0,
              targetType: m.matchedType || 'SUPPLY',
              // Sem vínculo, sem destino: quem dá entrada escolhe o produto ou insumo na conferência
              targetId: m.matchedId || undefined,
              targetName: m.matchedName || undefined,
              isNewItem: !m.isAlreadyMapped,
              conversionFactor: factor,
              conferido: false,
              divergencia: false,
              quantidadeReal: targetQty,
              unidadeEstoque: raw.unidade || 'un',
              naoEntregue: false,
            }
          },
        )
        if (newItems.length === 0) {
          toast.error('Esta nota não tem itens para dar entrada.')
          return
        }

        setHeader(newHeader)
        setItems(newItems)
        setStep(2)
        persistCurrentState(2, 0, newItems, newHeader)
      } catch (err) {
        toast.error(
          'Erro ao ler arquivo XML da nota fiscal: ' +
            ((err as Error)?.message || 'Arquivo inválido.'),
        )
      } finally {
        setIsParsingXml(false)
      }
    } else {
      // Modo Manual
      const defaultHeader = {
        numeroNfe: '',
        dataEmissao: new Date().toLocaleDateString('pt-BR'),
        fornecedor: {
          cnpj: '00.000.000/0000-00',
          razaoSocial: 'Fornecedor Local / Avulso',
        },
        valorTotal: 0,
      }
      setHeader(defaultHeader)
      setItems([
        {
          id: crypto.randomUUID(),
          codigoNota: 'MAN-01',
          nomeNota: 'Item da entrada manual',
          unidadeNota: 'UN',
          quantidadeNota: 1,
          valorUnitarioNota: 0,
          valorTotalNota: 0,
          targetType: 'SUPPLY',
          isNewItem: true,
          conversionFactor: 1,
          conferido: false,
          divergencia: false,
          quantidadeReal: 1,
          unidadeEstoque: 'UN',
          naoEntregue: false,
        },
      ])
      setStep(2)
      persistCurrentState(2, 0, [], defaultHeader)
    }
  }

  // Passo 2: Confirmação do Fornecedor
  const handleConfirmSupplier = (supp: {
    cnpj: string
    razaoSocial: string
  }) => {
    const updatedHeader = {
      ...(header || {
        numeroNfe: '',
        dataEmissao: '',
        valorTotal: 0,
      }),
      fornecedor: {
        cnpj: supp.cnpj,
        razaoSocial: supp.razaoSocial,
      },
    }
    setHeader(updatedHeader)
    setStep(3)
    persistCurrentState(3, 0, items, updatedHeader)
  }

  // Passo 3: Validação de Cada Item
  const handleValidateItem = (
    updatedItem: Partial<StockIntakeItem>,
    advance = true,
  ) => {
    const updatedList = [...items]
    updatedList[currentIndex] = {
      ...updatedList[currentIndex],
      ...updatedItem,
    }
    setItems(updatedList)

    if (advance) {
      if (currentIndex < items.length - 1) {
        const nextIdx = currentIndex + 1
        setCurrentIndex(nextIdx)
        persistCurrentState(3, nextIdx, updatedList, header)
      } else {
        // Último item validado -> Avança para Conclusão!
        setStep(4)
        persistCurrentState(4, currentIndex, updatedList, header)
      }
    } else {
      persistCurrentState(3, currentIndex, updatedList, header)
    }
  }

  // Passo 4: Salvar e Concluir no Estoque
  const handleConfirmAndSave = async (
    portioningMap?: Record<string, PortioningConfig>,
  ) => {
    const recebidos = items.filter(
      (i) => !i.naoEntregue && i.quantidadeReal > 0,
    )
    const semDestino = recebidos.filter((i) => !i.targetId)
    if (semDestino.length > 0) {
      toast.error(
        `Escolha o produto ou insumo de: ${semDestino.map((i) => i.nomeNota).join(', ')}.`,
      )
      setCurrentIndex(items.indexOf(semDestino[0]))
      setStep(3)
      return
    }
    if (recebidos.length === 0) {
      toast.error('Nenhum item foi recebido nesta nota.')
      return
    }
    setIsSaving(true)
    try {
      const payload = {
        header: {
          chaveNfe: header?.chaveNfe || '',
          numeroNota: header?.numeroNfe || '',
          fornecedor: {
            cnpj: header?.fornecedor.cnpj || '',
            razaoSocial: header?.fornecedor.razaoSocial || '',
          },
        },
        items: recebidos.map((i) => {
          const fator = i.conversionFactor || 1
          return {
            supplierProductCode: i.codigoNota,
            supplierProductName: i.nomeNota,
            supplierUnit: i.unidadeNota,
            // A quantidade conferida já está na unidade do estoque (a nuvem não converte de novo)
            supplierQuantity: i.quantidadeReal / fator,
            stockQuantity: i.quantidadeReal,
            supplierUnitPrice: i.valorUnitarioNota,
            targetType: i.targetType,
            targetId: i.targetId,
            conversionFactor: fator,
            saveMapping: true,
            batchNumber: i.lote || null,
            expirationDate: i.validade || null,
            portioning: portioningMap?.[i.id]?.enabled
              ? portioningMap[i.id]
              : null,
          }
        }),
      }

      await api.post('/api/stock/nfe/confirm', payload)
      clearDraft()
      toast.success(
        'Entrada feita: os itens já estão no estoque e no histórico.',
      )
      navigate('/stock?tab=history')
    } catch (err) {
      // Nada foi somado: a nuvem faz tudo ou nada. O rascunho continua para corrigir e tentar de novo.
      toast.error(
        mensagemDoErro(
          err,
          'Não foi possível dar entrada. Nada foi somado; tente de novo.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-slate-900 transition-colors duration-200 selection:bg-emerald-500 selection:text-white dark:bg-[#0B0F17] dark:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/70 px-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0B0F17]/80 sm:px-8">
        {/* Logo e Módulo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span className="text-slate-900 dark:text-white">Metrics</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="rounded border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            ENTRADA DE ESTOQUE
          </span>
        </div>

        {/* Indicador de 4 Passos Central */}
        <nav className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900/80 md:flex">
          {[
            { num: 1, label: 'Origem' },
            { num: 2, label: 'Fornecedor' },
            { num: 3, label: 'Conferência' },
            { num: 4, label: 'Conclusão' },
          ].map((s) => {
            const isActive = step === s.num
            const isCompleted = step > s.num

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => isCompleted && setStep(s.num as 1 | 2 | 3 | 4)}
                disabled={!isCompleted && !isActive}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-all
                  ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-800'
                      : isCompleted
                        ? 'cursor-pointer text-emerald-600 hover:bg-slate-200 dark:text-emerald-400 dark:hover:bg-slate-800/60'
                        : 'cursor-not-allowed text-slate-600 opacity-60 dark:text-slate-400'
                  }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : isCompleted ? 'bg-emerald-500' : 'bg-slate-400'}`}
                />
                <span>
                  {s.num}. {s.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Operador, Tema e Sair (ESC) */}
        <div className="flex items-center gap-3">
          {/* Toggle Dark / Light Mode */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
            title="Alternar Tema"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Sair e Salvar Rascunho */}
          <Button
            variant="ghost"
            onClick={handleExit}
            className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <span className="font-mono text-[10px] uppercase">ESC</span>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Banner de Rascunho Encontrado */}
      {showResumeBanner && draft && (
        <div className="mx-auto mt-6 w-full max-w-4xl px-4 duration-300 animate-in slide-in-from-top-2">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 dark:bg-emerald-950/40 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Box className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Você tem uma conferência de estoque em andamento!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {draft.header?.fornecedor.razaoSocial || 'Entrada manual'} •{' '}
                  {draft.items.filter((i) => i.conferido).length} de{' '}
                  {draft.items.length} itens conferidos
                </p>
              </div>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscardDraft}
                className="h-9 flex-1 border-slate-300 text-xs font-semibold dark:border-slate-700 sm:flex-initial"
              >
                Descartar
              </Button>
              <Button
                size="sm"
                onClick={handleResumeDraft}
                className="h-9 flex-1 bg-emerald-500 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-600 sm:flex-initial"
              >
                Continuar de onde parou ↵
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Central por Capítulo */}
      <main className="flex flex-1 items-center justify-center py-6">
        {step === 1 && (
          <Step1Origin
            onSelectOrigin={handleSelectOrigin}
            isParsingXml={isParsingXml}
          />
        )}

        {step === 2 && (
          <Step2Supplier
            originMode={originMode}
            header={header}
            onConfirmSupplier={handleConfirmSupplier}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && items.length > 0 && (
          <Step3ItemFocus
            item={items[currentIndex]}
            currentIndex={currentIndex}
            totalItems={items.length}
            allItems={items}
            supplierName={header?.fornecedor.razaoSocial || 'Fornecedor'}
            nfeNumber={header?.numeroNfe}
            onValidateItem={handleValidateItem}
            onSelectIndex={(idx) => setCurrentIndex(idx)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <Step4Conclusion
            header={header}
            items={items}
            onConfirmAndSave={(portioningData) =>
              handleConfirmAndSave(portioningData)
            }
            onReviewItems={() => setStep(3)}
            isSaving={isSaving}
          />
        )}
      </main>

      {/* Footer Minimalista (matching Stitch) */}
      <footer className="flex h-12 select-none items-center justify-between border-t border-slate-200 px-4 text-xs text-slate-600 dark:border-slate-800/80 dark:text-slate-400 sm:px-8">
        <div className="hidden items-center gap-4 font-mono text-[11px] sm:flex">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-slate-300 bg-slate-200 px-1 py-0.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              Tab ⇥
            </kbd>{' '}
            Navegar
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-slate-300 bg-slate-200 px-1 py-0.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              Enter ↵
            </kbd>{' '}
            Confirmar
          </span>
        </div>
      </footer>
    </div>
  )
}
