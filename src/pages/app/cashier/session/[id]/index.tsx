import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSessionDetails, auditSession, createEntry } from '@/api/cashier/cashier'
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

    const { mutateAsync: audit } = useMutation({
        mutationFn: auditSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
        }
    })

    const { mutateAsync: addEntry } = useMutation({
        mutationFn: createEntry,
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
        if (apiStatus === 'AUDITED' || apiStatus === 'CONFERIDO') return 'conferido'
        if (apiStatus === 'CLOSED') return 'alerta'
        return 'pendente'
    }

    const mappedLancamentos = (entries || []).map((e: any) => {
        return {
            id: e.id,
            isSaida: e.is_withdrawal || false,
            valor: e.amount,
            formaPagamento: e.payment_method || 'Dinheiro',
            mesa: e.origin === 'Mesa' ? (e.identification || '') : '',
            origin: e.origin || '',
            banco: e.bank || 'CAIXA',
            conferido: false,
            identificacao: e.identification || '',
            consumidorCasa: '',
            valorCaixinha: e.is_tip ? e.amount : 0
        }
    })

    const loteAtivo = {
        dataReferencia: session.opened_at,
        periodo: getPeriodo(session.opened_at),
        valorAbertura: session.initial_balance,
        status: mapStatus(session.status),
        lancamentos: mappedLancamentos,
    }

    const calculatedSummary = () => {
        let totalEntradas = 0
        let totalSaidas = 0
        for (const e of entries || []) {
            if (e.is_withdrawal) {
                totalSaidas += e.amount
            } else {
                totalEntradas += e.amount
            }
        }
        const saldoFinal = (session.initial_balance || 0) + totalEntradas - totalSaidas
        return {
            totalEntradas,
            totalSaidas,
            saldoFinal,
            diferenca: 0
        }
    }

    const resumoLote = summary && Object.keys(summary).length > 0 ? summary : calculatedSummary()

    const handleAlterarStatus = async (novoStatus: string) => {
        if (!isAdmin) return
        if (novoStatus === 'conferido' && session.status !== 'AUDITED' && session.status !== 'CONFERIDO') {
            try {
                await audit(id!)
            } catch (err) {
                alert('Erro ao auditar caixa.')
            }
        }
    }

    const handleAdicionarLancamento = async (dados: any) => {
        if (!id) return
        try {
            await addEntry({
                session_id: id,
                origin: dados.origin || 'Mesa',
                bank: dados.banco || 'CAIXA',
                payment_method: dados.formaPagamento || 'Dinheiro',
                amount: dados.valor,
                is_withdrawal: dados.isSaida || false,
                is_tip: dados.isCaixinha || false,
                identification: dados.identificacao || (dados.mesa ? `Mesa ${dados.mesa}` : '')
            })
        } catch (err: any) {
            console.error('Erro ao adicionar lançamento:', err)
            alert(err?.response?.data?.message || 'Erro ao adicionar lançamento no caixa.')
        }
    }

    return (
        <div className="relative">
            <DetalheLote
                loteAtivo={loteAtivo}
                resumoLote={resumoLote}
                onVoltar={handleVoltar}
                onAdicionarLancamento={handleAdicionarLancamento}
                onRemoverLancamento={() => {}}
                onEditarLancamento={() => {}}
                onEditarAbertura={() => {}}
                onAlterarStatus={handleAlterarStatus}
                isAdmin={isAdmin}
            />
        </div>
    )
}

