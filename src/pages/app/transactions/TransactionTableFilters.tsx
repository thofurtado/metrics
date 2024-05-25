import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'

import { getAccounts } from '@/api/get-accounts'
import { getSectors } from '@/api/get-sectors'
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
  const [isFiltered, setIsFiltered] = useState(false)

  const description = searchParams.get('description')
  const value = searchParams.get('value')
  const sectorId = searchParams.get('sectorId')
  const accountId = searchParams.get('accountId')

  const { register, handleSubmit, control, reset } =
    useForm<TransactionFiltersSchema>({
      resolver: zodResolver(transactionFiltersSchema),
      defaultValues: {
        description: description ?? '',
        value: value ?? '',
        sectorId: sectorId ?? 'all',
        accountId: accountId ?? 'all',
      },
    })
  const { data: sectors } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => getSectors(),
  })
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(),
  })

  function handleFilter({
    description,
    value,
    sectorId,
    accountId,
  }: TransactionFiltersSchema) {
    console.log(value)
    setIsFiltered(true)
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

      if (sectorId) {
        state.set('sectorId', sectorId)
      } else {
        state.delete('sectorId')
      }

      if (accountId) {
        state.set('accountId', accountId)
      } else {
        state.delete('accountId')
      }
      state.set('page', '1')

      return state
    })
  }

  function handleClearFilter() {
    setIsFiltered(false)
    setSearchParams((state) => {
      state.delete('description')
      state.delete('value')
      state.set('sectorId', 'all')
      state.set('accountId', 'all')
      state.set('page', '1')

      return state
    })

    reset({
      description: '',
      value: '',
      sectorId: 'all',
      accountId: 'all',
    })
  }
  return (
    <form
      onSubmit={handleSubmit(handleFilter)}
      className="flex items-center justify-end gap-2"
    >
      <Input
        placeholder="Descrição aproximada"
        className="h-8 w-auto"
        {...register('description')}
      />
      <Input
        placeholder="Valor Específico"
        className="h-8 w-1/12"
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
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Setores</SelectItem>
                {sectors &&
                  sectors.data.sectors.map((sector) => (
                    <SelectItem
                      value={sector.id}
                      key={sector.id}
                      className={`${sector.type === 'in' ? 'text-vida-loca-500' : 'text-stiletto-400'}`}
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
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Contas</SelectItem>
                {accounts &&
                  accounts.data.accounts.map((account) => (
                    <SelectItem value={account.id} key={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )
        }}
      />

      <Button type="submit" size="sm" variant="secondary">
        <Search className="mr-2 h-4 w-4" />
        Filtrar resultados
      </Button>
      <Button
        onClick={handleClearFilter}
        type="button"
        variant="outline"
        size="sm"
      >
        <X className="mr-2 h-4 w-4" />
        Remover filtros
      </Button>
    </form>
  )
}
