import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Printer, Search, Save, Layers, Package, CheckSquare, Tag } from 'lucide-react'
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
import { getPrintDepartments, createPrintDepartment, deletePrintDepartment, updatePrintDepartmentProducts } from '@/api/print-departments'
import { getProducts } from '@/api/get-products'
import { toast } from '@/components/ui/use-toast'

export function PrintDepartmentsDialog() {
    const queryClient = useQueryClient()
    const [newDeptName, setNewDeptName] = useState('')
    const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
    const [productSearch, setProductSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [draftProductIds, setDraftProductIds] = useState<string[]>([])

    const { data: departmentsData, isLoading: isLoadingDepts } = useQuery({
        queryKey: ['print-departments'],
        queryFn: getPrintDepartments,
    })

    const { data: productsData, isLoading: isLoadingProducts } = useQuery({
        queryKey: ['products-all', productSearch],
        queryFn: () => getProducts({ query: productSearch, pageIndex: 1, perPage: 1000 }),
    })

    const departments = departmentsData?.departments || []
    const selectedDept = departments.find(d => d.id === selectedDeptId)

    useEffect(() => {
        if (selectedDept) {
            setDraftProductIds(selectedDept.products.map(p => p.product_id))
        } else {
            setDraftProductIds([])
        }
    }, [selectedDeptId, departmentsData])

    const allProducts = productsData?.data?.products || []
    
    // Safely extract category name whether it's a string or object {id, name}
    function getCategoryName(category: any): string {
        if (!category) return ''
        if (typeof category === 'string') return category
        return category.name || ''
    }

    const categories = Array.from(new Set(allProducts.map((p: any) => getCategoryName(p.category)).filter(Boolean))) as string[]

    const filteredProducts = allProducts.filter((p: any) => {
        const catName = getCategoryName(p.category)
        if (selectedCategory !== 'all' && catName !== selectedCategory) return false
        return true
    })

    const createMutation = useMutation({
        mutationFn: createPrintDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['print-departments'] })
            setNewDeptName('')
            toast({ title: 'Departamento criado com sucesso!', className: 'bg-green-500 text-white' })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deletePrintDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['print-departments'] })
            setSelectedDeptId(null)
            toast({ title: 'Departamento excluído.', variant: 'destructive' })
        }
    })

    const updateProductsMutation = useMutation({
        mutationFn: updatePrintDepartmentProducts,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['print-departments'] })
            toast({ title: 'Produtos vinculados com sucesso!', className: 'bg-green-500 text-white' })
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
            setDraftProductIds(prev => Array.from(new Set([...prev, ...filteredIds])))
        } else {
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
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl">
            <DialogHeader className="px-8 py-5 bg-gradient-to-r from-primary/10 via-background to-background border-b border-border/50">
                <DialogTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
                    <div className="p-2.5 bg-primary/20 rounded-xl shadow-inner">
                        <Printer className="h-6 w-6 text-primary" />
                    </div>
                    Departamentos de Impressão
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1 ml-14">
                    Organize e vincule seus produtos para impressão nos locais corretos (ex: Cozinha, Bar, Pizzaria).
                </p>
            </DialogHeader>

            <div className="flex flex-1 overflow-hidden">
                {/* Lado Esquerdo - Lista de Departamentos */}
                <div className="w-[380px] border-r border-border/50 bg-muted/20 flex flex-col">
                    <div className="p-5 border-b border-border/50 bg-background/50">
                        <form onSubmit={handleCreate} className="flex gap-2">
                            <Input 
                                placeholder="Ex: Cozinha Fria..." 
                                value={newDeptName}
                                onChange={e => setNewDeptName(e.target.value)}
                                disabled={createMutation.isPending}
                                className="bg-background shadow-sm border-primary/20 focus-visible:ring-primary/50"
                            />
                            <Button size="icon" type="submit" disabled={createMutation.isPending || !newDeptName.trim()} className="shadow-md hover:scale-105 transition-transform">
                                <Plus className="h-5 w-5" />
                            </Button>
                        </form>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-4 px-1 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            <Layers className="w-4 h-4" /> Seus Departamentos
                        </div>

                        {isLoadingDepts ? (
                            <div className="flex flex-col items-center justify-center py-10 opacity-50">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                                <p className="text-sm font-medium">Carregando...</p>
                            </div>
                        ) : departments.length === 0 ? (
                            <div className="text-center py-12 px-4 border-2 border-dashed border-muted-foreground/20 rounded-xl mx-2">
                                <Printer className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">Nenhum departamento criado.</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Crie um acima para começar.</p>
                            </div>
                        ) : (
                            departments.map(dept => {
                                const isSelected = selectedDeptId === dept.id
                                return (
                                    <div 
                                        key={dept.id}
                                        onClick={() => setSelectedDeptId(dept.id)}
                                        className={`group relative flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-300 border ${
                                            isSelected 
                                            ? 'bg-gradient-to-r from-primary/15 to-primary/5 border-primary shadow-sm scale-[1.02]' 
                                            : 'bg-background hover:bg-muted border-border hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <p className={`font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                {dept.name}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Package className="w-3.5 h-3.5" />
                                                <span>{dept.products?.length || 0} produto(s)</span>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className={`h-9 w-9 rounded-full transition-opacity ${isSelected ? 'opacity-100 text-destructive hover:bg-destructive hover:text-white' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive'}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (confirm(`Tem certeza que deseja excluir '${dept.name}'? Todos os vínculos serão perdidos.`)) {
                                                    deleteMutation.mutate({ id: dept.id })
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Lado Direito - Produtos do Departamento Selecionado */}
                <div className="flex-1 flex flex-col bg-background/50 relative">
                    {selectedDept ? (
                        <>
                            <div className="p-6 border-b border-border/50 bg-gradient-to-b from-background to-muted/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h3 className="font-bold text-2xl tracking-tight flex items-center gap-2">
                                            <span className="text-muted-foreground font-normal">Vinculando à:</span> 
                                            <span className="text-primary bg-primary/10 px-3 py-1 rounded-lg">{selectedDept.name}</span>
                                        </h3>
                                    </div>
                                    <Button 
                                        onClick={handleSave} 
                                        disabled={updateProductsMutation.isPending}
                                        className="gap-2.5 h-11 px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all rounded-xl font-semibold"
                                    >
                                        <Save className="w-5 h-5" />
                                        {updateProductsMutation.isPending ? 'Salvando...' : 'Salvar Vínculos'}
                                    </Button>
                                </div>
                                <div className="flex gap-3">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input 
                                            placeholder="Buscar pelo nome do produto..." 
                                            value={productSearch}
                                            onChange={e => setProductSearch(e.target.value)}
                                            className="pl-10 h-11 bg-background border-muted-foreground/20 shadow-sm focus-visible:ring-primary/50"
                                        />
                                    </div>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="w-[240px] h-11 bg-background shadow-sm border-muted-foreground/20 font-medium">
                                            <SelectValue placeholder="Todas categorias" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            <SelectItem value="all" className="font-semibold text-primary">Todas categorias</SelectItem>
                                            {categories.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="flex items-center px-6 py-3 border-b border-border/50 bg-muted/40 gap-3 sticky top-0 z-10 shadow-sm">
                                <Checkbox 
                                    id="select-all" 
                                    className="w-5 h-5 rounded data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    checked={isAllSelected ? true : (isIndeterminate ? "indeterminate" : false)}
                                    onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                                />
                                <label htmlFor="select-all" className="text-sm font-semibold cursor-pointer select-none flex items-center gap-2">
                                    Selecionar Todos ({filteredProducts.length})
                                </label>
                                <div className="ml-auto flex items-center gap-2 text-sm font-medium">
                                    <CheckSquare className="w-4 h-4 text-primary" />
                                    <span className="text-foreground">{draftProductIds.length}</span>
                                    <span className="text-muted-foreground">selecionados no total</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                                {isLoadingProducts ? (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="font-medium text-lg">Carregando catálogo...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {filteredProducts.map((product: any) => {
                                            const isChecked = draftProductIds.includes(product.id)
                                            const catName = getCategoryName(product.category)
                                            return (
                                                <label 
                                                    key={product.id}
                                                    className={`group flex items-start gap-4 p-4 rounded-xl cursor-pointer border-2 transition-all duration-200 ${
                                                        isChecked 
                                                        ? 'bg-primary/5 border-primary shadow-sm hover:bg-primary/10' 
                                                        : 'bg-background border-transparent hover:border-border hover:shadow-md'
                                                    }`}
                                                >
                                                    <div className="mt-0.5">
                                                        <Checkbox 
                                                            className="w-5 h-5 rounded data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-transform group-active:scale-90"
                                                            checked={isChecked}
                                                            onCheckedChange={(checked) => toggleProductCheckbox(product.id, checked === true)}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-semibold text-[15px] truncate ${isChecked ? 'text-foreground' : 'text-foreground/80'}`}>
                                                            {product.name}
                                                        </p>
                                                        <div className="flex items-center flex-wrap gap-2 mt-2">
                                                            <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                                                                ID: {product.display_id}
                                                            </span>
                                                            {catName && (
                                                                <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide">
                                                                    <Tag className="w-3 h-3" />
                                                                    {catName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </label>
                                            )
                                        })}
                                        {filteredProducts.length === 0 && (
                                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                                                <div className="bg-muted/50 p-4 rounded-full mb-4">
                                                    <Search className="w-8 h-8 opacity-50" />
                                                </div>
                                                <p className="text-lg font-medium text-foreground/70">Nenhum produto encontrado.</p>
                                                <p className="text-sm mt-1">Tente mudar o termo de busca ou a categoria.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                            <div className="p-6 bg-background rounded-full shadow-sm mb-6 border border-border/50">
                                <Printer className="w-12 h-12 text-primary/40" />
                            </div>
                            <h4 className="text-xl font-semibold text-foreground/80 mb-2">Nenhum departamento selecionado</h4>
                            <p className="text-sm max-w-sm text-center">
                                Selecione um departamento na lista ao lado para começar a vincular os produtos que serão impressos nele.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </DialogContent>
    )
}
