import { zodResolver } from '@hookform/resolvers/zod'
import { Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'

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
  TreatmentFiltersSchema,
  treatmentFiltersSchema,
} from './treatment-table-filters'

interface TreatmentTableFiltersProps {
  activeTab?: string
}

export function TreatmentTableFilters({ activeTab }: TreatmentTableFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const previousFilters = useRef({
    treatmentId: searchParams.get('treatmentId') ?? '',
    clientName: searchParams.get('clientName') ?? '',
    status: searchParams.get('status') ?? 'all',
  })

  const treatmentId = searchParams.get('treatmentId')
  const clientName = searchParams.get('clientName')
  const status = searchParams.get('status')

  const { register, control, watch, reset } = useForm<TreatmentFiltersSchema>({
    resolver: zodResolver(treatmentFiltersSchema),
    defaultValues: {
      treatmentId: treatmentId ?? '',
      clientName: clientName ?? '',
      status: status ?? 'all',
    },
  })

  const watchedFields = watch()

  // Reset Select when activeTab changes if the current status is not compatible? 
  // actually handleTabChange in parent already removes 'status' param.
  // We just need to ensure the form syncs with URL.
  useEffect(() => {
    if (!status) {
      reset({
        treatmentId: treatmentId ?? '',
        clientName: clientName ?? '',
        status: 'all'
      })
    }
  }, [activeTab, status, reset, treatmentId, clientName])


  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const { treatmentId, clientName, status } = watchedFields

      const hasFiltersChanged =
        treatmentId !== previousFilters.current.treatmentId ||
        clientName !== previousFilters.current.clientName ||
        status !== previousFilters.current.status

      if (hasFiltersChanged) {
        setSearchParams((state) => {
          if (treatmentId) state.set('treatmentId', treatmentId)
          else state.delete('treatmentId')

          if (clientName) state.set('clientName', clientName)
          else state.delete('clientName')

          if (status && status !== 'all') state.set('status', status)
          else state.delete('status')

          state.set('page', '1')

          return state
        })

        previousFilters.current = {
          treatmentId: treatmentId ?? '',
          clientName: clientName ?? '',
          status: status ?? 'all'
        }
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [watchedFields, setSearchParams])

  function handleClearFilters() {
    setSearchParams((state) => {
      state.delete('treatmentId')
      state.delete('clientName')
      state.delete('status')
      state.set('page', '1')
      return state
    })

    reset({
      treatmentId: '',
      clientName: '',
      status: 'all',
    })

    previousFilters.current = { treatmentId: '', clientName: '', status: 'all' }
  }

  const hasFilters = watchedFields.treatmentId || watchedFields.clientName || (watchedFields.status && watchedFields.status !== 'all')

  return (
    <div className="font-gaba flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          placeholder="Filtrar por Cliente"
          className="h-8 w-full sm:w-[250px]"
          {...register('clientName')}
        />
      </div>

      <Input
        placeholder="ID"
        className="h-8 w-[80px]"
        {...register('treatmentId')}
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
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>

                {(!activeTab || activeTab === 'open') && (
                  <>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="follow_up">Acompanhamento</SelectItem>
                    <SelectItem value="on_hold">Em espera</SelectItem>
                    <SelectItem value="in_workbench">Em Bancada</SelectItem>
                  </>
                )}

                {(!activeTab || activeTab === 'history') && (
                  <>
                    <SelectItem value="resolved">Resolvidos</SelectItem>
                    <SelectItem value="canceled">Cancelados</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          )
        }}
      />

      {hasFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleClearFilters}
          title="Limpar filtros"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}