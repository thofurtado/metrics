import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSuppliers } from '@/api/get-suppliers'
import { deleteSupplier } from '@/api/delete-supplier'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { useState } from 'react'
import { SupplierFormDialog } from './supplier-form-dialog'
import { Input } from '@/components/ui/input'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

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
        }
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
        setSearchParams(state => {
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

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 w-full max-w-sm">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar fornecedores..."
                        value={query}
                        onChange={handleSearch}
                        className="h-8 w-[150px] lg:w-[250px]"
                    />
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleCreate}>
                            <Plus className="w-4 h-4 mr-2" />
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
                        {result?.suppliers && result.suppliers.map((supplier) => (
                            <TableRow key={supplier.id}>
                                <TableCell className="font-medium">{supplier.name}</TableCell>
                                <TableCell>{supplier.document}</TableCell>
                                <TableCell>{supplier.email}</TableCell>
                                <TableCell>{supplier.phone}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(supplier.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {result?.suppliers?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4">
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
