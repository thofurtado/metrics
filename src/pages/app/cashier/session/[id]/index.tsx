import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSessionDetails, auditSession, createEntry, deleteEntry, updateEntry, closeSession, submitSession, updateSessionBalance } from '@/api/cashier/cashier'
import { getProfile } from '@/api/get-profile'
import { getPOSMachines } from '@/api/pos-machines'
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

    const { data: dbMachines } = useQuery({
        queryKey: ['pos-machines'],
        queryFn: getPOSMachines,
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

    const { mutateAsync: removeEntry } = useMutation({
        mutationFn: deleteEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
        }
    })

    const { mutateAsync: editEntry } = useMutation({
        mutationFn: updateEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
        }
    })

    const { mutateAsync: editBalance } = useMutation({
        mutationFn: updateSessionBalance,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
            toast.success('Saldo inicial atualizado com sucesso!')
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Erro ao atualizar saldo inicial.')
        }
    })

    const { mutateAsync: finishSession } = useMutation({
        mutationFn: closeSession,
        onSuccess: () => {
            toast.success('Caixa finalizado e enviado para conferência com sucesso!')
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            window.dispatchEvent(new Event('auth-change'))
            navigate('/cashier/sign-in', { replace: true })
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Erro ao finalizar o caixa.')
        }
    })

    const { mutateAsync: submitForReview } = useMutation({
        mutationFn: submitSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
            queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Erro ao enviar para conferência.')
        }
    })

    if (isLoading) {
        return <div className="p-8 text-center text-zinc-500">Carregando detalhes do caixa...</div>
    }

    if (!data || !data.session) {
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
        const s = (apiStatus || '').toUpperCase().trim()
        if (s === 'AUDITED' || s === 'CHECKED' || s === 'CONFERIDO') return 'CHECKED'
        if (s === 'OPEN' || s === 'ABERTO') return 'ABERTO'
        return 'PENDENTE'
    }

    const FORMAS_CASA = ['Funcionário', 'Pró-labore', 'Cortesia', 'Permuta', 'A Prazo']

    const normalizeStr = (str: string) => {
        if (!str) return ''
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    }

    const mappedLancamentos = (entries || [])
      .sort((a: any, b: any) => {
        if (a.is_checked !== b.is_checked) {
          return a.is_checked ? 1 : -1
        }
        const dateA = new Date(a.created_at || 0).getTime()
        const dateB = new Date(b.created_at || 0).getTime()
        return dateB - dateA
      })
      .map((e: any) => {
        const regexCaixinha = /\[Gorjeta:\s*R\$\s*([\d.,]+)\s*\|\s*([^\]]+)\]/i;
        const match = (e.identification || '').match(regexCaixinha);
        const valorCaixinhaLinked = match ? parseFloat(match[1].replace(',', '.')) : 0;
        const paraQuemCaixinhaLinked = match ? match[2].trim() : '';
        const cleanIdentification = (e.identification || '').replace(regexCaixinha, '').trim();

        const consumidorNome = e.client?.name || e.employee?.name || (
            FORMAS_CASA.some(f => normalizeStr(f) === normalizeStr(e.payment_method)) &&
            cleanIdentification &&
            !normalizeStr(cleanIdentification).includes('mesa') &&
            !normalizeStr(cleanIdentification).includes('balcao') &&
            !normalizeStr(cleanIdentification).includes('delivery')
                ? cleanIdentification
                : ''
        )

        return {
            id: e.id,
            isSaida: e.is_withdrawal || false,
            isSuprimento: e.is_addition || false,
            isCaixinha: e.is_tip || false,
            is_checked: e.is_checked || false,
            valor: e.amount,
            formaPagamento: e.payment_method || 'Dinheiro',
            origin: e.origin || 'Mesa',
            identification: cleanIdentification,
            identificacao: cleanIdentification,
            paraQuem: e.is_tip ? cleanIdentification : paraQuemCaixinhaLinked,
            mesa: e.origin === 'Mesa' ? cleanIdentification : '',
            banco: e.bank || 'CAIXA',
            conferido: e.is_checked || false,
            consumidorCasa: consumidorNome,
            client_id: e.client_id || null,
            employee_id: e.employee_id || null,
            valorCaixinha: e.is_tip ? e.amount : valorCaixinhaLinked
        }
    })

    const loteAtivo = {
        dataReferencia: session.opened_at,
        periodo: getPeriodo(session.opened_at),
        valorAbertura: session.initial_balance,
        status: mapStatus(session.status),
        lancamentos: mappedLancamentos,
    }

    const computeResumo = (sessionObj: any, entriesList: any[], machines: any[]) => {
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
                total: 0,
            },
        }

        const padraoCasa = ['funcionário', 'pró-labore', 'cortesia', 'permuta', 'a prazo']
        const regexCaixinha = /\[Gorjeta:\s*R\$\s*([\d.,]+)\s*\|\s*([^\]]+)\]/i;

        for (const entry of entriesList || []) {
            const amount = Number(entry.amount || 0)
            const method = (entry.payment_method || '').trim()
            const bank = (entry.bank || '').toUpperCase().trim()

            const match = (entry.identification || '').match(regexCaixinha);
            const valorCaixinhaLinked = match ? parseFloat(match[1].replace(',', '.')) : 0;

            if (entry.is_withdrawal) {
                res.CAIXA.totalSaidas += amount
                if (entry.type === 'SANGRIA_DESTINO') {
                    const destBank = bank || 'CAIXA CENTRAL'
                    if (!res[destBank]) {
                        res[destBank] = { PIX: 0, Débito: 0, Crédito: 0, Voucher: 0, caixinha: 0, total: 0, juros: 0, recebimentoCaixa: 0 }
                    }
                    res[destBank].recebimentoCaixa = (res[destBank].recebimentoCaixa || 0) + amount
                }
                continue
            }

            if (entry.is_tip) {
                res.GERAL.totalCaixinha += amount
            } else if (valorCaixinhaLinked > 0) {
                res.GERAL.totalCaixinha += valorCaixinhaLinked
            }

            res.GERAL.entradas += amount

            // Se for Dinheiro ou banco CAIXA
            if (method.toLowerCase() === 'dinheiro' || bank === 'CAIXA') {
                res.CAIXA.entradasDinheiro += amount
            }
            // Se for Consumo Interno / Conta Casa / Identificador
            else if (bank === 'CONTA DA CASA' || padraoCasa.some(p => method.toLowerCase().includes(p))) {
                if (res.CASA[method] === undefined) {
                    res.CASA[method] = 0
                }
                res.CASA[method] += amount
                res.CASA.total += amount
            }
            // Se for Maquininha / Banco digital (SAFRA, STONE, NUBANK, PAGBANK, CIELO, IFOOD, etc.)
            else if (bank) {
                if (!res[bank]) {
                    res[bank] = {
                        PIX: 0,
                        Débito: 0,
                        Crédito: 0,
                        Voucher: 0,
                        caixinha: 0,
                        total: 0,
                        juros: 0,
                    }
                }

                let formaKey = method
                let categoryNorm = ''
                if (method.toUpperCase() === 'PIX') { formaKey = 'PIX'; categoryNorm = 'PIX'; }
                else if (method.toLowerCase().includes('débito') || method.toLowerCase().includes('debito')) { formaKey = 'Débito'; categoryNorm = 'DEBITO'; }
                else if (method.toLowerCase().includes('crédito') || method.toLowerCase().includes('credito')) { formaKey = 'Crédito'; categoryNorm = 'CREDITO'; }
                else if (method.toLowerCase().includes('voucher')) { formaKey = 'Voucher'; categoryNorm = 'VOUCHER'; }

                if (res[bank][formaKey] !== undefined) {
                    res[bank][formaKey] += amount
                } else {
                    res[bank][formaKey] = amount
                }

                if (entry.is_tip) {
                    res[bank].caixinha += amount
                } else if (valorCaixinhaLinked > 0) {
                    res[bank].caixinha += valorCaixinhaLinked
                }
                res[bank].total += amount

                // Calcular Juros Aproximados
                let taxa = 0
                if (categoryNorm && machines && machines.length > 0) {
                    const machine = machines.find((m: any) => m.name.trim().toUpperCase() === bank.toUpperCase())
                    if (machine && machine.rates && machine.rates.length > 0) {
                        const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
                        const target = normalizeStr(categoryNorm)
                        const rate = machine.rates.find((r: any) => normalizeStr(r.payment_category).includes(target))
                        if (rate && rate.tax_percentage) {
                            taxa = (amount * rate.tax_percentage) / 100
                        }
                    }
                }
                res[bank].juros = (res[bank].juros || 0) + taxa
            }
        }

        res.GERAL.saldo = res.GERAL.entradas - res.CAIXA.totalSaidas
        return res
    }

    const resumoLote = summary && Object.keys(summary).length > 0 && summary.GERAL ? summary : computeResumo(session, entries, dbMachines || [])

    const handleAlterarStatus = async (novoStatus: string) => {
        if (!isAdmin) return
        if (novoStatus === 'checked' && session.status !== 'AUDITED' && session.status !== 'CHECKED' && session.status !== 'CONFERIDO') {
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
                is_addition: dados.isSuprimento || false,
                is_tip: dados.isCaixinha || false,
                type: dados.type || 'SALE',
                identification: dados.identificacao || (dados.mesa ? `Mesa ${dados.mesa}` : ''),
                client_id: dados.client_id || null,
                employee_id: dados.employee_id || null,
                sector_id: dados.sector_id || null,
            })
        } catch (err: any) {
            console.error('Erro ao adicionar lançamento:', err)
            alert(err?.response?.data?.message || 'Erro ao adicionar lançamento no caixa.')
        }
    }

    const handleRemoverLancamento = async (entryId: string) => {
        try {
            await removeEntry(entryId)
        } catch (err: any) {
            console.error('Erro ao remover lançamento:', err)
            alert('Erro ao remover lançamento do caixa.')
        }
    }

    const handleEditarLancamento = async (entryId: string, dados: any) => {
        try {
            await editEntry({
                id: entryId,
                amount: dados.valor,
                payment_method: dados.formaPagamento,
                bank: dados.banco,
                identification: dados.identificacao || dados.mesa,
                is_checked: dados.is_checked !== undefined ? dados.is_checked : dados.conferido,
                sector_id: dados.sector_id || null,
            })
        } catch (err: any) {
            console.error('Erro ao editar lançamento:', err)
            alert('Erro ao editar lançamento no caixa.')
        }
    }

    const handleConferirECaixaConferido = async () => {
        if (!id) return
        try {
            await audit(id)
            queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
            queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
            queryClient.invalidateQueries({ queryKey: ['monthly-cash-audit'] })
            toast.success('Caixa conferido e enviado ao Financeiro / RH com sucesso!')
        } catch (err: any) {
            console.error('Erro ao auditar caixa:', err)
            toast.error(err?.response?.data?.message || 'Erro ao conferir caixa.')
        }
    }

    // CASHIER: envia para conferência (OPEN → PENDING) e é deslogado
    const handleEnviarParaConferenciaComoOperador = async () => {
        if (!id) return
        try {
            await submitForReview({ session_id: id })
            toast.success('Caixa enviado para conferência!')
            // Desloga o operador de caixa após enviar
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            window.dispatchEvent(new Event('auth-change'))
            navigate('/cashier/sign-in', { replace: true })
        } catch (err: any) {
            console.error('Erro ao enviar para conferência:', err)
            toast.error(err?.response?.data?.message || 'Erro ao enviar para conferência.')
        }
    }

    // ADMIN: envia para conferência sem deslogar
    const handleEnviarParaConferenciaComoAdmin = async () => {
        if (!id) return
        try {
            await submitForReview({ session_id: id })
            toast.success('Caixa enviado para conferência!')
            queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
            queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
        } catch (err: any) {
            console.error('Erro ao enviar para conferência:', err)
            toast.error(err?.response?.data?.message || 'Erro ao enviar para conferência.')
        }
    }

    return (
        <div className="relative">
            <DetalheLote
                loteAtivo={loteAtivo}
                resumoLote={resumoLote}
                onVoltar={handleVoltar}
                onAdicionarLancamento={handleAdicionarLancamento}
                onRemoverLancamento={handleRemoverLancamento}
                onEditarLancamento={handleEditarLancamento}
                onEditarAbertura={async (novoValor) => {
                    if (!id) return
                    try {
                        await editBalance({ session_id: id, initial_balance: novoValor })
                    } catch (err) {
                        console.error('Erro ao editar saldo:', err)
                    }
                }}
                onAlterarStatus={handleAlterarStatus}
                onConferirECaixaConferido={isAdmin ? handleConferirECaixaConferido : undefined}
                onEnviarParaConferencia={
                    session.status === 'OPEN'
                        ? (isAdmin ? handleEnviarParaConferenciaComoAdmin : handleEnviarParaConferenciaComoOperador)
                        : undefined
                }
                isAdmin={isAdmin}
            />
        </div>
    )
}
