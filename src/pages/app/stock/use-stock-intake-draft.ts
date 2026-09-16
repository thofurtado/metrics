import { useState, useCallback } from 'react'

export interface PortioningConfig {
  enabled: boolean
  portionSizeGrams: number
  portionCount: number
  trimGrams: number
  costPerPortion: number
  portionSupplyName: string
}

export interface StockIntakeItem {
  id: string
  codigoNota: string
  nomeNota: string
  unidadeNota: string
  quantidadeNota: number
  valorUnitarioNota: number
  valorTotalNota: number

  // Mapeamento De-Para
  targetType: 'SUPPLY' | 'PRODUCT'
  targetId?: string
  targetName?: string
  isNewItem: boolean
  conversionFactor: number // ex: 24 se 1 cx = 24 un

  // Decisões da conferência física
  conferido: boolean
  divergencia: boolean
  quantidadeReal: number
  unidadeEstoque: string
  naoEntregue: boolean
  lote?: string
  validade?: string
  observacao?: string
  portioning?: PortioningConfig
}

export interface StockIntakeDraft {
  id: string
  updatedAt: string
  step: 1 | 2 | 3 | 4
  originMode: 'XML' | 'MANUAL'
  rawXml?: string
  header?: {
    numeroNfe: string
    chaveNfe?: string
    dataEmissao?: string
    fornecedor: {
      cnpj: string
      razaoSocial: string
      nomeFantasia?: string
    }
    valorTotal: number
  }
  items: StockIntakeItem[]
  currentItemIndex: number
}

const STORAGE_KEY = '@metrics:stock_intake_draft'

export function useStockIntakeDraft() {
  const [draft, setDraft] = useState<StockIntakeDraft | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const saveDraft = useCallback((currentData: Partial<StockIntakeDraft>) => {
    setDraft((prev) => {
      const updated: StockIntakeDraft = {
        id: prev?.id || crypto.randomUUID(),
        step: currentData.step ?? prev?.step ?? 1,
        originMode: currentData.originMode ?? prev?.originMode ?? 'XML',
        rawXml: currentData.rawXml ?? prev?.rawXml,
        header: currentData.header ?? prev?.header,
        items: currentData.items ?? prev?.items ?? [],
        currentItemIndex: currentData.currentItemIndex ?? prev?.currentItemIndex ?? 0,
        updatedAt: new Date().toISOString(),
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (err) {
        console.error('Erro ao salvar rascunho de estoque:', err)
      }
      return updated
    })
  }, [])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.error('Erro ao remover rascunho:', err)
    }
    setDraft(null)
  }, [])

  return {
    draft,
    saveDraft,
    clearDraft,
  }
}
