import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createService } from '@/api/create-service'
import { updateItem } from '@/api/update-item'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ResponsiveDialogClose } from '@/components/ui/responsive-dialog'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const serviceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0).optional().default(0),
  estimated_time: z.string().optional(),
  display_id: z.preprocess((val) => {
    if (!val || val === '' || val === 'Auto') return undefined
    const parsed = Number(val)
    return isNaN(parsed) ? undefined : parsed
  }, z.number().optional()),
  active: z.boolean().default(true),
})

type ServiceSchema = z.infer<typeof serviceSchema>

interface ServiceFormProps {
  initialData?: any
  onSuccess?: () => void
}

export function ServiceForm({ initialData, onSuccess }: ServiceFormProps) {
  const queryClient = useQueryClient()
  const isEdit = !!initialData

  const form = useForm<ServiceSchema>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      category: initialData?.category ?? '',
      price: initialData?.service?.price ?? 0,
      estimated_time: initialData?.service?.estimated_time ?? '',
      display_id: initialData?.service?.display_id ?? undefined,
      active: initialData?.active ?? true,
    },
  })

  const { mutateAsync: createServiceFn } = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      onSuccess?.()
    },
  })

  const { mutateAsync: updateItemFn } = useMutation({
    mutationFn: updateItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      onSuccess?.()
    },
  })

  async function onSubmit(data: ServiceSchema) {
    try {
      if (isEdit) {
        await updateItemFn({
          id: initialData.id,
          type: 'SERVICE',
          ...data,
        } as any)
        toast.success('Serviço atualizado!')
      } else {
        await createServiceFn({
          name: data.name,
          description: data.description,
          category: data.category,
          price: data.price || 0,
          estimated_time: data.estimated_time,
          display_id: data.display_id,
          active: data.active,
        })
        toast.success('Serviço cadastrado!')
      }
    } catch (err) {
      toast.error('Erro ao salvar serviço.')
    }
  }

  return (
    <Form {...form}>
      <form
        id="service-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden text-left"
      >
        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
          {/* --- HEADER: Name & Active --- */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-2 sm:col-span-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Nome do Serviço
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Instalação Elétrica"
                        {...field}
                        className="h-12 text-lg font-medium"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEdit && (
              <div className="col-span-12 flex items-end pb-1 sm:col-span-4">
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex h-12 w-full items-center space-x-3 space-y-0 rounded-xl border bg-muted/20 p-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer text-sm font-medium">
                        Serviço Ativo
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* --- DETAILS: Category, Time, ID --- */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Categoria
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Mão de Obra"
                      {...field}
                      className="h-10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimated_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <Clock className="h-3 w-3" /> Tempo Est.
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 30 min"
                      {...field}
                      className="h-10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="display_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    ID Interno
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Automático"
                      {...field}
                      value={field.value ?? ''}
                      className="h-10 bg-muted/50 font-mono text-sm"
                      disabled
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* --- PRICING HERO --- */}
          <div className="space-y-6 rounded-2xl border bg-muted/10 p-6">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-primary"></div>
              <h4 className="text-lg font-bold tracking-tight">
                Valor do Serviço
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wide text-primary">
                      Preço de Venda
                    </FormLabel>
                    <FormControl>
                      <div className="relative rounded-md shadow-sm">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-primary">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          {...field}
                          className="h-14 border-primary/30 bg-primary/5 pl-10 text-2xl font-bold tabular-nums text-primary shadow-sm focus-visible:border-primary focus-visible:ring-primary"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="hidden items-center justify-center text-sm italic text-muted-foreground sm:flex">
                Defina o valor base para este serviço.
              </div>
            </div>
          </div>

          {/* --- DESCRIPTION --- */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Descrição / Observações
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Detalhes do serviço..."
                    className="min-h-[100px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* --- FIXED FOOTER --- */}
        <div className="z-10 flex shrink-0 justify-end gap-3 border-t bg-background p-6 sm:p-8">
          <ResponsiveDialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-12 w-full font-medium sm:w-auto"
            >
              Cancelar
            </Button>
          </ResponsiveDialogClose>
          <Button
            form="service-form"
            type="submit"
            disabled={form.formState.isSubmitting}
            className="text-md h-12 w-full bg-primary px-8 font-bold shadow-lg hover:bg-primary/90 sm:w-auto"
          >
            {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Serviço'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
