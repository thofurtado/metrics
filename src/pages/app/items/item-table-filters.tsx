import { Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 font-gaba">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          placeholder="Nome da mercadoria..."
          className="h-8 w-full sm:w-[250px] text-xs sm:text-sm"
          {...register('name')}
        />
      </div>

      <Input
        placeholder="ID"
        className="h-8 w-[80px] text-xs sm:text-sm"
        {...register('display_id')}
      />

      <div className="flex items-center gap-2 px-2 border rounded h-8 border-dashed bg-muted/20">
        <Controller
          name="below_min_stock"
          control={control}
          render={({ field }) => (
            <Switch
              id="critical_stock"
              checked={field.value}
              onCheckedChange={field.onChange}
              className="scale-75"
            />
          )}
        />
        <Label htmlFor="critical_stock" className="text-xs cursor-pointer whitespace-nowrap">Estoque Crítico</Label>
      </div>

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