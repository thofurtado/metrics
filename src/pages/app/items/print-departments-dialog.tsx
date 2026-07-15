import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Printer, Search, Save } from 'lucide-react'
import {
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { getPrintDepartments, createPrintDepartment, deletePrintDepartment, updatePrintDepartmentProducts, PrintDepartment } from '@/api/print-departments'
import { getProducts } from '@/api/get-products'
import { toast } from '@/components/ui/use-toast'

export function PrintDepartmentsDialog() {
    const queryClient = useQueryClient()
    const [newDeptName, setNewDeptName] = useState('')
    const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
    const [productSearch, setProductSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [draftProductIds, setDraftProductIds] = useState<string[]>([])

    const { data: departmentsData, isLoading } = useQuery({
        queryKey: ['print-departments'],
        queryFn: getPrintDepartments,
    })

    const { data: productsData } = useQuery({
        queryKey: ['products-all', productSearch],
        queryFn: () => getProducts({ query: productSearch, pageIndex: 1, perPage: 1000 }), // Buscando um limite maior para poder filtrar por categoria localmente
    })

    const departments = departmentsData?.departments || []
    const selectedDept = departments.find(d => d.id === selectedDeptId)

    // Atualiza os rascunhos sempre que mudar de departamento ou a mutation terminar
    useEffect(() => {
        if (selectedDept) {
            setDraftProductIds(selectedDept.products.map(p => p.product_id))
        } else {
            setDraftProductIds([])
        }
    }, [selectedDeptId, departmentsData])

    const allProducts = productsData?.data?.products || []
    
    // Extrai categorias únicas dos produtos carregados
    const categories = Array.from(new Set(allProducts.map((p: any) => p.category).filter(Boolean))) as string[]

    // Filtra localmente por categoria (a busca por texto já foi feita na API ou pode ser mista)
    const filteredProducts = allProducts.filter((p: any) => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false
        return true
    })

    const createMutation = useMutation({
        mutationFn: createPrintDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['print-departments'] })
            setNewDeptName('')
            toast({ title: 'Departamento criado com sucesso!' })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deletePrintDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['print-departments'] })
            setSelectedDeptId(null)
            toast({ title: 'Departamento excluído.' })
        }
    })

    const updateProductsMutation = useMutation({
        mutationFn: updatePrintDepartmentProducts,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['print-departments'] })
            toast({ title: 'Produtos vinculados com sucesso!' })
        }
    })

    function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        if (!newDeptName.trim()) return
        createMutation.mutate({ name: newDeptName.trim() })
    }

    function toggleProductCheckbox(productId: string, checked: boolean) {
        if (checked) {
            setDraftProductIds(prev => [...prev, productId])
        } else {
            setDraftProductIds(prev => prev.filter(id => id !== productId))
        }
    }

    function toggleSelectAll(checked: boolean) {
        const filteredIds = filteredProducts.map((p: any) => p.id)
        if (checked) {
            // Adiciona todos os ids filtrados ao draft sem duplicar
            setDraftProductIds(prev => Array.from(new Set([...prev, ...filteredIds])))
        } else {
            // Remove todos os ids filtrados do draft
            setDraftProductIds(prev => prev.filter(id => !filteredIds.includes(id)))
        }
    }

    function handleSave() {
        if (!selectedDeptId) return
        updateProductsMutation.mutate({
            id: selectedDeptId,
            productIds: draftProductIds
        })
    }

    const isAllSelected = filteredProducts.length > 0 && filteredProducts.every((p: any) => draftProductIds.includes(p.id))
    const isIndeterminate = !isAllSelected && filteredProducts.some((p: any) => draftProductIds.includes(p.id))

    return (
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden">
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
                                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors border ${selectedDeptId === dept.id ? 'bg-primary/10 border-primary shadow-sm' : 'bg-background hover:bg-muted/50 border-transparent'}`}
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
                <div className="flex-1 flex flex-col bg-background relative">
                    {selectedDept ? (
                        <>
                            <div className="p-4 border-b bg-muted/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-lg">
                                        Vinculando à: <span className="text-primary">{selectedDept.name}</span>
                                    </h3>
                                    <Button 
                                        onClick={handleSave} 
                                        disabled={updateProductsMutation.isPending}
                                        className="gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        Salvar Alterações
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Buscar produtos..." 
                                            value={productSearch}
                                            onChange={e => setProductSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Todas categorias" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas categorias</SelectItem>
                                            {categories.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="flex items-center p-4 border-b bg-muted/20 gap-3">
                                <Checkbox 
                                    id="select-all" 
                                    checked={isAllSelected ? true : (isIndeterminate ? "indeterminate" : false)}
                                    onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                                />
                                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                                    Selecionar Todos ({filteredProducts.length})
                                </label>
                                <span className="ml-auto text-sm text-muted-foreground">
                                    {draftProductIds.length} selecionados no total
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2">
                                <div className="space-y-1">
                                    {filteredProducts.map((product: any) => {
                                        const isChecked = draftProductIds.includes(product.id)
                                        return (
                                            <label 
                                                key={product.id}
                                                className={`flex items-center gap-3 p-3 hover:bg-muted/50 rounded-md cursor-pointer border transition-colors ${isChecked ? 'bg-primary/5 border-primary/20' : 'border-transparent'}`}
                                            >
                                                <Checkbox 
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => toggleProductCheckbox(product.id, checked === true)}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium">{product.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>ID: {product.display_id}</span>
                                                        {product.category && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="bg-muted px-1.5 py-0.5 rounded-sm">{product.category}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        )
                                    })}
                                    {filteredProducts.length === 0 && (
                                        <div className="text-center text-muted-foreground py-10">
                                            Nenhum produto encontrado.
                                        </div>
                                    )}
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
