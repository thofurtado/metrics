import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { getSettlements } from '@/api/get-settlements'
import { revertSettlement } from '@/api/revert-settlement'
import { getPendingSettlements } from '@/api/get-pending-settlements'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function Settlements() {
  const queryClient = useQueryClient()

  const { data: settlements, isLoading } = useQuery({
    queryKey: ['settlements'],
    queryFn: getSettlements,
  })

  const { data: pendingSettlements, isLoading: isLoadingPending } = useQuery({
    queryKey: ['pending-settlements'],
    queryFn: getPendingSettlements,
  })

  const { mutateAsync: revert } = useMutation({
    mutationFn: revertSettlement,
    onSuccess: () => {
      toast.success('Liquidação revertida com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
    },
    onError: () => {
      toast.error('Erro ao reverter liquidação.')
    },
  })

  return (
    <>
      <Helmet title="Recebíveis (Cartões)" />
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Recebíveis (Cartões)"
          description="Gestão de transferências automáticas da Conta Transitória para as contas bancárias"
        >
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/transactions">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Transações
              </Link>
            </Button>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['settlements'] })}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </PageHeader>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">A Receber (Pendentes)</TabsTrigger>
            <TabsTrigger value="history">Histórico (Já Liquidadas)</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento Previsto</TableHead>
                    <TableHead>Venda/Descrição</TableHead>
                    <TableHead>Forma Pag.</TableHead>
                    <TableHead className="text-right">Bruto (R$)</TableHead>
                    <TableHead className="text-right">Taxa Prevista</TableHead>
                    <TableHead className="text-right">Líquido Estimado (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPending ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">Carregando pendentes...</TableCell>
                    </TableRow>
                  ) : pendingSettlements && pendingSettlements.length > 0 ? (
                    pendingSettlements.map((tx) => {
                      const taxPerc = tx.interest || 0
                      const feeAmt = (tx.amount * taxPerc) / 100
                      const netAmt = tx.amount - feeAmt
                      
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium text-amber-600 dark:text-amber-500">
                            {format(new Date(tx.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell className="capitalize">{tx.payment_method}</TableCell>
                          <TableCell className="text-right">
                            {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            {taxPerc}%
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-bold">
                            {netAmt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Nenhuma venda de cartão ou Pix aguardando liquidação.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Conta Destino</TableHead>
                    <TableHead className="text-right">Taxa Paga</TableHead>
                    <TableHead className="text-right">Valor Recebido</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Carregando recebíveis...
                      </TableCell>
                    </TableRow>
                  ) : settlements && settlements.length > 0 ? (
                    settlements.map((settlement) => (
                      <TableRow key={settlement.id}>
                        <TableCell className="font-medium">
                          {format(new Date(settlement.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {settlement.description || 'Liquidação de Cartão'}
                        </TableCell>
                        <TableCell>
                          {settlement.destTransaction?.accounts?.name || 'Conta Padrão'}
                        </TableCell>
                        <TableCell className="text-right text-red-500">
                          {settlement.fee_amount.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell className="text-right text-emerald-500 font-semibold">
                          {settlement.destTransaction?.amount.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reverter liquidação?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação desfará a transferência e restaurará os valores na Conta Transitória.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revert({ id: settlement.id })}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Reverter
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Nenhuma liquidação automática encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
