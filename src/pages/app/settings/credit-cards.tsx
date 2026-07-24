import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { deleteCreditCard, getCreditCards } from '@/api/credit-cards'
import { CreateCreditCardDialog } from '@/components/create-credit-card-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function CreditCards() {
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const { data: creditCardsResult, isLoading } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: getCreditCards,
  })

  const { mutateAsync: removeCreditCard } = useMutation({
    mutationFn: deleteCreditCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
      toast.success('Cartão removido com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao remover cartão.')
    },
  })

  async function handleDelete(id: string) {
    if (
      confirm(
        'Tem certeza que deseja remover este cartão? (Isso não afetará transações passadas)',
      )
    ) {
      await removeCreditCard(id)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-10">
      <CreateCreditCardDialog
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Cartões de Crédito
          </h1>
          <p className="text-lg text-muted-foreground">
            Gerencie seus cartões de crédito e faturas.
          </p>
        </div>

        <Button
          size="lg"
          className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25 transition-all hover:to-primary active:scale-95"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="mr-2 h-5 w-5" /> Novo Cartão
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-xl border bg-white/90 p-6 shadow-sm dark:bg-card/60"
              >
                <Skeleton className="mb-4 h-6 w-1/3" />
                <Skeleton className="mb-8 h-4 w-2/3" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            ))
          : creditCardsResult?.creditCards?.map((card) => {
              return (
                <div
                  key={card.id}
                  className="group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-2xl border bg-white/90 p-6 shadow-md backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-white hover:shadow-xl dark:bg-card/60 dark:hover:bg-card/90"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <h3
                          className="truncate text-lg font-semibold tracking-tight"
                          title={card.name}
                        >
                          {card.name}
                        </h3>
                      </div>
                      <p className="line-clamp-2 pl-1 text-sm text-muted-foreground">
                        {card.bank}{' '}
                        {card.last_four_digits &&
                          `• final ${card.last_four_digits}`}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-2 -mt-2 text-red-500 opacity-50 transition-opacity hover:bg-red-100 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-red-900/20 sm:opacity-0"
                      onClick={() => handleDelete(card.id)}
                      title="Remover Cartão"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Limite
                      </span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-sm font-medium text-muted-foreground">
                          R$
                        </span>
                        <span className="text-2xl font-bold tracking-tighter text-foreground">
                          {card.credit_limit.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <div className="text-xs font-medium text-muted-foreground">
                        Vencimento:{' '}
                        <span className="font-bold text-foreground">
                          {card.due_day}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        Fechamento:{' '}
                        <span className="font-bold text-foreground">
                          {card.closing_day}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Background decoration */}
                  <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10" />
                </div>
              )
            })}
        {/* Empty State / Add New Card visual cue */}
        {!isLoading && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-white/50 p-6 text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-white hover:text-primary hover:shadow-lg dark:bg-muted/10 dark:hover:bg-muted/30"
          >
            <div className="rounded-xl bg-background p-4 shadow-sm transition-transform group-hover:scale-110">
              <Plus className="h-6 w-6" />
            </div>
            <span className="font-semibold tracking-wide">
              Adicionar Novo Cartão
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
