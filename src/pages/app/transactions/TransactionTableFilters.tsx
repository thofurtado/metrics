
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'

import { getAccounts } from '@/api/get-accounts'
import { getSectors } from '@/api/get-sectors'
import { getSuppliers } from '@/api/get-suppliers'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  TransactionFiltersSchema,
  transactionFiltersSchema,
} from './transaction-table-filters'

export function TransactionTableFilters({ children }: { children?: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const descriptionParam = searchParams.get('description')
  const valueParam = searchParams.get('value')
  const sectorIdParam = searchParams.get('sectorId')
  const accountIdParam = searchParams.get('accountId')
  const supplierIdParam = searchParams.get('supplierId')
  const typeParam = searchParams.get('type')
  const sortByParam = searchParams.get('sortBy')
  const sortDirectionParam = searchParams.get('sortDirection')
  const combinedSortParam = sortByParam && sortDirectionParam ? `${sortByParam}-${sortDirectionParam}` : 'all'
  const checkedParam = searchParams.get('checked')

  const previousFilters = useRef({
    description: descriptionParam ?? '',
    value: valueParam ?? '',
    sectorId: sectorIdParam ?? 'all',
    accountId: accountIdParam ?? 'all',
    supplierId: supplierIdParam ?? 'all',
    type: typeParam ?? 'all',
    sortBy: combinedSortParam,
    checked: checkedParam ?? 'all'
  })

  const { register, control, watch, reset } =
    useForm<TransactionFiltersSchema>({
      resolver: zodResolver(transactionFiltersSchema),
      defaultValues: {
        description: descriptionParam ?? '',
        value: valueParam ?? '',
        sectorId: sectorIdParam ?? 'all',
        accountId: accountIdParam ?? 'all',
        supplierId: supplierIdParam ?? 'all',
        type: typeParam ?? 'all',
        sortBy: combinedSortParam,
        checked: checkedParam ?? 'all',
      },
    })

  const watchedFields = watch()

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const { description, value, sectorId, accountId, supplierId, type, checked } = watchedFields

      const hasFiltersChanged =
        description !== previousFilters.current.description ||
        value !== previousFilters.current.value ||
        sectorId !== previousFilters.current.sectorId ||
        accountId !== previousFilters.current.accountId ||
        supplierId !== previousFilters.current.supplierId ||
        type !== previousFilters.current.type ||
        checked !== previousFilters.current.checked ||
        watchedFields.sortBy !== previousFilters.current.sortBy

      if (hasFiltersChanged) {
        setSearchParams((state) => {
          if (description) state.set('description', description)
          else state.delete('description')

          if (value) state.set('value', value)
          else state.delete('value')

          if (sectorId && sectorId !== 'all') state.set('sectorId', sectorId)
          else state.delete('sectorId')

          if (accountId && accountId !== 'all') state.set('accountId', accountId)
          else state.delete('accountId')

          if (supplierId && supplierId !== 'all') state.set('supplierId', supplierId)
          else state.delete('supplierId')

          if (type && type !== 'all') state.set('type', type)
          else state.delete('type')

          if (checked && checked !== 'all') state.set('checked', checked)
          else state.delete('checked')

          if (watchedFields.sortBy && watchedFields.sortBy !== 'all') {
            const [sortByStr, sortDirectionStr] = watchedFields.sortBy.split('-')
            state.set('sortBy', sortByStr)
            state.set('sortDirection', sortDirectionStr)
          } else {
            state.delete('sortBy')
            state.delete('sortDirection')
          }

          state.set('page', '1')
          return state
        })

        previousFilters.current = {
          description: description ?? '',
          value: value ?? '',
          sectorId: sectorId ?? 'all',
          accountId: accountId ?? 'all',
          supplierId: supplierId ?? 'all',
          type: type ?? 'all',
          sortBy: watchedFields.sortBy ?? 'all',
          checked: checked ?? 'all'
        }
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [watchedFields, setSearchParams])

  const { data: sectors } = useQuery({ queryKey: ['sectors'], queryFn: () => getSectors() })
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({ queryKey: ['accounts'], queryFn: () => getAccounts() })
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => getSuppliers({ page: 1, perPage: 1000 }) })

  function handleClearFilter() {
    setSearchParams((state) => {
      state.delete('description')
      state.delete('value')
      state.delete('sectorId')
      state.delete('accountId')
      state.delete('supplierId')
      state.delete('type')
      state.delete('sortBy')
      state.delete('sortDirection')
      state.delete('checked')
      state.set('page', '1')
      return state
    })

    reset({
      description: '', value: '', sectorId: 'all', accountId: 'all', supplierId: 'all', type: 'all', sortBy: 'all', checked: 'all'
    })

    previousFilters.current = {
      description: '', value: '', sectorId: 'all', accountId: 'all', supplierId: 'all', type: 'all', sortBy: 'all', checked: 'all'
    }
  }

  const hasFilters = descriptionParam || valueParam || (sectorIdParam && sectorIdParam !== 'all') || (accountIdParam && accountIdParam !== 'all') || (supplierIdParam && supplierIdParam !== 'all') || (typeParam && typeParam !== 'all') || (sortByParam && sortByParam !== 'all') || (checkedParam && checkedParam !== 'all')

  return (
    <div className="flex flex-col p-4 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm w-full gap-4 transition-all">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-center">
        
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/40 transition-all sm:col-span-2 lg:col-span-1">
          <Search className="h-4 w-4 text-indigo-500 shrink-0" />
          <input
            {...register('description')}
            placeholder="Buscar por descrição..."
            className="bg-transparent border-none outline-none text-sm placeholder:text-slate-400 w-full font-semibold text-slate-700 dark:text-slate-200 min-w-0"
          />
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/40 transition-all">
          <span className="text-xs text-indigo-500 uppercase font-black tracking-widest shrink-0">R$</span>
          <input
            {...register('value')}
            placeholder="0,00"
            className="bg-transparent border-none outline-none text-sm placeholder:text-slate-400 w-full font-bold text-slate-700 dark:text-slate-200 min-w-0"
          />
        </div>

        <Controller
          name="type"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 py-1.5 pl-4 pr-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest hidden sm:inline shrink-0">Tipo</span>
              <Select defaultValue="all" name={name} onValueChange={onChange} value={value} disabled={disabled}>
                <SelectTrigger className="h-8 border-none bg-transparent shadow-none px-2 flex-1 text-sm font-semibold focus:ring-0 min-w-0">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-sm font-bold">Todos</SelectItem>
                  <SelectItem value="in" className="text-sm font-bold text-emerald-600">Entrada</SelectItem>
                  <SelectItem value="out" className="text-sm font-bold text-rose-600">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="sectorId"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 py-1.5 pl-4 pr-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest hidden sm:inline shrink-0">Setor</span>
              <Select defaultValue="all" name={name} onValueChange={onChange} value={value} disabled={disabled}>
                <SelectTrigger className="h-8 border-none bg-transparent shadow-none px-2 flex-1 text-sm font-semibold focus:ring-0 min-w-0">
                  <SelectValue placeholder="Setores" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-sm font-bold">Todos</SelectItem>
                  {sectors?.data?.sectors?.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id} className={`text-sm font-bold ${sector.type === 'in' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="accountId"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 py-1.5 pl-4 pr-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest hidden sm:inline shrink-0">Conta</span>
              <Select defaultValue="all" name={name} onValueChange={onChange} value={value} disabled={disabled || isLoadingAccounts}>
                <SelectTrigger className="h-8 border-none bg-transparent shadow-none px-2 flex-1 text-sm font-semibold focus:ring-0 min-w-0">
                  <SelectValue placeholder={isLoadingAccounts ? "..." : "Contas"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-sm font-bold">Todas</SelectItem>
                  {accounts?.accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id} className="text-sm font-bold text-slate-700">
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="supplierId"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 py-1.5 pl-4 pr-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest hidden sm:inline shrink-0">Fornec.</span>
              <Select defaultValue="all" name={name} onValueChange={onChange} value={value} disabled={disabled}>
                <SelectTrigger className="h-8 border-none bg-transparent shadow-none px-2 flex-1 text-sm font-semibold focus:ring-0 min-w-0 truncate">
                  <SelectValue placeholder="Fornecedores" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-sm font-bold">Todos</SelectItem>
                  {[...(suppliers?.suppliers || [])]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id} className="text-sm font-bold">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="checked"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 py-1.5 pl-4 pr-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest hidden sm:inline shrink-0">Status</span>
              <Select defaultValue="all" name={name} onValueChange={onChange} value={value} disabled={disabled}>
                <SelectTrigger className="h-8 border-none bg-transparent shadow-none px-2 flex-1 text-sm font-semibold focus:ring-0 min-w-0">
                  <SelectValue placeholder="Auditoria" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-sm font-bold">Todos</SelectItem>
                  <SelectItem value="true" className="text-sm font-bold text-sky-600">Conferidos</SelectItem>
                  <SelectItem value="false" className="text-sm font-bold text-amber-600">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="sortBy"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 py-1.5 pl-4 pr-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest hidden sm:inline shrink-0">Ordem</span>
              <Select defaultValue="all" name={name} onValueChange={onChange} value={value} disabled={disabled}>
                <SelectTrigger className="h-8 border-none bg-transparent shadow-none px-2 flex-1 text-sm font-semibold focus:ring-0 min-w-0">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-sm font-bold">Padrão</SelectItem>
                  <SelectItem value="created_at-desc" className="text-sm font-bold">Lançamento (Novo)</SelectItem>
                  <SelectItem value="created_at-asc" className="text-sm font-bold">Lançamento (Antigo)</SelectItem>
                  <SelectItem value="data_vencimento-asc" className="text-sm font-bold">Vencimento (Prox)</SelectItem>
                  <SelectItem value="data_vencimento-desc" className="text-sm font-bold">Vencimento (Dist)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        {children && (
          <div className="xl:col-span-1 md:col-span-2 w-full">
            {children}
          </div>
        )}

        {hasFilters && (
          <div className="flex items-center justify-end sm:justify-start w-full">
            <Button
              onClick={handleClearFilter}
              type="button"
              variant="outline"
              className="h-10 md:h-11 px-4 rounded-2xl hover:bg-rose-50 text-rose-600 hover:text-rose-700 border-rose-100 transition-colors shrink-0 font-bold w-full sm:w-auto"
              title="Limpar Filtros"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}