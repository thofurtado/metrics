import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getPayrollHistory } from "@/api/hr/payroll"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { CheckCircle2, Clock, ArrowLeft, Filter } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"

function getPayrollLabel(type: string) {
    if (!type) return ''
    switch (type) {
        case 'SALARIO_60': return 'Salário Mensal (Saldo)'
        case 'VALE': return 'Vale (Adiantamento)'
        case 'CESTA_BASICA': return 'Cesta Básica'
        case 'VALE_TRANSPORTE': return 'Vale Transporte'
        case 'PONTUACAO_10': return 'Pontuação (Rateio)'
        case 'DIA_EXTRA': return 'Dia Extra'
        case 'ERRO': return 'Erro / Ajuste'
        case 'CONSUMACAO': return 'Consumação'
        default: return type.replace(/_/g, ' ')
    }
}

export function PayrollHistory() {
    const navigate = useNavigate()
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    const [month, setMonth] = useState<string>(String(currentMonth))
    const [year, setYear] = useState<string>(String(currentYear))
    const [type, setType] = useState<string>("ALL")

    const { data, isLoading } = useQuery({
        queryKey: ['payroll-history', month, year, type],
        queryFn: () => getPayrollHistory({
            month: month ? Number(month) : undefined,
            year: year ? Number(year) : undefined,
            type: type === "ALL" ? undefined : type
        })
    })

    const entries = data?.entries || []
    const totalAmount = data?.summary?.totalAmount || 0

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Histórico de Pagamentos</h2>
                    <p className="text-muted-foreground">Consulte todos os pagamentos realizados e pendentes.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" /> Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Mês</Label>
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos os meses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Todos</SelectItem>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <SelectItem key={m} value={String(m)}>
                                            {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Ano</Label>
                            <Input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                placeholder="Ano"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos os tipos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos</SelectItem>
                                    <SelectItem value="SALARIO_60">Salário (Dia 05)</SelectItem>
                                    <SelectItem value="VALE">Vale (Dia 20)</SelectItem>
                                    <SelectItem value="CESTA_BASICA">Cesta Básica</SelectItem>
                                    <SelectItem value="VALE_TRANSPORTE">Vale Transporte</SelectItem>
                                    <SelectItem value="PONTUACAO_10">Pontuação (Rateio)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Lançamentos Encontrados ({entries.length})</CardTitle>
                    <div className="text-xl font-bold text-primary">
                        Total: {formatCurrency(totalAmount)}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data Ref.</TableHead>
                                <TableHead>Funcionário</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">Carregando...</TableCell>
                                </TableRow>
                            ) : entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Nenhum registro encontrado para os filtros selecionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.map((entry: any) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>{new Date(entry.referenceDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{entry.employee?.name}</span>
                                                <span className="text-xs text-muted-foreground">{entry.employee?.role}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{getPayrollLabel(entry.type)}</Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={entry.description}>
                                            {entry.description}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {entry.status === 'PAID' ? (
                                                <Badge className="bg-green-600 hover:bg-green-700">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Pago
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-amber-600 bg-amber-100">
                                                    <Clock className="w-3 h-3 mr-1" /> Pendente
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {formatCurrency(Number(entry.amount))}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
