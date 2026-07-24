import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { deleteSupplier } from '@/api/delete-supplier'
import { getSuppliers } from '@/api/get-suppliers'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { SupplierFormDialog } from './supplier-form-dialog'

export function SuppliersList() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State for Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null) // Using any for simplicity in mapping

  const page = z.coerce.number().parse(searchParams.get('page') ?? '1')
  const query = searchParams.get('query') ?? ''

  const { data: result } = useQuery({
    queryKey: ['suppliers', page, query],
    queryFn: () => getSuppliers({ page, query }),
  })

  const queryClient = useQueryClient()

  const { mutateAsync: deleteSupplierFn } = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })

  async function handleDelete(id: string) {
    if (confirm('Deseja realmente excluir este fornecedor?')) {
      await deleteSupplierFn(id)
    }
  }

  function handleEdit(supplier: any) {
    setEditingSupplier(supplier)
    setIsDialogOpen(true)
  }

  function handleCreate() {
    setEditingSupplier(null)
    setIsDialogOpen(true)
  }

  function handleSearch(event: React.ChangeEvent<HTMLInputElement>) {
    const query = event.target.value
    setSearchParams((state) => {
      if (query) {
        state.set('query', query)
      } else {
        state.delete('query')
      }
      state.set('page', '1')
      return state
    })
  }

  // Handlers for pagination if needed, omit for now as per prompt focusing on list and filter

  return (
    <div className="flex flex-col gap-4 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col flex-wrap gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center">
          <div className="flex w-full flex-row items-center gap-3 lg:w-auto">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 lg:w-[350px]">
              <Search className="h-4 w-4 text-primary opacity-70" />
              <input
                placeholder="Buscar fornecedores..."
                value={query}
                onChange={handleSearch}
                className="w-full border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            {query && (
              <Button
                onClick={() => {
                  setSearchParams((state) => {
                    state.delete('query')
                    state.set('page', '1')
                    return state
                  })
                }}
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 flex-shrink-0 rounded-full transition-colors hover:bg-red-500/10 hover:text-red-500"
                title="Limpar Busca"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={handleCreate}
              className="h-10 rounded-2xl px-6 shadow-sm transition-all hover:translate-y-[-2px] lg:h-12"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <SupplierFormDialog
            supplierToEdit={editingSupplier}
            onOpenChange={setIsDialogOpen}
          />
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result?.suppliers &&
              result.suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.document}</TableCell>
                  <TableCell>{supplier.email}</TableCell>
                  <TableCell>{supplier.phone}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            {result?.suppliers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-4 text-center">
                  Nenhum fornecedor encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
