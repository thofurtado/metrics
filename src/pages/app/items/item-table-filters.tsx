import { Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const itemsFiltersSchema = z.object({
  name: z.string().optional(),
  display_id: z.string().optional(),
  below_min_stock: z.boolean().optional(),
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
    below_min_stock,
  })

  const { register, control, reset, watch } = useForm<ItemsFiltersSchema>({
    defaultValues: {
      name: name ?? '',
      display_id: display_id ?? '',
      below_min_stock,
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
          below_min_stock: below_min_stock ?? false,
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
      below_min_stock: false,
    }
  }

  const hasFilters =
    watchedFields.name ||
    watchedFields.display_id ||
    watchedFields.below_min_stock

  return (
    <div className="flex flex-col flex-wrap gap-3 rounded-xl border border-border bg-card p-2.5 px-3.5 shadow-sm lg:flex-row lg:items-center">
      <div className="flex w-full flex-row items-center gap-3 lg:w-auto">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 lg:w-[300px]">
          <Search className="h-4 w-4 text-primary opacity-70" />
          <input
            {...register('name')}
            placeholder="Nome da mercadoria..."
            className="w-full border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex w-[100px] items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
          <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
            ID
          </span>
          <input
            {...register('display_id')}
            placeholder="ex: 001"
            className="w-full border-none bg-transparent text-center text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-4 lg:w-auto">
        <div className="flex items-center gap-3 rounded-full border border-border/50 bg-muted/30 px-4 py-1.5">
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
          <Label
            htmlFor="critical_stock"
            className="cursor-pointer whitespace-nowrap text-xs font-bold uppercase tracking-tight text-muted-foreground"
          >
            Estoque Crítico
          </Label>
        </div>

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
