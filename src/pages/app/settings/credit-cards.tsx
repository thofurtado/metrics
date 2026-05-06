import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, CreditCard, MoreVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { getCreditCards, deleteCreditCard } from '@/api/credit-cards'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { CreateCreditCardDialog } from '@/components/create-credit-card-dialog'

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
        }
    })

    async function handleDelete(id: string) {
        if (confirm('Tem certeza que deseja remover este cartão? (Isso não afetará transações passadas)')) {
            await removeCreditCard(id)
        }
    }

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
            <CreateCreditCardDialog 
                open={isCreateModalOpen} 
                onOpenChange={setIsCreateModalOpen} 
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Cartões de Crédito</h1>
                    <p className="text-muted-foreground text-lg">
                        Gerencie seus cartões de crédito e faturas.
                    </p>
                </div>

                <Button 
                    size="lg" 
                    className="shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-primary/90 hover:to-primary transition-all active:scale-95"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus className="mr-2 h-5 w-5" /> Novo Cartão
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-40 rounded-xl border bg-card p-6 shadow-sm">
                            <Skeleton className="h-6 w-1/3 mb-4" />
                            <Skeleton className="h-4 w-2/3 mb-8" />
                            <Skeleton className="h-8 w-1/2" />
                        </div>
                    ))
                ) : (
                    creditCardsResult?.creditCards?.map((card) => {
                        return (
                            <div
                                key={card.id}
                                className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20 aspect-video flex flex-col justify-between"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                                <CreditCard className="h-5 w-5" />
                                            </div>
                                            <h3 className="font-semibold text-lg tracking-tight">{card.name}</h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-1 pl-1">
                                            {card.bank} {card.last_four_digits && `• final ${card.last_four_digits}`}
                                        </p>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="-mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                                        onClick={() => handleDelete(card.id)}
                                        title="Remover Cartão"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="mt-4 flex items-end justify-between">
                                    <div>
                                        <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Limite</span>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-sm font-medium text-muted-foreground">R$</span>
                                            <span className="text-2xl font-bold tracking-tighter text-foreground">
                                                {card.credit_limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col gap-1">
                                        <div className="text-xs font-medium text-muted-foreground">
                                            Vencimento: <span className="text-foreground font-bold">{card.due_day}</span>
                                        </div>
                                        <div className="text-xs font-medium text-muted-foreground">
                                            Fechamento: <span className="text-foreground font-bold">{card.closing_day}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Background decoration */}
                                <div className="absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10" />
                            </div>
                        )
                    })
                )}
                {/* Empty State / Add New Card visual cue */}
                {!isLoading && (
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex h-full min-h-[160px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/5 p-6 transition-all hover:bg-muted/10 hover:border-primary/50 text-muted-foreground hover:text-primary"
                    >
                        <div className="rounded-full bg-background p-3 shadow-sm">
                            <Plus className="h-6 w-6" />
                        </div>
                        <span className="font-medium">Adicionar Novo Cartão</span>
                    </button>
                )}
            </div>
        </div>
    )
}
