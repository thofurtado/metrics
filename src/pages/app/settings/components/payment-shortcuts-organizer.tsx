import { useState, useEffect, useMemo } from 'react'
import { ArrowUp, ArrowDown, ListOrdered, Save } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { getPaymentIdentifiers } from '@/api/payment-identifiers'
import { getPOSMachines } from '@/api/pos-machines'
import { getAccounts } from '@/api/get-accounts'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export function PaymentShortcutsOrganizer() {
  const [isOpen, setIsOpen] = useState(false)
  const [formsOrder, setFormsOrder] = useState<string[]>([])
  const [conditionsOrder, setConditionsOrder] = useState<string[]>([])

  const { data: dbIdentifiers } = useQuery({
    queryKey: ['payment-identifiers'],
    queryFn: getPaymentIdentifiers,
  })

  const { data: dbMachines } = useQuery({
    queryKey: ['pos-machines'],
    queryFn: getPOSMachines,
  })

  const { data: dbAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })

  // Gerar listas base idênticas ao TransactionForm
  const baseForms = useMemo(() => {
    const base = ['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Voucher']
    if (dbIdentifiers && dbIdentifiers.length > 0) {
      dbIdentifiers.forEach(idItem => base.push(idItem.name))
    } else {
      base.push('Funcionário', 'Pró-labore', 'Cortesia', 'Permuta')
    }
    return base
  }, [dbIdentifiers])

  const baseConditions = useMemo(() => {
    let base = []
    if (dbMachines && dbMachines.length > 0) {
      base = dbMachines.map(m => m.name)
    } else if (dbAccounts && dbAccounts.accounts && dbAccounts.accounts.length > 0) {
      base = dbAccounts.accounts.map(acc => acc.name)
    } else {
      base = ['SAFRA', 'PAGBANK', 'CIELO', 'IFOOD', 'STONE']
    }
    return base
  }, [dbMachines, dbAccounts])

  // Inicializar estado com a ordem salva ou a ordem base
  useEffect(() => {
    if (isOpen) {
      const savedForms = localStorage.getItem('metrics-payment-forms-order')
      if (savedForms) {
        try {
          const parsed = JSON.parse(savedForms)
          const merged = [...parsed]
          baseForms.forEach(f => {
            if (!merged.includes(f)) merged.push(f)
          })
          setFormsOrder(merged.filter(f => baseForms.includes(f)))
        } catch (e) {}
      } else {
        setFormsOrder(baseForms)
      }

      const savedConditions = localStorage.getItem('metrics-payment-conditions-order')
      if (savedConditions) {
        try {
          const parsed = JSON.parse(savedConditions)
          const merged = [...parsed]
          baseConditions.forEach(c => {
            if (!merged.includes(c)) merged.push(c)
          })
          setConditionsOrder(merged.filter(c => baseConditions.includes(c)))
        } catch (e) {}
      } else {
        setConditionsOrder(baseConditions)
      }
    }
  }, [isOpen, baseForms, baseConditions])

  const handleMove = (listType: 'forms' | 'conditions', index: number, direction: 'up' | 'down') => {
    const list = listType === 'forms' ? [...formsOrder] : [...conditionsOrder]
    const setList = listType === 'forms' ? setFormsOrder : setConditionsOrder

    if (direction === 'up' && index > 0) {
      const temp = list[index - 1]
      list[index - 1] = list[index]
      list[index] = temp
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index + 1]
      list[index + 1] = list[index]
      list[index] = temp
    }

    setList(list)
  }

  const handleSave = () => {
    localStorage.setItem('metrics-payment-forms-order', JSON.stringify(formsOrder))
    localStorage.setItem('metrics-payment-conditions-order', JSON.stringify(conditionsOrder))
    toast.success('Ordem dos atalhos salva com sucesso!')
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          variant="outline"
          className="border-primary/20 text-primary hover:bg-primary/5 transition-all"
        >
          <ListOrdered className="mr-2 h-5 w-5" /> Organizar Atalhos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="text-primary h-5 w-5" /> Organizar Atalhos Numéricos
          </DialogTitle>
          <DialogDescription>
            Use as setas para definir a ordem que aparecerá no PDV (Conferência de Caixa). A ordem definida aqui é salva localmente neste computador.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 py-4 px-2">
          {/* Coluna 1: Formas de Pagamento */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">1</span>
              Formas de Pagamento
            </h3>
            <div className="flex flex-col gap-2">
              {formsOrder.map((formName, index) => (
                <div key={formName} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 shadow-sm group">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black text-slate-400 w-4">{index + 1}.</span>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{formName}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleMove('forms', index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded bg-white hover:bg-slate-200 border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMove('forms', index, 'down')}
                      disabled={index === formsOrder.length - 1}
                      className="p-1 rounded bg-white hover:bg-slate-200 border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna 2: Bancos e Máquinas */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="bg-emerald-500/10 text-emerald-600 w-6 h-6 rounded flex items-center justify-center text-xs">2</span>
              Bancos / Operadoras
            </h3>
            <div className="flex flex-col gap-2">
              {conditionsOrder.map((conditionName, index) => (
                <div key={conditionName} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 shadow-sm group">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black text-slate-400 w-4">{index + 1}.</span>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{conditionName}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleMove('conditions', index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded bg-white hover:bg-slate-200 border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMove('conditions', index, 'down')}
                      disabled={index === conditionsOrder.length - 1}
                      className="p-1 rounded bg-white hover:bg-slate-200 border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button onClick={handleSave} className="gap-2">
            <Save size={16} /> Salvar Ordem
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
