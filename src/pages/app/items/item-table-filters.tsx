import { Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const itemsFiltersSchema = z.object({
  name: z.string().optional(),
  display_id: z.string().optional(),
  below_min_stock: z.boolean().optional()
})

type ItemsFiltersSchema = z.infer<typeof itemsFiltersSchema>

export function ItemsTableFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const name = searchParams.get('name')
  const display_id = searchParams.get('display_id')
  const below_min_stock = searchParams.get('critical_stock') === 'true'

  const previousFilters = useRef({
    name: name ?? '',
    display_id: display_id ?? '',
    below_min_stock: below_min_stock
  })

  const { register, control, reset, watch } = useForm<ItemsFiltersSchema>({
    defaultValues: {
      name: name ?? '',
      display_id: display_id ?? '',
      below_min_stock: below_min_stock,
    },
  })

  const watchedFields = watch()

  // Live Search Effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const { name, display_id, below_min_stock } = watchedFields

      const hasChanged =
        name !== previousFilters.current.name ||
        display_id !== previousFilters.current.display_id ||
        below_min_stock !== previousFilters.current.below_min_stock

      if (hasChanged) {
        setSearchParams((state) => {
          if (name) state.set('name', name)
          else state.delete('name')

          if (display_id) state.set('display_id', display_id)
          else state.delete('display_id')

          if (below_min_stock) state.set('critical_stock', 'true')
          else state.delete('critical_stock')

          state.set('page', '1')
          return state
        })

        previousFilters.current = {
          name: name ?? '',
          display_id: display_id ?? '',
          below_min_stock: below_min_stock ?? false
        }
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [watchedFields, setSearchParams])

  function handleClearFilters() {
    setSearchParams((state) => {
      state.delete('name')
      state.delete('display_id')
      state.delete('critical_stock')
      state.set('page', '1')
      return state
    })

    reset({
      name: '',
      display_id: '',
      below_min_stock: false,
    })

    previousFilters.current = {
      name: '',
      display_id: '',
      below_min_stock: false
    }
  }

  const hasFilters = watchedFields.name || watchedFields.display_id || watchedFields.below_min_stock

  return (
    <div className="flex flex-col lg:flex-row lg:items-center flex-wrap gap-4 p-4 bg-card border border-border rounded-2xl shadow-sm">
      <div className="flex flex-row items-center gap-3 w-full lg:w-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-full border border-border/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all flex-1 lg:w-[300px]">
          <Search className="h-4 w-4 text-primary opacity-70" />
          <input
            {...register('name')}
            placeholder="Nome da mercadoria..."
            className="bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground w-full"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-full border border-border/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all w-[100px]">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">ID</span>
          <input
            {...register('display_id')}
            placeholder="ex: 001"
            className="bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground w-full text-center"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 w-full lg:w-auto">
        <div className="flex items-center gap-3 bg-muted/30 py-1.5 px-4 rounded-full border border-border/50">
          <Controller
            name="below_min_stock"
            control={control}
            render={({ field }) => (
              <Switch
                id="critical_stock"
                checked={field.value}
                onCheckedChange={field.onChange}
                className="scale-90 data-[state=checked]:bg-primary"
              />
            )}
          />
          <Label htmlFor="critical_stock" className="text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer whitespace-nowrap">Estoque Crítico</Label>
        </div>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors"
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