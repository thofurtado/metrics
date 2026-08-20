import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChefHat, Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createProduct } from '@/api/create-product'
import { getCategories } from '@/api/get-categories'
import { getSupplies } from '@/api/get-supplies'
import { updateItem } from '@/api/update-item'
import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const compositeSchema = z.object({
  name: z.string().min(1, 'Nome do prato é obrigatório'),
  category: z.string().optional(),
  price: z.coerce.number().min(0.01, 'Preço de venda é obrigatório'),
  compositions: z.array(
    z.object({
      supply_id: z.string().min(1, 'Selecione o insumo'),
      quantity: z.coerce.number().min(0.0001, 'Qtd deve ser maior que 0'),
    }),
  ).min(1, 'Adicione pelo menos 1 insumo na receita'),
})

type CompositeSchema = z.infer<typeof compositeSchema>

export function CompositeProductForm({
  initialData,
  onSuccess,
}: {
  initialData?: any
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const isEdit = !!initialData

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const { data: suppliesData } = useQuery({
    queryKey: ['supplies-all'],
    queryFn: () => getSupplies({ pageIndex: 1, perPage: 500 }),
  })

  const supplies = suppliesData?.data?.supplies || []
  const categories = categoriesData?.categories || []

  const form = useForm<CompositeSchema>({
    resolver: zodResolver(compositeSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      category: initialData?.category?.id ?? initialData?.category_id ?? '',
      price: initialData?.price ?? 0,
      compositions:
        initialData?.compositions?.map((c: any) => ({
          supply_id: c.supply?.id || c.supply_id,
          quantity: c.quantity,
        })) || [{ supply_id: '', quantity: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'compositions',
  })

  const watchCompositions = form.watch('compositions') || []
  const watchPrice = form.watch('price') || 0

  const calculatedCost = watchCompositions.reduce((acc, curr) => {
    const supply = supplies.find((s) => s.id === curr.supply_id)
    return acc + (supply?.cost ?? 0) * (Number(curr.quantity) || 0)
  }, 0)

  const margin = calculatedCost > 0 ? ((watchPrice - calculatedCost) / calculatedCost) * 100 : 0

  const { mutateAsync: saveProduct, isPending } = useMutation({
    mutationFn: async (data: CompositeSchema) => {
      if (isEdit) {
        await updateItem({
          id: initialData.id,
          type: 'PRODUCT',
          name: data.name,
          category: data.category,
          price: data.price,
          is_composite: true,
          cost: calculatedCost,
          compositions: data.compositions,
        } as any)
      } else {
        await createProduct({
          name: data.name,
          category: data.category,
          price: data.price,
          is_composite: true,
          cost: calculatedCost,
          compositions: data.compositions,
        })
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Ficha técnica atualizada!' : 'Ficha técnica criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['composite-products'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      onSuccess()
    },
    onError: () => {
      toast.error('Erro ao salvar ficha técnica.')
    },
  })

  return (
    <DialogContent className="max-w-3xl overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
      <DialogHeader className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              {isEdit ? `Editar Ficha Técnica: ${initialData.name}` : 'Nova Ficha Técnica (Produto Composto)'}
            </DialogTitle>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Componha a receita, calcule o custo real e automatize baixas de insumos
            </p>
          </div>
        </div>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => saveProduct(d))} className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Nome do Prato
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: X-Salada Especial, Pizza Calabresa 8 Fatias..."
                        {...field}
                        className="h-10 rounded-xl font-bold"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="sm:col-span-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Categoria
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl font-semibold">
                          <SelectValue placeholder="Categoria..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="sm:col-span-3">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-black uppercase text-purple-600 dark:text-purple-400">
                      Preço de Venda
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-purple-600">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          className="h-10 rounded-xl pl-9 font-mono text-sm font-black text-purple-600"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4.5 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Insumos da Receita ({fields.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ supply_id: '', quantity: 1 })}
                className="h-7 rounded-lg border-slate-200 px-2.5 text-xs font-bold dark:border-slate-800"
              >
                <Plus className="mr-1 h-3 w-3" /> Adicionar Insumo
              </Button>
            </div>

            <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
              {fields.map((field, index) => {
                const selectedSupply = supplies.find(
                  (s) => s.id === form.watch(`compositions.${index}.supply_id`),
                )
                const itemCost =
                  (selectedSupply?.cost || 0) *
                  (Number(form.watch(`compositions.${index}.quantity`)) || 0)

                return (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`compositions.${index}.supply_id`}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9 text-xs font-bold">
                                <SelectValue placeholder="Selecione o insumo..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {supplies.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} (R$ {Number(s.cost || 0).toFixed(2)} / {s.unit || 'un'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="w-24">
                      <FormField
                        control={form.control}
                        name={`compositions.${index}.quantity`}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="Qtd"
                            {...field}
                            className="h-9 text-center font-mono text-xs font-bold"
                          />
                        )}
                      />
                    </div>

                    <div className="w-24 text-right font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                      R$ {itemCost.toFixed(2)}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="h-8 w-8 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs font-bold dark:border-slate-800">
              <div className="flex items-center gap-4">
                <span>
                  Custo (CMV):{' '}
                  <strong className="font-mono text-slate-900 dark:text-slate-100">
                    R$ {calculatedCost.toFixed(2)}
                  </strong>
                </span>
                <span>
                  Margem:{' '}
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                    +{margin.toFixed(0)}%
                  </strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Baixa automática acionada a cada venda
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onSuccess}
              className="h-10 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-10 rounded-xl bg-purple-600 px-5 text-xs font-black uppercase tracking-wider text-white hover:bg-purple-700"
            >
              {isPending ? 'Salvando...' : 'Salvar Ficha Técnica'}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}
