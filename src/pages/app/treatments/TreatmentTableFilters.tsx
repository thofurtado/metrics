import { zodResolver } from '@hookform/resolvers/zod'
import { Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
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

export function TreatmentTableFilters({
  activeTab,
}: TreatmentTableFiltersProps) {
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
        status: 'all',
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
          status: status ?? 'all',
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

  const hasFilters =
    watchedFields.treatmentId ||
    watchedFields.clientName ||
    (watchedFields.status && watchedFields.status !== 'all')

  return (
    <div className="flex flex-col flex-wrap gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center">
      <div className="flex w-full flex-row items-center gap-3 lg:w-auto">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 lg:w-[300px]">
          <Search className="h-4 w-4 text-primary opacity-70" />
          <input
            {...register('clientName')}
            placeholder="Filtrar por Cliente"
            className="w-full border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex w-[100px] items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
          <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
            ID
          </span>
          <input
            {...register('treatmentId')}
            placeholder="ex: 001"
            className="w-full border-none bg-transparent text-center text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-4 lg:w-auto">
        <Controller
          name="status"
          control={control}
          render={({ field: { name, onChange, value, disabled } }) => (
            <div className="flex flex-1 items-center gap-2 rounded-full border border-border/50 bg-muted/30 py-1 pl-3 pr-1 transition-all focus-within:ring-1 focus-within:ring-primary/30 sm:w-auto">
              <span className="hidden text-nowrap text-[10px] font-bold uppercase tracking-tight text-muted-foreground sm:inline">
                Status
              </span>
              <Select
                defaultValue="all"
                name={name}
                onValueChange={onChange}
                value={value}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 w-full border-none bg-transparent px-2 text-xs font-semibold shadow-none hover:bg-white/10 focus:ring-0 sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover">
                  <SelectItem value="all" className="text-xs">
                    Todos
                  </SelectItem>
                  {(!activeTab || activeTab === 'open') && (
                    <>
                      <SelectItem value="pending" className="text-xs">
                        Pendentes
                      </SelectItem>
                      <SelectItem value="in_progress" className="text-xs">
                        Em Andamento
                      </SelectItem>
                      <SelectItem value="follow_up" className="text-xs">
                        Acompanhamento
                      </SelectItem>
                      <SelectItem value="on_hold" className="text-xs">
                        Em espera
                      </SelectItem>
                      <SelectItem value="in_workbench" className="text-xs">
                        Em Bancada
                      </SelectItem>
                    </>
                  )}
                  {(!activeTab || activeTab === 'history') && (
                    <>
                      <SelectItem value="resolved" className="text-xs">
                        Resolvidos
                      </SelectItem>
                      <SelectItem value="canceled" className="text-xs">
                        Cancelados
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full transition-colors hover:bg-red-500/10 hover:text-red-500"
            onClick={handleClearFilters}
            title="Limpar filtros"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
