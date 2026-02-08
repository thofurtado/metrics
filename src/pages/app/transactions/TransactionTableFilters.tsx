
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
import { Input } from '@/components/ui/input'
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

  const previousFilters = useRef({
    description: descriptionParam ?? '',
    value: valueParam ?? '',
    sectorId: sectorIdParam ?? 'all',
    accountId: accountIdParam ?? 'all',
    supplierId: supplierIdParam ?? 'all',
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
      },
    })

  const watchedFields = watch()

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const { description, value, sectorId, accountId, supplierId } = watchedFields

      // Verifica se realmente houve mudança nos filtros
      const hasFiltersChanged =
        description !== previousFilters.current.description ||
        value !== previousFilters.current.value ||
        sectorId !== previousFilters.current.sectorId ||
        accountId !== previousFilters.current.accountId ||
        supplierId !== previousFilters.current.supplierId

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
          supplierId: supplierId ?? 'all'
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
      state.set('page', '1')
      return state
    })

    reset({
      description: '',
      value: '',
      sectorId: 'all',
      accountId: 'all',
      supplierId: 'all',
    })

    // Atualiza a referência ao limpar filtros
    previousFilters.current = {
      description: '',
      value: '',
      sectorId: 'all',
      accountId: 'all',
      supplierId: 'all',
    }
  }

  const hasFilters = descriptionParam || valueParam || (sectorIdParam && sectorIdParam !== 'all') || (accountIdParam && accountIdParam !== 'all') || (supplierIdParam && supplierIdParam !== 'all')

  return (
    <div className="flex items-center gap-2 font-gaba">
      <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />

      <Input
        placeholder="Descrição"
        className="h-8 w-20 text-xs sm:w-[160px] sm:text-sm sm:placeholder:text-muted-foreground"
        {...register('description')}
      />

      <Input
        placeholder="Valor"
        className="h-8 w-16 text-xs text-center sm:w-[160px] sm:text-sm sm:placeholder:text-muted-foreground"
        {...register('value')}
      />

      <Controller
        name="sectorId"
        control={control}
        render={({ field: { name, onChange, value, disabled } }) => {
          return (
            <Select
              defaultValue="all"
              name={name}
              onValueChange={onChange}
              value={value}
              disabled={disabled}
            >
              <SelectTrigger
                className="h-8 w-20 text-xs sm:w-[160px] sm:text-sm"
                aria-label="Setores"
              >
                <SelectValue placeholder="Setores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs sm:text-sm">Todos os Setores</SelectItem>
                {sectors?.data?.sectors?.map((sector) => (
                  <SelectItem
                    value={sector.id}
                    key={sector.id}
                    className={`text-xs sm:text-sm ${sector.type === 'in' ? 'text-vida-loca-500' : 'text-stiletto-400'}`}
                  >
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }}
      />

      <Controller
        name="accountId"
        control={control}
        render={({ field: { name, onChange, value, disabled } }) => {
          return (
            <Select
              defaultValue="all"
              name={name}
              onValueChange={onChange}
              value={value}
              disabled={disabled || isLoadingAccounts}
            >
              <SelectTrigger
                className="h-8 w-20 text-xs sm:w-[160px] sm:text-sm"
                aria-label="Contas"
              >
                <SelectValue placeholder={isLoadingAccounts ? "Carregando..." : "Contas"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs sm:text-sm">Todas as Contas</SelectItem>
                {accounts?.accounts?.map((account) => (
                  <SelectItem value={account.id} key={account.id} className="text-xs sm:text-sm">
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }}
      />

      <Controller
        name="supplierId"
        control={control}
        render={({ field: { name, onChange, value, disabled } }) => {
          return (
            <Select
              defaultValue="all"
              name={name}
              onValueChange={onChange}
              value={value}
              disabled={disabled}
            >
              <SelectTrigger
                className="h-8 w-20 text-xs sm:w-[160px] sm:text-sm"
                aria-label="Fornecedores"
              >
                <SelectValue placeholder="Fornecedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs sm:text-sm">Todos os Fornecedores</SelectItem>
                {suppliers?.suppliers?.map((supplier) => (
                  <SelectItem value={supplier.id} key={supplier.id} className="text-xs sm:text-sm">
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }}
      />

      {hasFilters && (
        <Button
          onClick={handleClearFilter}
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs flex-shrink-0"
          aria-label="Limpar Filtros"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}