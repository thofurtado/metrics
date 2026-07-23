import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSessionDetails, auditSession, getPaymentMethods, CashierEntry } from '@/api/cashier/cashier'
import { getProfile } from '@/api/get-profile'
import { DetalheLote } from '../../components/DetalheLote'

export function CashierSessionDetails() {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: getProfile
    })

    const { data, isLoading } = useQuery({
        queryKey: ['cashier-session', id],
        queryFn: () => getSessionDetails(id!),
        enabled: !!id
    })

    const { data: paymentMethods = [] } = useQuery({
        queryKey: ['payment-methods'],
        queryFn: getPaymentMethods
    })

    const { mutateAsync: audit } = useMutation({
        mutationFn: auditSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
        }
    })

    if (isLoading) {
        return <div className="p-8 text-center text-zinc-500">Carregando detalhes do caixa...</div>
    }

    if (!data) {
        return <div className="p-8 text-center text-zinc-500">Caixa não encontrado.</div>
    }

    const { session, entries, summary } = data

    const isAdmin = profile?.role === 'ADMIN'

    const handleVoltar = () => navigate('/cashier')

    const getPeriodo = (dateString: string) => {
        try {
            const hour = new Date(dateString).getHours()
            return hour < 16 ? 'Almoço' : 'Jantar'
        } catch {
            return 'Desconhecido'
        }
    }

    const mapStatus = (apiStatus: string) => {
        if (apiStatus === 'AUDITED') return 'conferido'
        if (apiStatus === 'CLOSED') return 'alerta'
        return 'pendente'
    }

    const mappedLancamentos = entries.map(e => {
        const pm = paymentMethods.find(p => p.id === e.payment_method_id)
        return {
            id: e.id,
            isSaida: e.type === 'EXPENSE',
            valor: e.amount,
            formaPagamento: pm ? pm.name : 'Outro',
            mesa: '',
            banco: '',
            conferido: false,
            identificacao: e.description || '',
            consumidorCasa: '',
            valorCaixinha: 0
        }
    })

    const loteAtivo = {
        dataReferencia: session.opened_at,
        periodo: getPeriodo(session.opened_at),
        valorAbertura: session.initial_balance,
        status: mapStatus(session.status),
        lancamentos: mappedLancamentos,
    }

    const resumoLote = summary || { totalEntradas: 0, totalSaidas: 0, saldoFinal: 0, diferenca: 0 }

    const handleAlterarStatus = async (novoStatus: string) => {
        if (!isAdmin) return
        if (novoStatus === 'conferido' && session.status !== 'AUDITED') {
            try {
                await audit(id!)
            } catch (err) {
                alert('Erro ao auditar caixa.')
            }
        }
    }

    return (
        <div className="relative">
            <DetalheLote
                loteAtivo={loteAtivo}
                resumoLote={resumoLote}
                onVoltar={handleVoltar}
                onAdicionarLancamento={() => {}}
                onRemoverLancamento={() => {}}
                onEditarLancamento={() => {}}
                onEditarAbertura={() => {}}
                onAlterarStatus={handleAlterarStatus}
                isAdmin={isAdmin}
            />
        </div>
    )
}
