import { zodResolver } from '@hookform/resolvers/zod'
import { Search, X } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const treatmentFiltersSchema = z.object({
  treatmentId: z.string().optional(),
  clientName: z.string().optional(),
  status: z.string().optional(),
})

type TreatmentFiltersSchema = z.infer<typeof treatmentFiltersSchema>

export function TreatmentTableFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const treatmentId = searchParams.get('treatmentId')
  const clientName = searchParams.get('clientName')
  const status = searchParams.get('status')

  const { register, handleSubmit, control, reset } =
    useForm<TreatmentFiltersSchema>({
      resolver: zodResolver(treatmentFiltersSchema),
      defaultValues: {
        treatmentId: treatmentId ?? '',
        clientName: clientName ?? '',
        status: status ?? 'all',
      },
    })

  function handleFilter({
    treatmentId,
    clientName,
    status,
  }: TreatmentFiltersSchema) {
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

      if (status) {
        state.set('status', status)
      } else {
        state.delete('status')
      }

      state.set('page', '1')

      return state
    })
  }
  function handleClearFilter() {
    setSearchParams((state) => {
      state.delete('treatmentId')
      state.delete('clientName')
      state.set('status', 'all')
      state.set('page', '1')

      return state
    })

    reset({
      treatmentId: '',
      clientName: '',
      status: 'all',
    })
  }
  return (
    <form
      onSubmit={handleSubmit(handleFilter)}
      className="flex items-center gap-2"
    >
      <span className="text-sm font-semibold ">Filtros</span>
      <Input
        placeholder="Id do atendimento"
        className="h-8 w-auto"
        {...register('treatmentId')}
      />
      <Input
        placeholder="Nome do cliente"
        className="h-8 w-[320px]"
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
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Filtros Ativos</SelectItem>
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

      <Button type="submit" variant="secondary" size="sm">
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
