import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  createCustomHoliday,
  listHolidays,
  removeHoliday,
} from '@/api/hr/holidays'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const customHolidaySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
})

export function HrRulesSettings() {
  const [year, setYear] = useState(new Date().getFullYear())
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => listHolidays(year),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof customHolidaySchema>>({
    resolver: zodResolver(customHolidaySchema),
  })

  const createMutation = useMutation({
    mutationFn: createCustomHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
      toast.success('Feriado adicionado com sucesso!')
      reset()
    },
    onError: () => toast.error('Erro ao adicionar feriado.'),
  })

  const deleteMutation = useMutation({
    mutationFn: removeHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
      toast.success('Feriado removido com sucesso!')
    },
    onError: () => toast.error('Erro ao remover feriado.'),
  })

  const handleAdd = (formData: z.infer<typeof customHolidaySchema>) => {
    createMutation.mutate({
      name: formData.name,
      date: formData.date,
      type: 'MUNICIPAL',
    })
  }

  return (
    <div className="space-y-6">
      {/* Information Cards about CLT Rules */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-blue-50/20 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>Regras de Horas Extras & Jornada</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            A jornada padrão é de <strong>7h20 diárias</strong> (440 minutos), com tolerância CLT de <strong>10 minutos</strong>. Excedentes em dias normais são calculados a <strong>+60%</strong>. Aos domingos e feriados, aplica-se o adicional de <strong>+100%</strong>.
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-purple-50/20 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
            <Info className="h-4 w-4 text-purple-500" />
            <span>Feriados Nacionais & Municipais</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Feriados nacionais são identificados automaticamente. Cadastre abaixo os feriados municipais e datas especiais da sua cidade para acionar automaticamente o adicional de 100% nas horas trabalhadas da equipe.
          </p>
        </Card>
      </div>

      {/* Holidays Card */}
      <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Feriados e Datas Especiais</CardTitle>
              <CardDescription>
                Gerencie feriados locais para cálculo automático de banco de horas e 100%.
              </CardDescription>
            </div>

            {/* Year Selector Buttons */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-background p-1 dark:border-slate-800">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setYear(year - 1)}
                title="Ano Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 font-mono text-sm font-bold">{year}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setYear(year + 1)}
                title="Próximo Ano"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Add Holiday Form */}
          <form
            onSubmit={handleSubmit(handleAdd)}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-muted/20 p-4 dark:border-slate-800 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-muted-foreground">
                Nome do Feriado / Data Especial
              </Label>
              <Input
                id="name"
                placeholder="Ex: Aniversário da Cidade, Padroeiro..."
                className="h-10 rounded-xl bg-background"
                {...register('name')}
              />
              {errors.name && (
                <span className="text-xs text-destructive">{errors.name.message}</span>
              )}
            </div>

            <div className="w-full space-y-1.5 sm:w-48">
              <Label htmlFor="date" className="text-xs font-bold text-muted-foreground">
                Data do Feriado
              </Label>
              <Input
                id="date"
                type="date"
                className="h-10 rounded-xl bg-background"
                {...register('date')}
              />
              {errors.date && (
                <span className="text-xs text-destructive">{errors.date.message}</span>
              )}
            </div>

            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="h-10 rounded-xl px-5 font-bold shadow-sm sm:w-auto"
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Adicionar
            </Button>
          </form>

          {/* Holidays Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/40">
                  <TableHead className="w-[180px]">Data</TableHead>
                  <TableHead>Feriado</TableHead>
                  <TableHead className="w-[180px]">Tipo</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : data?.holidays?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center text-muted-foreground">
                      Nenhum feriado cadastrado para o ano de {year}.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.holidays.map((holiday) => (
                    <TableRow key={holiday.id} className="transition-colors hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-primary" />
                          <span className="font-mono font-semibold">
                            {format(
                              new Date(holiday.date.split('T')[0] + 'T12:00:00Z'),
                              'dd/MM/yyyy'
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        {holiday.name}
                      </TableCell>
                      <TableCell>
                        {holiday.type === 'NATIONAL' ? (
                          <Badge variant="secondary" className="rounded-lg font-medium">
                            Nacional
                          </Badge>
                        ) : (
                          <Badge className="rounded-lg border-purple-200 bg-purple-100 font-medium text-purple-700 hover:bg-purple-200 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            Municipal / Local
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {holiday.type === 'NATIONAL' ? (
                          <span className="text-xs text-muted-foreground">Padrão</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                            onClick={() => deleteMutation.mutate(holiday.id)}
                            title="Remover feriado"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
