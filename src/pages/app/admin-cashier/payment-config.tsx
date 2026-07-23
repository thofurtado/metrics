import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { getPaymentMethods, getPOSMachines, getPaymentConditions } from '@/api/cashier/cashier'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export function PaymentConfig() {
  const { data: methods } = useQuery({ queryKey: ['payment-methods'], queryFn: getPaymentMethods })
  const { data: machines } = useQuery({ queryKey: ['pos-machines'], queryFn: getPOSMachines })
  const { data: conditions } = useQuery({ queryKey: ['payment-conditions'], queryFn: getPaymentConditions })

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Configurações de Pagamento e Caixa</h1>
      
      <Tabs defaultValue="methods" className="w-full">
        <TabsList>
          <TabsTrigger value="methods">Métodos de Pagamento</TabsTrigger>
          <TabsTrigger value="machines">Maquinetas (POS)</TabsTrigger>
          <TabsTrigger value="conditions">Condições</TabsTrigger>
        </TabsList>
        
        <TabsContent value="methods">
          <Card>
            <CardHeader><CardTitle>Métodos de Pagamento</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Taxa (%)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methods?.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{m.id}</TableCell>
                      <TableCell>{m.name}</TableCell>
                      <TableCell>{m.tax_rate}</TableCell>
                      <TableCell><Badge variant={m.active ? 'default' : 'secondary'}>{m.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(!methods || methods.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="machines">
          <Card>
            <CardHeader><CardTitle>Maquinetas (POS)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines?.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{m.id}</TableCell>
                      <TableCell>{m.name}</TableCell>
                      <TableCell><Badge variant={m.active ? 'default' : 'secondary'}>{m.active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(!machines || machines.length === 0) && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conditions">
          <Card>
            <CardHeader><CardTitle>Condições de Pagamento</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conditions?.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>{c.id}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell><Badge variant={c.active ? 'default' : 'secondary'}>{c.active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(!conditions || conditions.length === 0) && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
