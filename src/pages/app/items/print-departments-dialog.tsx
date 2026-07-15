import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Printer, Search } from 'lucide-react'
import {
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPrintDepartments, createPrintDepartment, deletePrintDepartment, updatePrintDepartmentProducts, PrintDepartment } from '@/api/print-departments'
import { getProducts } from '@/api/get-products'

export function PrintDepartmentsDialog() {
    const queryClient = useQueryClient()
    const [newDeptName, setNewDeptName] = useState('')
    const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
    const [productSearch, setProductSearch] = useState('')

    const { data: departmentsData, isLoading } = useQuery({
        queryKey: ['print-departments'],
        queryFn: getPrintDepartments,
    })

    const { data: productsData } = useQuery({
        queryKey: ['products-all', productSearch],
        queryFn: () => getProducts({ query: productSearch, pageIndex: 1, perPage: 50 }),
    })

    const departments = departmentsData?.departments || []
    const products = productsData?.data?.products || []
    const selectedDept = departments.find(d => d.id === selectedDeptId)

    const createMutation = useMutation({
        mutationFn: createPrintDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['print-departments'] })
            setNewDeptName('')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deletePrintDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['print-departments'] })
            setSelectedDeptId(null)
        }
    })

    const updateProductsMutation = useMutation({
        mutationFn: updatePrintDepartmentProducts,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['print-departments'] })
        }
    })

    function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        if (!newDeptName.trim()) return
        createMutation.mutate({ name: newDeptName.trim() })
    }

    function toggleProduct(productId: string) {
        if (!selectedDept) return
        
        const currentProductIds = selectedDept.products.map(p => p.product_id)
        const isSelected = currentProductIds.includes(productId)
        
        const newProductIds = isSelected 
            ? currentProductIds.filter(id => id !== productId)
            : [...currentProductIds, productId]

        updateProductsMutation.mutate({
            id: selectedDept.id,
            productIds: newProductIds
        })
    }

    return (
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle className="flex items-center gap-2 text-xl">
                    <Printer className="h-5 w-5" />
                    Gerenciar Departamentos de Impressão
                </DialogTitle>
            </DialogHeader>

            <div className="flex flex-1 overflow-hidden">
                {/* Lado Esquerdo - Lista de Departamentos */}
                <div className="w-1/3 border-r bg-muted/10 flex flex-col">
                    <div className="p-4 border-b">
                        <form onSubmit={handleCreate} className="flex gap-2">
                            <Input 
                                placeholder="Novo departamento..." 
                                value={newDeptName}
                                onChange={e => setNewDeptName(e.target.value)}
                                disabled={createMutation.isPending}
                            />
                            <Button size="icon" type="submit" disabled={createMutation.isPending || !newDeptName.trim()}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
                        ) : departments.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum departamento criado.</p>
                        ) : (
                            departments.map(dept => (
                                <div 
                                    key={dept.id}
                                    onClick={() => setSelectedDeptId(dept.id)}
                                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors border ${selectedDeptId === dept.id ? 'bg-primary/10 border-primary' : 'bg-background hover:bg-muted/50 border-transparent'}`}
                                >
                                    <div>
                                        <p className="font-medium">{dept.name}</p>
                                        <p className="text-xs text-muted-foreground">{dept.products?.length || 0} produto(s)</p>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (confirm(`Tem certeza que deseja excluir '${dept.name}'?`)) {
                                                deleteMutation.mutate({ id: dept.id })
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Lado Direito - Produtos do Departamento Selecionado */}
                <div className="flex-1 flex flex-col bg-background">
                    {selectedDept ? (
                        <>
                            <div className="p-4 border-b bg-muted/5">
                                <h3 className="font-semibold text-lg mb-4">
                                    Produtos em: <span className="text-primary">{selectedDept.name}</span>
                                </h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Buscar produtos para vincular..." 
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="space-y-1">
                                    {products.map(product => {
                                        const isLinked = selectedDept.products.some(p => p.product_id === product.id)
                                        return (
                                            <div 
                                                key={product.id}
                                                className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md border border-transparent hover:border-border transition-colors"
                                            >
                                                <div>
                                                    <p className="font-medium">{product.name}</p>
                                                    <p className="text-xs text-muted-foreground">ID: {product.display_id}</p>
                                                </div>
                                                <Button 
                                                    variant={isLinked ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => toggleProduct(product.id)}
                                                    disabled={updateProductsMutation.isPending}
                                                >
                                                    {isLinked ? 'Vinculado' : 'Vincular'}
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            Selecione um departamento ao lado para gerenciar seus produtos.
                        </div>
                    )}
                </div>
            </div>
        </DialogContent>
    )
}
