import { zodResolver } from '@hookform/resolvers/zod'
import { Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  TreatmentFiltersSchema,
  treatmentFiltersSchema,
} from './treatment-table-filters'

export function TreatmentTableFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const previousFilters = useRef({
    treatmentId: searchParams.get('treatmentId') ?? '',
    clientName: searchParams.get('clientName') ?? '',
    status: searchParams.get('status') ?? 'all',
  })

  const treatmentId = searchParams.get('treatmentId')
  const clientName = searchParams.get('clientName')
  const status = searchParams.get('status')

  const { register, control, watch } = useForm<TreatmentFiltersSchema>({
    resolver: zodResolver(treatmentFiltersSchema),
    defaultValues: {
      treatmentId: treatmentId ?? '',
      clientName: clientName ?? '',
      status: status ?? 'all',
    },
  })

  const watchedFields = watch()

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const { treatmentId, clientName, status } = watchedFields

      // Verifica se realmente houve mudança nos filtros
      const hasFiltersChanged = 
        treatmentId !== previousFilters.current.treatmentId ||
        clientName !== previousFilters.current.clientName ||
        status !== previousFilters.current.status

      if (hasFiltersChanged) {
        setSearchParams((state) => {
          if (treatmentId) {
            state.set('treatmentId', treatmentId)
          } else {
            state.delete('treatmentId')
          }

          if (clientName) {
            state.set('clientName', clientName)
          } else {
            state.delete('clientName')
          }

          if (status && status !== 'all') {
            state.set('status', status)
          } else {
            state.delete('status')
          }

          // Só reseta a página se os filtros mudaram
          state.set('page', '1')

          return state
        })

        // Atualiza a referência
        previousFilters.current = { treatmentId, clientName, status }
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [watchedFields, setSearchParams])

  return (
    <div className="font-gaba flex items-center gap-2">
      <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      
      <Input
        placeholder="Filtrar por ID"
        className="hidden h-8 w-[0px] placeholder:text-slate-500 sm:block sm:w-[180px]"
        {...register('treatmentId')}
      />

      <Input
        placeholder="Filtrar por Cliente"
        className="h-8 w-full placeholder:text-slate-500 sm:w-[180px]"
        {...register('clientName')}
      />

      <Controller
        name="status"
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
              <SelectTrigger className="h-8 w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="follow_up">Acompanhamento</SelectItem>
                <SelectItem value="canceled">Cancelados</SelectItem>
                <SelectItem value="on_hold">Em espera</SelectItem>
                <SelectItem value="in_workbench">Em Bancada</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
              </SelectContent>
            </Select>
          )
        }}
      />
    </div>
  )
}