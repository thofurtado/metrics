import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Loader2, Receipt, ShoppingCart } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  getStockOrigin,
  type InvoiceOrigin,
  type SaleOrigin,
  type StockHistoryOrigin,
  type ViaDoHistorico,
} from '@/api/stock'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import {
  formatarDataHora,
  formatarDinheiro,
  formatarQuantidade,
} from './formatos-do-estoque'

interface OrigemDoMovimentoDialogProps {
  origem: StockHistoryOrigin | null
  via: ViaDoHistorico
  onClose: () => void
}

/** O toque na linha do histórico: abre a venda (itens, pagamentos, cancelamentos, baixas) ou a nota de compra. */
export function OrigemDoMovimentoDialog({
  origem,
  via,
  onClose,
}: OrigemDoMovimentoDialogProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['stock-origin', via, origem?.tipo, origem?.id],
    queryFn: () => getStockOrigin(origem!, via),
    enabled: !!origem,
    retry: false,
  })

  return (
    <Dialog open={!!origem} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="md:max-w-3xl">
        <DialogHeader className="px-5 pb-3 pt-5 md:px-6">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            {origem?.tipo === 'NFE' ? (
              <Receipt className="h-5 w-5 text-emerald-600" aria-hidden />
            ) : (
              <ShoppingCart className="h-5 w-5 text-blue-600" aria-hidden />
            )}
            {origem?.tipo === 'NFE' ? 'Nota de compra' : 'Venda'}
          </DialogTitle>
          <DialogDescription>
            {origem?.tipo === 'NFE'
              ? 'O que entrou no estoque com esta nota.'
              : 'A venda que mexeu no estoque.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 md:px-6">
          {isLoading && (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Carregando...
            </div>
          )}
          {isError && (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              <span className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" aria-hidden />
                Não foi possível abrir.
              </span>
              <Button
                variant="outline"
                className="h-11"
                onClick={() => refetch()}
              >
                Tentar de novo
              </Button>
            </div>
          )}
          {data?.type === 'VENDA' && <DetalheDaVenda venda={data.sale} />}
          {data?.type === 'NFE' && <DetalheDaNota nota={data.invoice} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-1.5 text-sm">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="font-semibold text-foreground">{valor}</span>
    </div>
  )
}

function DetalheDaVenda({ venda }: { venda: SaleOrigin }) {
  const { data, hora } = formatarDataHora(venda.date)
  const cancelada = venda.status === 'CANCELLED'
  return (
    <div className="space-y-5">
      <section className="rounded-xl border p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xl font-black">Venda {venda.number}</span>
          {cancelada && (
            <span className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-sm font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
              Cancelada
            </span>
          )}
        </div>
        <Linha rotulo="Quando" valor={`${data} às ${hora}`} />
        <Linha rotulo="Onde" valor={venda.origin} />
        <Linha rotulo="Caixa" valor={venda.cashier?.name ?? '—'} />
        <Linha
          rotulo="Operador do caixa"
          valor={venda.cashier?.operator ?? '—'}
        />
        <Linha rotulo="Total" valor={formatarDinheiro(venda.total)} />
        {venda.discount > 0 && (
          <Linha rotulo="Desconto" valor={formatarDinheiro(venda.discount)} />
        )}
        {venda.serviceFee > 0 && (
          <Linha rotulo="Serviço" valor={formatarDinheiro(venda.serviceFee)} />
        )}
        {venda.coverCharge > 0 && (
          <Linha rotulo="Couvert" valor={formatarDinheiro(venda.coverCharge)} />
        )}
        {venda.deliveryFee > 0 && (
          <Linha rotulo="Entrega" valor={formatarDinheiro(venda.deliveryFee)} />
        )}
      </section>

      <section>
        <h3 className="mb-2 text-base font-bold">
          Itens e o que saiu do estoque
        </h3>
        <ul className="divide-y rounded-xl border">
          {venda.items.map((i) => (
            <li key={i.id} className="space-y-1 p-3">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="min-w-0 break-words font-semibold">
                  {formatarQuantidade(i.quantity, i.unit)} · {i.name}
                </span>
                <span className="font-semibold">
                  {formatarDinheiro(i.unitPrice * i.quantity - i.discount)}
                </span>
              </div>
              {i.seller && (
                <p className="text-sm text-muted-foreground">
                  Vendedor: {i.seller}
                </p>
              )}
              {i.stock.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Não mexeu no estoque (item sem produto na nuvem ou venda que
                  não subiu completa).
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {i.stock.map((s) => (
                    <li key={s.id} className="text-sm text-muted-foreground">
                      {s.operation === 'IN' ? '+' : '−'}{' '}
                      {formatarQuantidade(s.quantity, s.unit)} {s.name} (
                      {s.kind})
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-base font-bold">Pagamentos</h3>
        {venda.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {cancelada
              ? 'Venda cancelada: os pagamentos saíram do caixa.'
              : 'Nenhum pagamento registrado.'}
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {venda.payments.map((p, idx) => (
              <li
                key={idx}
                className="flex flex-wrap justify-between gap-2 p-3 text-sm"
              >
                <span>
                  {p.method}
                  {p.machine ? ` · ${p.machine}` : ''}
                </span>
                <span className="font-semibold">
                  {formatarDinheiro(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {venda.cancellations.length > 0 && (
        <section>
          <h3 className="mb-2 text-base font-bold">Cancelamentos</h3>
          <ul className="divide-y rounded-xl border">
            {venda.cancellations.map((c, idx) => {
              const quando = formatarDataHora(c.when)
              return (
                <li key={idx} className="space-y-0.5 p-3 text-sm">
                  <p className="font-semibold">
                    {formatarQuantidade(c.quantity)} · {c.item}
                  </p>
                  <p className="text-muted-foreground">
                    {c.reason}
                    {c.who ? ` · ${c.who}` : ''} · {quando.data} {quando.hora}
                  </p>
                  {c.stock && (
                    <p className="text-muted-foreground">Estoque: {c.stock}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function DetalheDaNota({ nota }: { nota: InvoiceOrigin }) {
  const { data, hora } = formatarDataHora(nota.date)
  return (
    <div className="space-y-5">
      <section className="rounded-xl border p-4">
        <p className="mb-2 text-xl font-black">
          {nota.number ? `NF-e ${nota.number}` : 'NF-e'}
        </p>
        <Linha rotulo="Fornecedor" valor={nota.supplier.name ?? '—'} />
        <Linha rotulo="CNPJ" valor={nota.supplier.cnpj ?? '—'} />
        <Linha rotulo="Entrada em" valor={`${data} às ${hora}`} />
        <Linha rotulo="Quem deu entrada" valor={nota.who ?? '—'} />
        <p className="mt-2 break-all text-sm text-muted-foreground">
          Chave: {nota.key}
        </p>
      </section>
      <section>
        <h3 className="mb-2 text-base font-bold">O que entrou</h3>
        <ul className="divide-y rounded-xl border">
          {nota.items.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap justify-between gap-2 p-3 text-sm"
            >
              <span className="min-w-0 break-words">
                <span className="font-semibold">
                  + {formatarQuantidade(i.quantity, i.unit)} · {i.name}
                </span>
                {i.batch ? (
                  <span className="text-muted-foreground">
                    {' '}
                    · lote {i.batch}
                  </span>
                ) : null}
              </span>
              <span className="text-muted-foreground">
                {formatarDinheiro(i.unitCost)} / {i.unit} ·{' '}
                {formatarDinheiro(i.total)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
