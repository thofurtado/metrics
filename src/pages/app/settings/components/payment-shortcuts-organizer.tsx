import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ListOrdered, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { getAccounts } from '@/api/get-accounts'
import { getPaymentIdentifiers } from '@/api/payment-identifiers'
import { getPOSMachines } from '@/api/pos-machines'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

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
      dbIdentifiers.forEach((idItem) => base.push(idItem.name))
    } else {
      base.push('Funcionário', 'Pró-labore', 'Cortesia', 'Permuta')
    }
    return base
  }, [dbIdentifiers])

  const baseConditions = useMemo(() => {
    let base = []
    if (dbMachines && dbMachines.length > 0) {
      base = dbMachines.map((m) => m.name)
    } else if (
      dbAccounts &&
      dbAccounts.accounts &&
      dbAccounts.accounts.length > 0
    ) {
      base = dbAccounts.accounts.map((acc) => acc.name)
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
          baseForms.forEach((f) => {
            if (!merged.includes(f)) merged.push(f)
          })
          setFormsOrder(merged.filter((f) => baseForms.includes(f)))
        } catch (e) {}
      } else {
        setFormsOrder(baseForms)
      }

      const savedConditions = localStorage.getItem(
        'metrics-payment-conditions-order',
      )
      if (savedConditions) {
        try {
          const parsed = JSON.parse(savedConditions)
          const merged = [...parsed]
          baseConditions.forEach((c) => {
            if (!merged.includes(c)) merged.push(c)
          })
          setConditionsOrder(merged.filter((c) => baseConditions.includes(c)))
        } catch (e) {}
      } else {
        setConditionsOrder(baseConditions)
      }
    }
  }, [isOpen, baseForms, baseConditions])

  const handleMove = (
    listType: 'forms' | 'conditions',
    index: number,
    direction: 'up' | 'down',
  ) => {
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
    localStorage.setItem(
      'metrics-payment-forms-order',
      JSON.stringify(formsOrder),
    )
    localStorage.setItem(
      'metrics-payment-conditions-order',
      JSON.stringify(conditionsOrder),
    )
    toast.success('Ordem dos atalhos salva com sucesso!')
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          variant="outline"
          className="border-primary/20 text-primary transition-all hover:bg-primary/5"
        >
          <ListOrdered className="mr-2 h-5 w-5" /> Organizar Atalhos
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-primary" /> Organizar Atalhos
            Numéricos
          </DialogTitle>
          <DialogDescription>
            Use as setas para definir a ordem que aparecerá no PDV (Conferência
            de Caixa). A ordem definida aqui é salva localmente neste
            computador.
          </DialogDescription>
        </DialogHeader>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto px-2 py-4 md:grid-cols-2">
          {/* Coluna 1: Formas de Pagamento */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs text-primary">
                1
              </span>
              Formas de Pagamento
            </h3>
            <div className="flex flex-col gap-2">
              {formsOrder.map((formName, index) => (
                <div
                  key={formName}
                  className="group flex items-center justify-between rounded-lg border bg-slate-50 p-3 shadow-sm dark:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-4 font-mono text-xs font-black text-slate-400">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {formName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-50 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleMove('forms', index, 'up')}
                      disabled={index === 0}
                      className="rounded border bg-white p-1 shadow-sm hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMove('forms', index, 'down')}
                      disabled={index === formsOrder.length - 1}
                      className="rounded border bg-white p-1 shadow-sm hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
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
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-xs text-emerald-600">
                2
              </span>
              Bancos / Operadoras
            </h3>
            <div className="flex flex-col gap-2">
              {conditionsOrder.map((conditionName, index) => (
                <div
                  key={conditionName}
                  className="group flex items-center justify-between rounded-lg border bg-slate-50 p-3 shadow-sm dark:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-4 font-mono text-xs font-black text-slate-400">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {conditionName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-50 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleMove('conditions', index, 'up')}
                      disabled={index === 0}
                      className="rounded border bg-white p-1 shadow-sm hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMove('conditions', index, 'down')}
                      disabled={index === conditionsOrder.length - 1}
                      className="rounded border bg-white p-1 shadow-sm hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button onClick={handleSave} className="gap-2">
            <Save size={16} /> Salvar Ordem
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
