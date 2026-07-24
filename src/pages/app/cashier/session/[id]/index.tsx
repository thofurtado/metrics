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

    const FORMAS_CASA = ['Funcionário', 'Pró-labore', 'Cortesia', 'Permuta']

    const mappedLancamentos = (entries || []).map((e: any) => {
        return {
            id: e.id,
            isSaida: e.is_withdrawal || false,
            valor: e.amount,
            formaPagamento: e.payment_method || 'Dinheiro',
            origin: e.origin || 'Mesa',
            identification: e.identification || '',
            mesa: e.origin === 'Mesa' ? (e.identification || '') : '',
            banco: e.bank || 'CAIXA',
            conferido: false,
            consumidorCasa: FORMAS_CASA.includes(e.payment_method) ? (e.identification || '') : '',
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

    const computeResumo = (sessionObj: any, entriesList: any[]) => {
        const BANCOS_DIGITAIS = ['SAFRA', 'PAGBANK', 'CIELO', 'IFOOD', 'STONE']

        const res: any = {
            GERAL: {
                entradas: 0,
                totalCaixinha: 0,
                saldo: 0,
            },
            CAIXA: {
                saldoAbertura: sessionObj.initial_balance || 0,
                entradasDinheiro: 0,
                totalSaidas: 0,
            },
            CASA: {
                Funcionário: 0,
                'Pró-labore': 0,
                Cortesia: 0,
                Permuta: 0,
                total: 0,
            },
        }

        for (const banco of BANCOS_DIGITAIS) {
            res[banco] = {
                PIX: 0,
                Débito: 0,
                Crédito: 0,
                Voucher: 0,
                caixinha: 0,
                total: 0,
            }
        }

        for (const entry of entriesList || []) {
            const amount = Number(entry.amount || 0)
            const method = (entry.payment_method || '').trim()
            const bank = (entry.bank || '').toUpperCase().trim()

            if (entry.is_withdrawal) {
                res.CAIXA.totalSaidas += amount
                continue
            }

            if (entry.is_tip) {
                res.GERAL.totalCaixinha += amount
            }

            res.GERAL.entradas += amount

            // Se for Dinheiro ou banco CAIXA
            if (method.toLowerCase() === 'dinheiro' || bank === 'CAIXA') {
                res.CAIXA.entradasDinheiro += amount
            }
            // Se for Consumo Interno / Conta Casa
            else if (FORMAS_CASA.includes(method)) {
                if (res.CASA[method] !== undefined) {
                    res.CASA[method] += amount
                }
                res.CASA.total += amount
            }
            // Se for banco digital (SAFRA, PAGBANK, CIELO, IFOOD, STONE)
            else if (res[bank]) {
                let formaKey = method
                if (method.toUpperCase() === 'PIX') formaKey = 'PIX'
                else if (method.toLowerCase().includes('débito') || method.toLowerCase().includes('debito')) formaKey = 'Débito'
                else if (method.toLowerCase().includes('crédito') || method.toLowerCase().includes('credito')) formaKey = 'Crédito'
                else if (method.toLowerCase().includes('voucher')) formaKey = 'Voucher'

                if (res[bank][formaKey] !== undefined) {
                    res[bank][formaKey] += amount
                }
                if (entry.is_tip) {
                    res[bank].caixinha += amount
                }
                res[bank].total += amount
            }
        }

        res.GERAL.saldo = res.GERAL.entradas - res.CAIXA.totalSaidas
        return res
    }

    const resumoLote = summary && Object.keys(summary).length > 0 && summary.GERAL ? summary : computeResumo(session, entries)

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

