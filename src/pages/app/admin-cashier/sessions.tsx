import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getSessions } from '@/api/cashier/cashier'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/utils/format-currency'
import { Button } from '@/components/ui/button'

export function AdminCashierSessions() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['admin-cashier-sessions'],
    queryFn: getSessions
  })

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Auditoria de Caixas</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Sessões</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Abertura</TableHead>
                <TableHead>Fechamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5}>Carregando...</TableCell></TableRow>
              ) : sessions?.map(session => (
                <TableRow key={session.id}>
                  <TableCell>{session.id.substring(0, 8)}</TableCell>
                  <TableCell>{new Date(session.opened_at).toLocaleString()}</TableCell>
                  <TableCell>{session.closed_at ? new Date(session.closed_at).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={session.status === 'OPEN' ? 'default' : session.status === 'AUDITED' ? 'secondary' : 'outline'}>
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/cashier/sessions/${session.id}`}>Detalhes</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
