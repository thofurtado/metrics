import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Package, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createSupply } from '@/api/create-supply'
import { getSupplies } from '@/api/get-supplies'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const DEFAULT_SUPPLY_CATEGORIES = [
  'Laticínios & Frios',
  'Carnes & Aves',
  'Hortifruti',
  'Embalagens',
  'Mercearia & Secos',
  'Bebidas & Líquidos',
  'Temperos & Molhos',
  'Padaria & Confeitaria',
  'Descartáveis & Limpeza',
]

export const STANDARDIZED_UNITS = [
  { value: 'UN', label: 'UN - Unidade' },
  { value: 'KG', label: 'KG - Quilograma' },
  { value: 'G', label: 'G - Grama' },
  { value: 'LT', label: 'LT - Litro' },
  { value: 'ML', label: 'ML - Mililitro' },
  { value: 'CX', label: 'CX - Caixa' },
  { value: 'PCT', label: 'PCT - Pacote' },
  { value: 'FD', label: 'FD - Fardo' },
  { value: 'DZ', label: 'DZ - Dúzia' },
]

const supplySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional().default('UN'),
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
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const { data: suppliesData } = useQuery({
    queryKey: ['supplies-categories-list'],
    queryFn: () => getSupplies({ perPage: 500 }),
  })

  const categoriesList = useMemo(() => {
    const fetched = (suppliesData?.data?.supplies || [])
      .map((s: any) => s.category)
      .filter(Boolean) as string[]
    const all = Array.from(new Set([...DEFAULT_SUPPLY_CATEGORIES, ...fetched]))
    return all.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [suppliesData])

  const initialCat = initialData?.category ?? initialData?.supply?.category ?? ''
  const initialUnit = (initialData?.unit ?? initialData?.supply?.unit ?? 'UN').toUpperCase()

  const form = useForm<SupplySchema>({
    resolver: zodResolver(supplySchema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      category: initialCat,
      unit: initialUnit || 'UN',
      cost: initialData?.cost ?? initialData?.supply?.cost ?? 0,
      stock: initialData?.stock ?? initialData?.supply?.stock ?? 0,
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
      queryClient.invalidateQueries({ queryKey: ['supplies-categories-list'] })
      onSuccess?.()
    },
  })

  const { mutateAsync: updateItemFn } = useMutation({
    mutationFn: updateItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['supplies-categories-list'] })
      onSuccess?.()
    },
  })

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return
    const cat = newCategoryName.trim()
    form.setValue('category', cat, { shouldDirty: true })
    setIsCreatingCategory(false)
    setNewCategoryName('')
    toast.success(`Categoria "${cat}" adicionada!`)
  }

  async function onSubmit(data: SupplySchema) {
    if (!isMounted.current) return

    try {
      if (isEdit) {
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
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
          {/* --- HEADER: Name & Active --- */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-2 sm:col-span-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Nome do Insumo *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Queijo Mussarela Fatiado, Bacon em Cubos, Caixa Pizza 35cm..."
                        {...field}
                        className="h-12 text-base font-bold"
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
            {/* Categoria do Insumo */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-primary" /> Categoria
                    </span>
                    {!isCreatingCategory && (
                      <button
                        type="button"
                        onClick={() => setIsCreatingCategory(true)}
                        className="text-[11px] font-bold text-primary hover:underline"
                      >
                        + Nova
                      </button>
                    )}
                  </FormLabel>

                  {isCreatingCategory ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="Nova Categoria..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddNewCategory()
                          }
                        }}
                        className="h-10 text-xs font-bold"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddNewCategory}
                        className="h-10 px-2.5 text-xs font-bold"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsCreatingCategory(false)
                          setNewCategoryName('')
                        }}
                        className="h-10 px-2 text-xs"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={field.value || ''}
                      onValueChange={(val) => {
                        if (val === '__new__') {
                          setIsCreatingCategory(true)
                        } else {
                          field.onChange(val)
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 text-xs font-medium">
                          <SelectValue placeholder="Selecione a Categoria..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriesList.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                        {field.value && !categoriesList.includes(field.value) && (
                          <SelectItem value={field.value}>
                            {field.value}
                          </SelectItem>
                        )}
                        <SelectItem value="__new__" className="font-bold text-primary">
                          + Cadastrar Nova Categoria...
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Unidade de Medida Padronizada */}
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <Package className="h-3.5 w-3.5 text-primary" /> Unidade *
                  </FormLabel>
                  <Select
                    value={field.value?.toUpperCase() || 'UN'}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 text-xs font-bold">
                        <SelectValue placeholder="Selecione a Unidade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STANDARDIZED_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estoque */}
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {!isEdit ? 'Estoque Inicial' : 'Estoque Atual'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      {...field}
                      disabled={isEdit}
                      className={`h-10 font-mono font-bold ${isEdit ? 'bg-muted/50' : ''}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* --- COST SECTION --- */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-primary">
              Custo de Aquisição / Produção do Insumo
            </h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Este valor é utilizado como base de custo na montagem das fichas técnicas de produtos compostos.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">
                      Preço de Custo Unitário (R$)
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-muted-foreground">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          className="h-11 bg-white pl-10 font-mono text-base font-bold dark:bg-slate-950"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col justify-center rounded-xl border border-border/50 bg-background/60 p-3 text-xs text-muted-foreground">
                <span className="font-bold text-foreground">💡 Dica de Engenharia:</span>
                <span>
                  Cadastre o custo pela unidade selecionada (ex: se a unidade for KG, informe o custo por 1 KG).
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
                  Descrição / Detalhes do Fornecedor (Opcional)
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Marca preferencial, código do fornecedor, especificações técnicas..."
                    {...field}
                    className="min-h-[70px] text-xs resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* FOOTER */}
        <ResponsiveDialogFooter className="border-t bg-muted/20 px-6 py-4 sm:px-8">
          <ResponsiveDialogClose asChild>
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </ResponsiveDialogClose>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="min-w-[140px] font-bold"
          >
            {form.formState.isSubmitting
              ? 'Salvando...'
              : isEdit
                ? 'Atualizar Insumo'
                : 'Salvar Insumo'}
          </Button>
        </ResponsiveDialogFooter>
      </form>
    </Form>
  )
}
