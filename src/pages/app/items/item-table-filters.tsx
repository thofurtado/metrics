// components/items/items-table-filters.tsx
import { Search, Filter } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const itemsFiltersSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  active: z.string().optional(),
})

type ItemsFiltersSchema = z.infer<typeof itemsFiltersSchema>

export function ItemsTableFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const name = searchParams.get('name')
  const type = searchParams.get('type')
  const active = searchParams.get('active')

  const { register, handleSubmit, reset } = useForm<ItemsFiltersSchema>({
    defaultValues: {
      name: name ?? '',
      type: type ?? 'all',
      active: active ?? 'all',
    },
  })

  function handleFilter({ name, type, active }: ItemsFiltersSchema) {
    setSearchParams((state) => {
      if (name) {
        state.set('name', name)
      } else {
        state.delete('name')
      }

      if (type && type !== 'all') {
        state.set('type', type)
      } else {
        state.delete('type')
      }

      if (active && active !== 'all') {
        state.set('active', active)
      } else {
        state.delete('active')
      }

      state.set('page', '1')

      return state
    })
  }

  function handleClearFilters() {
    setSearchParams((state) => {
      state.delete('name')
      state.delete('type')
      state.delete('active')
      state.set('page', '1')

      return state
    })

    reset({
      name: '',
      type: 'all',
      active: 'all',
    })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Busca Rápida - Nome */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          className="pl-10"
          {...register('name')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit(handleFilter)()
            }
          }}
        />
      </div>

      {/* Filtros Avançados - Sheet para Mobile */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="lg:hidden">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>
              Filtre os produtos e serviços por tipo e status
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={handleSubmit(handleFilter)}
            className="mt-6 space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select {...register('type')} defaultValue={type ?? 'all'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="product">Produtos</SelectItem>
                  <SelectItem value="service">Serviços</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="active">Status</Label>
              <Select {...register('active')} defaultValue={active ?? 'all'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Ativos</SelectItem>
                  <SelectItem value="false">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Aplicar Filtros
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilters}
              >
                Limpar
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Filtros Avançados - Desktop */}
      <div className="hidden lg:flex items-center gap-2">
        <Select
          value={type ?? 'all'}
          onValueChange={(value) => {
            setSearchParams((state) => {
              if (value === 'all') {
                state.delete('type')
              } else {
                state.set('type', value)
              }
              state.set('page', '1')
              return state
            })
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="product">Produtos</SelectItem>
            <SelectItem value="service">Serviços</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={active ?? 'all'}
          onValueChange={(value) => {
            setSearchParams((state) => {
              if (value === 'all') {
                state.delete('active')
              } else {
                state.set('active', value)
              }
              state.set('page', '1')
              return state
            })
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Ativos</SelectItem>
            <SelectItem value="false">Inativos</SelectItem>
          </SelectContent>
        </Select>

        {(name || type || active) && (
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="h-9 px-3"
          >
            Limpar Filtros
          </Button>
        )}
      </div>
    </div>
  )
}