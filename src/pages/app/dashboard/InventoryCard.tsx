import { useQuery } from '@tanstack/react-query'
import { type ComponentProps } from 'react'
import { Package, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Mock API response structure
interface InventoryMetricsResponse {
    patrimonyAmount: number | null
    criticalItemsCount: number | null
    productRevenue: number | null
    serviceRevenue: number | null
}

// ⚠️ MOCK LOCAL DA FUNÇÃO DE API (Simulando a busca de métricas de inventário)
const getInventoryMetrics = async (): Promise<InventoryMetricsResponse> => {
    // Simula um delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))

    // Dados mockados conforme solicitado
    return {
        patrimonyAmount: 1256320.00,
        criticalItemsCount: 8, // Alerta
        productRevenue: 485600.00,
        serviceRevenue: 195420.00,
    }
}

type InventoryCardProps = ComponentProps<'div'>

// Função auxiliar para formatar em Reais (mantendo consistência)
const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function InventoryCard({ className, ...props }: InventoryCardProps) {
    const { data: metrics, isLoading } = useQuery<InventoryMetricsResponse>({
        queryFn: getInventoryMetrics,
        queryKey: ['metrics', 'inventory-metrics'],
    })

    const patrimonyAmount = metrics?.patrimonyAmount ?? 0
    const criticalItemsCount = metrics?.criticalItemsCount ?? 0
    const productRevenue = metrics?.productRevenue ?? 0
    const serviceRevenue = metrics?.serviceRevenue ?? 0

    // Determina se o alerta é crítico (usando o vermelho 'stiletto' para consistência)
    const isCritical = criticalItemsCount > 5
    const alertColorClass = isCritical
        ? 'bg-stiletto-100 text-stiletto-700 dark:bg-stiletto-900/30' // Vermelho para Crítico
        : 'bg-vida-loca-100 text-vida-loca-700 dark:bg-vida-loca-900/30' // Verde (ou cinza) se ok/baixo

    return (
        <Card className={cn("col-span-1", className)} {...props}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-minsk-600" />
                    Inventário e Vendas
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 px-4 pb-4">

                {/* 1. Saldo Principal (Patrimônio) - Layout Compacto Grande */}
                <div className="flex items-center justify-between bg-minsk-50 dark:bg-minsk-900/30 rounded-lg p-3 border">
                    <div>
                        <span className="text-xs text-muted-foreground block">Patrimônio em Estoque</span>
                        {isLoading ? (
                            <div className="h-6 w-32 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                            <span className="text-xl font-bold text-minsk-700 dark:text-minsk-300">
                                {formatCurrency(patrimonyAmount)}
                            </span>
                        )}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${alertColorClass}`}>
                        <AlertTriangle className="h-3 w-3" />
                        {criticalItemsCount} {criticalItemsCount === 1 ? 'Item' : 'Itens'}
                    </div>
                </div>

                {/* 2. Grid Compacto (Vendas: Produtos e Serviços) - Simétrico a Receita/Despesa */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Vendas - Produtos */}
                    <div className="bg-vida-loca-50 dark:bg-vida-loca-900/20 rounded-lg p-3 border border-vida-loca-100 dark:border-vida-loca-800">
                        <div className="flex items-center gap-1 mb-1">
                            <TrendingUp className="h-3 w-3 text-vida-loca-600" />
                            <span className="text-xs font-semibold text-vida-loca-700">Produtos</span>
                        </div>
                        {isLoading ? (
                            <div className="h-4 w-16 bg-vida-loca-200 animate-pulse rounded mb-1"></div>
                        ) : (
                            <span className="text-lg font-bold block mb-1">
                                {formatCurrency(productRevenue)}
                            </span>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            Receita do Mês
                        </p>
                    </div>

                    {/* Vendas - Serviços */}
                    <div className="bg-vida-loca-50 dark:bg-vida-loca-900/20 rounded-lg p-3 border border-vida-loca-100 dark:border-vida-loca-800">
                        <div className="flex items-center gap-1 mb-1">
                            <DollarSign className="h-3 w-3 text-vida-loca-600" />
                            <span className="text-xs font-semibold text-vida-loca-700">Serviços</span>
                        </div>
                        {isLoading ? (
                            <div className="h-4 w-16 bg-vida-loca-200 animate-pulse rounded mb-1"></div>
                        ) : (
                            <span className="text-lg font-bold block mb-1">
                                {formatCurrency(serviceRevenue)}
                            </span>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            Receita do Mês
                        </p>
                    </div>
                </div>

                {/* 3. Métricas Secundárias - Simétrico a A Pagar/A Receber */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="text-center">
                        <span className="text-xs text-muted-foreground block">Valor Parado</span>
                        <span className="text-sm font-semibold text-stiletto-600">
                            {formatCurrency(45100.00)}
                        </span>
                    </div>
                    <div className="text-center">
                        <span className="text-xs text-muted-foreground block">Giro Médio</span>
                        <span className="text-sm font-semibold text-vida-loca-600">
                            32 Dias
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}