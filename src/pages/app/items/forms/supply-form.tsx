import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createSupply } from '@/api/create-supply'
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
import {
  ResponsiveDialogClose,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const supplySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  cost: z.coerce.number().min(0).optional().default(0),
  stock: z.coerce.number().optional().default(0),
  active: z.boolean().default(true),
})

type SupplySchema = z.infer<typeof supplySchema>

interface SupplyFormProps {
  initialData?: any
  onSuccess?: () => void
}

export function SupplyForm({ initialData, onSuccess }: SupplyFormProps) {
  const queryClient = useQueryClient()
  const isEdit = !!initialData

  const form = useForm<SupplySchema>({
    resolver: zodResolver(supplySchema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      category: initialData?.category ?? initialData?.supply?.category ?? '',
      unit: initialData?.unit ?? initialData?.supply?.unit ?? '',
      cost: initialData?.cost ?? initialData?.supply?.cost ?? 0,
      stock: initialData?.stock ?? initialData?.supply?.stock ?? 0,
      unit: initialData?.supply?.unit ?? '',
      cost: initialData?.supply?.cost ?? 0,
      stock: initialData?.supply?.stock ?? 0,
      active: initialData?.active ?? true,
    },
  })

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const { mutateAsync: createSupplyFn } = useMutation({
    mutationFn: createSupply,
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

  async function onSubmit(data: SupplySchema) {
    if (!isMounted.current) return

    try {
      if (isEdit) {
        // If cost changed, backend will trigger cascade update. Warn user.
        const costChanged = initialData?.supply?.cost !== data.cost
        if (costChanged) {
          toast.loading('Salvando e atualizando produtos dependentes...', {
            id: 'save-supply',
          })
        }

        await updateItemFn({
          id: initialData.id,
          type: 'SUPPLY',
          ...data,
        } as any)

        if (!isMounted.current) return

        if (costChanged) toast.dismiss('save-supply')
        toast.success('Insumo atualizado!')
      } else {
        await createSupplyFn({
          name: data.name,
          description: data.description,
          category: data.category,
          unit: data.unit,
          cost: data.cost || 0,
          stock: data.stock,
          active: data.active,
        })

        if (!isMounted.current) return

        toast.success('Insumo cadastrado!')
      }
    } catch (err) {
      if (!isMounted.current) return
      toast.dismiss('save-supply')
      toast.error('Erro ao salvar insumo. Verifique a conexão.')
      console.error(err)
    }
  }

  return (
    <Form {...form}>
      <form
        id="supply-form"
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
                      Nome do Insumo
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Cimento CP-II"
                        {...field}
                        className="h-12 text-lg font-medium"
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
                        Insumo Ativo
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* --- DETAILS: Category, Unit, Stock --- */}
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
                      placeholder="Ex: Laticínios, Embalagens, Carnes..."
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
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <Package className="h-3 w-3" /> Unidade
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: kg, m, un"
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
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {!isEdit ? 'Estoque Inicial' : 'Estoque Atual'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      disabled={isEdit}
                      className={isEdit ? 'bg-muted' : ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* --- COST HERO --- */}
          <div className="space-y-6 rounded-2xl border bg-muted/10 p-6">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-red-500"></div>
              <h4 className="text-lg font-bold tracking-tight">
                Custo do Insumo
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wide text-red-600/70">
                      Preço de Custo
                    </FormLabel>
                    <FormControl>
                      <div className="relative rounded-md shadow-sm">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-red-600">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          {...field}
                          className="h-14 border-red-200 bg-red-50/20 pl-10 text-2xl font-bold tabular-nums text-red-600 shadow-sm focus-visible:border-red-500 focus-visible:ring-red-500"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col justify-center gap-1 rounded-lg border bg-white p-3 text-sm text-muted-foreground">
                <span className="text-xs font-semibold uppercase">
                  Nota Importante:
                </span>
                <span>
                  Alterar este custo impactará automaticamente o custo de
                  produtos compostos.
                </span>
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
                    placeholder="Detalhes do insumo..."
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
            form="supply-form"
            type="submit"
            disabled={form.formState.isSubmitting}
            className="text-md h-12 w-full bg-primary px-8 font-bold shadow-lg hover:bg-primary/90 sm:w-auto"
          >
            {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Insumo'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
