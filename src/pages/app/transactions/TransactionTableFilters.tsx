
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

export function TransactionTableFilters() {
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

  const previousFilters = useRef({
    description: descriptionParam ?? '',
    value: valueParam ?? '',
    sectorId: sectorIdParam ?? 'all',
    accountId: accountIdParam ?? 'all',
    supplierId: supplierIdParam ?? 'all',
    supplierId: supplierIdParam ?? 'all',
    type: typeParam ?? 'all',
    sortBy: combinedSortParam
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
        supplierId: supplierIdParam ?? 'all',
        type: typeParam ?? 'all',
        sortBy: combinedSortParam,
      },
    })

  const watchedFields = watch()

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const { description, value, sectorId, accountId, supplierId, type } = watchedFields

      // Verifica se realmente houve mudança nos filtros
      const hasFiltersChanged =
        description !== previousFilters.current.description ||
        value !== previousFilters.current.value ||
        sectorId !== previousFilters.current.sectorId ||
        accountId !== previousFilters.current.accountId ||
        supplierId !== previousFilters.current.supplierId ||
        type !== previousFilters.current.type ||
        watchedFields.sortBy !== previousFilters.current.sortBy

      if (hasFiltersChanged) {
        setSearchParams((state) => {
          if (description) {
            state.set('description', description)
          } else {
            state.delete('description')
          }

          if (value) {
            state.set('value', value)
          } else {
            state.delete('value')
          }

          if (sectorId && sectorId !== 'all') {
            state.set('sectorId', sectorId)
          } else {
            state.delete('sectorId')
          }

          if (accountId && accountId !== 'all') {
            state.set('accountId', accountId)
          } else {
            state.delete('accountId')
          }

          if (supplierId && supplierId !== 'all') {
            state.set('supplierId', supplierId)
          } else {
            state.delete('supplierId')
          }

          if (type && type !== 'all') {
            state.set('type', type)
          } else {
            state.delete('type')
          }

          if (watchedFields.sortBy && watchedFields.sortBy !== 'all') {
            const [sortByStr, sortDirectionStr] = watchedFields.sortBy.split('-')
            state.set('sortBy', sortByStr)
            state.set('sortDirection', sortDirectionStr)
          } else {
            state.delete('sortBy')
            state.delete('sortDirection')
          }

          // Só reseta a página se os filtros mudaram
          state.set('page', '1')

          return state
        })

        // Atualiza a referência
        previousFilters.current = {
          description: description ?? '',
          value: value ?? '',
          sectorId: sectorId ?? 'all',
          accountId: accountId ?? 'all',
          supplierId: supplierId ?? 'all',
          type: type ?? 'all',
          sortBy: watchedFields.sortBy ?? 'all'
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
      sortBy: 'all'
    })

    // Atualiza a referência ao limpar filtros
    previousFilters.current = {
      description: '',
      value: '',
      sectorId: 'all',
      accountId: 'all',
      supplierId: 'all',
      type: 'all',
      sortBy: 'all'
    }
  }

  const hasFilters = descriptionParam || valueParam || (sectorIdParam && sectorIdParam !== 'all') || (accountIdParam && accountIdParam !== 'all') || (supplierIdParam && supplierIdParam !== 'all') || (typeParam && typeParam !== 'all') || (sortByParam && sortByParam !== 'all')

  return (
    <div className="flex flex-col lg:flex-row lg:items-center flex-wrap gap-4 p-5 md:p-4 bg-card border border-border rounded-2xl shadow-sm">
      {/* Search and Value Group - MOBILE FLEX ROW */}
      <div className="flex flex-row items-center gap-3 w-full lg:w-auto">
        <div className="flex items-center gap-2 px-3 py-2.5 md:py-1.5 bg-muted/30 rounded-2xl border border-border/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all flex-1 lg:w-[220px]">
          <Search className="h-4 w-4 text-primary opacity-70" />
          <input
            {...register('description')}
            placeholder="Descrição"
            className="bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground w-full font-medium"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 md:py-1.5 bg-muted/30 rounded-2xl border border-border/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all w-[110px] sm:w-[120px]">
          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">Vlr</span>
          <input
            {...register('value')}
            placeholder="0,00"
            className="bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground w-full text-center font-bold"
          />
        </div>
      </div>

      {/* Selectors Group */}
      <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-3 w-full lg:w-auto">
        <Controller
          name="type"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex items-center gap-2 bg-muted/30 py-1 pl-3 pr-1 rounded-full border border-border/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all flex-1 sm:w-auto">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight hidden sm:inline">Tipo</span>
              <Select defaultValue="all" name={name} onValueChange={onChange} value={value} disabled={disabled}>
                <SelectTrigger className="h-8 border-none bg-transparent hover:bg-white/10 shadow-none px-2 flex-1 lg:w-[100px] text-xs font-semibold focus:ring-0">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  <SelectItem value="in" className="text-xs text-green-500">Entrada</SelectItem>
                  <SelectItem value="out" className="text-xs text-red-500">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="sectorId"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex items-center gap-2 bg-muted/30 py-1 pl-3 pr-1 rounded-full border border-border/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all flex-1 sm:w-auto">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight hidden sm:inline">Setor</span>
              <Select defaultValue="all" name={name} onValueChange={onChange} value={value} disabled={disabled}>
                <SelectTrigger className="h-8 border-none bg-transparent hover:bg-white/10 shadow-none px-2 flex-1 lg:w-[130px] text-xs font-semibold focus:ring-0">
                  <SelectValue placeholder="Setores" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  {sectors?.data?.sectors?.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id} className={`text-xs ${sector.type === 'in' ? 'text-green-500' : 'text-red-400'}`}>
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
            <div className="flex items-center gap-2 bg-muted/30 py-1 pl-3 pr-1 rounded-full border border-border/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all flex-1 sm:w-auto">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight hidden sm:inline">Conta</span>
              <Select defaultValue="all" name={name} onValueChange={onChange} value={value} disabled={disabled || isLoadingAccounts}>
                <SelectTrigger className="h-8 border-none bg-transparent hover:bg-white/10 shadow-none px-2 flex-1 lg:w-[130px] text-xs font-semibold focus:ring-0">
                  <SelectValue placeholder={isLoadingAccounts ? "..." : "Contas"} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all" className="text-xs">Todas</SelectItem>
                  {accounts?.accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id} className="text-xs">
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
            <div className="flex items-center gap-2 bg-muted/30 py-1 pl-3 pr-1 rounded-full border border-border/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all flex-1 sm:w-auto">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight hidden sm:inline">Fornec.</span>
              <Select defaultValue="all" name={name} onValueChange={onChange} value={value} disabled={disabled}>
                <SelectTrigger className="h-8 border-none bg-transparent hover:bg-white/10 shadow-none px-2 flex-1 lg:w-[130px] text-xs font-semibold focus:ring-0">
                  <SelectValue placeholder="Fornecedores" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  {[...(suppliers?.suppliers || [])]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id} className="text-xs">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="sortBy"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex items-center gap-2 bg-muted/30 py-1 pl-3 pr-1 rounded-full border border-border/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all flex-1 sm:w-auto">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight hidden sm:inline">Ordem</span>
              <Select defaultValue="all" name={name} onValueChange={onChange} value={value} disabled={disabled}>
                <SelectTrigger className="h-8 border-none bg-transparent hover:bg-white/10 shadow-none px-2 flex-1 lg:w-[150px] text-xs font-semibold focus:ring-0">
                  <SelectValue placeholder="Ordenar Por" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all" className="text-xs">Padrão</SelectItem>
                  <SelectItem value="created_at-desc" className="text-xs">Lançamento (Mais novo)</SelectItem>
                  <SelectItem value="created_at-asc" className="text-xs">Lançamento (Mais antigo)</SelectItem>
                  <SelectItem value="data_vencimento-asc" className="text-xs">Vencimento (Mais prox)</SelectItem>
                  <SelectItem value="data_vencimento-desc" className="text-xs">Vencimento (Mais dist)</SelectItem>
                  <SelectItem value="data_emissao-desc" className="text-xs">Emissão (Mais novo)</SelectItem>
                  <SelectItem value="data_emissao-asc" className="text-xs">Emissão (Mais antigo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        {hasFilters && (
          <div className="flex items-center justify-center sm:w-auto h-full">
            <Button
              onClick={handleClearFilter}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors flex-shrink-0"
              title="Limpar Filtros"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}