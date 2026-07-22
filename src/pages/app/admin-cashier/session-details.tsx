import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getSessionDetails, auditSession } from '@/api/cashier/cashier'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/utils/format-currency'

export function AdminCashierSessionDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-cashier-session-details', id],
    queryFn: () => getSessionDetails(id!),
    enabled: !!id
  })

  const auditMutation = useMutation({
    mutationFn: () => auditSession(id!),
    onSuccess: () => {
      toast.success('Sessão conferida com sucesso')
      queryClient.invalidateQueries({ queryKey: ['admin-cashier-session-details', id] })
    },
    onError: () => toast.error('Erro ao auditar sessão')
  })

  if (isLoading || !data) return <div className="p-8">Carregando detalhes...</div>

  const { session, entries, summary } = data

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Detalhes do Caixa</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/cashier/sessions')}>Voltar</Button>
          {session.status === 'CLOSED' && (
            <Button onClick={() => auditMutation.mutate()} disabled={auditMutation.isPending}>
              Conferir Sessão
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>ID:</strong> {session.id}</p>
            <p><strong>Status:</strong> <Badge>{session.status}</Badge></p>
            <p><strong>Abertura:</strong> {new Date(session.opened_at).toLocaleString()}</p>
            {session.closed_at && <p><strong>Fechamento:</strong> {new Date(session.closed_at).toLocaleString()}</p>}
            <p><strong>Fundo Inicial:</strong> {formatCurrency(session.initial_balance)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Total Calculado (Sistema):</strong> {formatCurrency(session.calculated_total)}</p>
            <p><strong>Total Informado (Operador):</strong> {session.reported_total !== undefined ? formatCurrency(session.reported_total) : '-'}</p>
            {session.difference !== undefined && (
              <p className={`font-bold ${session.difference < 0 ? 'text-red-500' : session.difference > 0 ? 'text-green-500' : ''}`}>
                <strong>Diferença:</strong> {formatCurrency(session.difference)}
              </p>
            )}
            <p><strong>Observações:</strong> {session.notes || 'Nenhuma'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos da Sessão</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries?.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell>{new Date(entry.created_at).toLocaleTimeString()}</TableCell>
                  <TableCell>
                    <Badge variant={entry.type === 'INCOME' ? 'default' : 'destructive'}>{entry.type}</Badge>
                  </TableCell>
                  <TableCell>{entry.description || '-'}</TableCell>
                  <TableCell className={entry.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(entry.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {(!entries || entries.length === 0) && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum lançamento registrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
