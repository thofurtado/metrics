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

export function TransactionTableFilters({
  children,
}: {
  children?: React.ReactNode
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const descriptionParam = searchParams.get('description')
  const valueParam = searchParams.get('value')
  const sectorIdParam = searchParams.get('sectorId')
  const accountIdParam = searchParams.get('accountId')
  const supplierIdParam = searchParams.get('supplierId')
  const typeParam = searchParams.get('type')
  const sortByParam = searchParams.get('sortBy')
  const sortDirectionParam = searchParams.get('sortDirection')
  const combinedSortParam =
    sortByParam && sortDirectionParam
      ? `${sortByParam}-${sortDirectionParam}`
      : 'all'
  const checkedParam = searchParams.get('checked')

  const previousFilters = useRef({
    description: descriptionParam ?? '',
    value: valueParam ?? '',
    sectorId: sectorIdParam ?? 'all',
    accountId: accountIdParam ?? 'all',
    supplierId: supplierIdParam ?? 'all',
    type: typeParam ?? 'all',
    sortBy: combinedSortParam,
    checked: checkedParam ?? 'all',
  })

  const { register, control, watch, reset } = useForm<TransactionFiltersSchema>(
    {
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
    },
  )

  const watchedFields = watch()

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const {
        description,
        value,
        sectorId,
        accountId,
        supplierId,
        type,
        checked,
      } = watchedFields

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

          if (accountId && accountId !== 'all')
            state.set('accountId', accountId)
          else state.delete('accountId')

          if (supplierId && supplierId !== 'all')
            state.set('supplierId', supplierId)
          else state.delete('supplierId')

          if (type && type !== 'all') state.set('type', type)
          else state.delete('type')

          if (checked && checked !== 'all') state.set('checked', checked)
          else state.delete('checked')

          if (watchedFields.sortBy && watchedFields.sortBy !== 'all') {
            const [sortByStr, sortDirectionStr] =
              watchedFields.sortBy.split('-')
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
          checked: checked ?? 'all',
        }
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [watchedFields, setSearchParams])

  const { data: sectors } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => getSectors(),
  })
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(),
  })
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => getSuppliers({ page: 1, perPage: 1000 }),
  })

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
      description: '',
      value: '',
      sectorId: 'all',
      accountId: 'all',
      supplierId: 'all',
      type: 'all',
      sortBy: 'all',
      checked: 'all',
    })

    previousFilters.current = {
      description: '',
      value: '',
      sectorId: 'all',
      accountId: 'all',
      supplierId: 'all',
      type: 'all',
      sortBy: 'all',
      checked: 'all',
    }
  }

  const hasFilters =
    descriptionParam ||
    valueParam ||
    (sectorIdParam && sectorIdParam !== 'all') ||
    (accountIdParam && accountIdParam !== 'all') ||
    (supplierIdParam && supplierIdParam !== 'all') ||
    (typeParam && typeParam !== 'all') ||
    (sortByParam && sortByParam !== 'all') ||
    (checkedParam && checkedParam !== 'all')

  return (
    <div className="flex w-full flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900 md:p-5">
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 transition-all focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700/50 dark:bg-slate-800/50 sm:col-span-2 lg:col-span-1">
          <Search className="h-4 w-4 shrink-0 text-indigo-500" />
          <input
            {...register('description')}
            placeholder="Buscar por descrição..."
            className="w-full min-w-0 border-none bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 transition-all focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700/50 dark:bg-slate-800/50">
          <span className="shrink-0 text-xs font-black uppercase tracking-widest text-indigo-500">
            R$
          </span>
          <input
            {...register('value')}
            placeholder="0,00"
            className="w-full min-w-0 border-none bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
          />
        </div>

        <Controller
          name="type"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700/50 dark:bg-slate-800/50">
              <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:inline">
                Tipo
              </span>
              <Select
                defaultValue="all"
                name={name}
                onValueChange={onChange}
                value={value}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 min-w-0 flex-1 border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-sm font-bold">
                    Todos
                  </SelectItem>
                  <SelectItem
                    value="in"
                    className="text-sm font-bold text-emerald-600"
                  >
                    Entrada
                  </SelectItem>
                  <SelectItem
                    value="out"
                    className="text-sm font-bold text-rose-600"
                  >
                    Saída
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="sectorId"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700/50 dark:bg-slate-800/50">
              <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:inline">
                Setor
              </span>
              <Select
                defaultValue="all"
                name={name}
                onValueChange={onChange}
                value={value}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 min-w-0 flex-1 border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                  <SelectValue placeholder="Setores" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-sm font-bold">
                    Todos
                  </SelectItem>
                  {sectors?.data?.sectors?.map((sector) => (
                    <SelectItem
                      key={sector.id}
                      value={sector.id}
                      className={`text-sm font-bold ${sector.type === 'in' ? 'text-emerald-600' : 'text-rose-500'}`}
                    >
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
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700/50 dark:bg-slate-800/50">
              <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:inline">
                Conta
              </span>
              <Select
                defaultValue="all"
                name={name}
                onValueChange={onChange}
                value={value}
                disabled={disabled || isLoadingAccounts}
              >
                <SelectTrigger className="h-8 min-w-0 flex-1 border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                  <SelectValue
                    placeholder={isLoadingAccounts ? '...' : 'Contas'}
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-sm font-bold">
                    Todas
                  </SelectItem>
                  {accounts?.accounts?.map((account) => (
                    <SelectItem
                      key={account.id}
                      value={account.id}
                      className="text-sm font-bold text-slate-700"
                    >
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
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700/50 dark:bg-slate-800/50">
              <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:inline">
                Fornec.
              </span>
              <Select
                defaultValue="all"
                name={name}
                onValueChange={onChange}
                value={value}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 min-w-0 flex-1 truncate border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                  <SelectValue placeholder="Fornecedores" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-sm font-bold">
                    Todos
                  </SelectItem>
                  {[...(suppliers?.suppliers || [])]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((supplier) => (
                      <SelectItem
                        key={supplier.id}
                        value={supplier.id}
                        className="text-sm font-bold"
                      >
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
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700/50 dark:bg-slate-800/50">
              <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:inline">
                Status
              </span>
              <Select
                defaultValue="all"
                name={name}
                onValueChange={onChange}
                value={value}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 min-w-0 flex-1 border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                  <SelectValue placeholder="Auditoria" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-sm font-bold">
                    Todos
                  </SelectItem>
                  <SelectItem
                    value="true"
                    className="text-sm font-bold text-sky-600"
                  >
                    Conferidos
                  </SelectItem>
                  <SelectItem
                    value="false"
                    className="text-sm font-bold text-amber-600"
                  >
                    Pendentes
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="sortBy"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700/50 dark:bg-slate-800/50">
              <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:inline">
                Ordem
              </span>
              <Select
                defaultValue="all"
                name={name}
                onValueChange={onChange}
                value={value}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 min-w-0 flex-1 border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-sm font-bold">
                    Padrão
                  </SelectItem>
                  <SelectItem
                    value="created_at-desc"
                    className="text-sm font-bold"
                  >
                    Lançamento (Novo)
                  </SelectItem>
                  <SelectItem
                    value="created_at-asc"
                    className="text-sm font-bold"
                  >
                    Lançamento (Antigo)
                  </SelectItem>
                  <SelectItem
                    value="data_vencimento-asc"
                    className="text-sm font-bold"
                  >
                    Vencimento (Prox)
                  </SelectItem>
                  <SelectItem
                    value="data_vencimento-desc"
                    className="text-sm font-bold"
                  >
                    Vencimento (Dist)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        {children && (
          <div className="w-full md:col-span-2 xl:col-span-1">{children}</div>
        )}

        {hasFilters && (
          <div className="flex w-full items-center justify-end sm:justify-start">
            <Button
              onClick={handleClearFilter}
              type="button"
              variant="outline"
              className="h-10 w-full shrink-0 rounded-2xl border-rose-100 px-4 font-bold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 sm:w-auto md:h-11"
              title="Limpar Filtros"
            >
              <X className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
