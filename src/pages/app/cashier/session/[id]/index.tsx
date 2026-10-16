import { extrairCaixinhaDeLancamento, REGEX_CAIXINHA } from '@/utils/cashier/caixinha'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import {
  auditSession,
  closeSession,
  createEntry,
  deleteEntry,
  getSessionDetails,
  submitSession,
  updateEntry,
  updateSessionBalance,
} from '@/api/cashier/cashier'
import { getProfile } from '@/api/get-profile'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getPOSMachines } from '@/api/pos-machines'
import { getContaDasVendas } from '@/api/vendas'
import { computeResumoSessao } from '@/utils/cashier/resumo-sessao'

import { DetalheLote } from '../../components/DetalheLote'
import { LinhaDaConta } from '../../components/LinhaDaConta'

export function CashierSessionDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['cashier-session', id],
    queryFn: () => getSessionDetails(id!),
    enabled: !!id,
  })

  const { data: dbMachines } = useQuery({
    queryKey: ['pos-machines'],
    queryFn: getPOSMachines,
  })

  // A conta única do caixa (D11, 16/10/2026): Total vendido × Total recebido e a linha da diferença, a mesma da aba Vendas
  // e do fechamento do PDV (formas contadas × a prazo e aplicativos, que ficam sem contagem física)
  const contaDoCaixa = useQuery({
    queryKey: ['vendas', 'conta', '', '', id],
    queryFn: () => getContaDasVendas({ caixa: id! }),
    enabled: !!id,
  })
  // Lançamento novo, apagado ou editado muda a conta
  const atualizarConta = () => queryClient.invalidateQueries({ queryKey: ['vendas', 'conta'] })

  // Avisos que a conferência devolve (plataforma sem cadastro etc.), 15/10/2026: ficam na tela até a pessoa fechar
  const [avisosDaConferencia, setAvisosDaConferencia] = useState<string[]>([])

  const { mutateAsync: audit } = useMutation({
    mutationFn: auditSession,
    onSuccess: (resposta) => {
      queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
      const avisos = Array.isArray(resposta?.avisos)
        ? resposta.avisos.filter((a) => typeof a === 'string' && a.trim())
        : []
      if (avisos.length > 0) setAvisosDaConferencia(avisos)
    },
  })

  const { mutateAsync: addEntry } = useMutation({
    mutationFn: createEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
      atualizarConta()
    },
  })

  const { mutateAsync: removeEntry } = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
      atualizarConta()
    },
  })

  const { mutateAsync: editEntry } = useMutation({
    mutationFn: updateEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
      atualizarConta()
    },
  })

  const { mutateAsync: editBalance } = useMutation({
    mutationFn: updateSessionBalance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
      toast.success('Saldo inicial atualizado com sucesso!')
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'Erro ao atualizar saldo inicial.',
      )
    },
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
    },
  })

  const { mutateAsync: submitForReview } = useMutation({
    mutationFn: submitSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
      queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'Erro ao enviar para conferência.',
      )
    },
  })

  if (isLoading) {
    return (
      <div className="p-8 text-center text-zinc-500">
        Carregando detalhes do caixa...
      </div>
    )
  }

  if (!data || !data.session) {
    return (
      <div className="p-8 text-center text-zinc-500">Caixa não encontrado.</div>
    )
  }

  const { session, entries, summary } = data

  const isAdmin = profile?.role === 'ADMIN'

  // Volta para a aba Conferência de caixa do módulo Vendas (16/10/2026)
  const handleVoltar = () => navigate('/cashier?aba=conferencia')

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
    if (s === 'AUDITED' || s === 'CHECKED' || s === 'CONFERIDO')
      return 'CHECKED'
    if (s === 'OPEN' || s === 'ABERTO') return 'ABERTO'
    return 'PENDENTE'
  }

  const FORMAS_CASA = [
    'Funcionário',
    'Pró-labore',
    'Cortesia',
    'Permuta',
    'A Prazo',
  ]

  const normalizeStr = (str: string) => {
    if (!str) return ''
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
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
      const { valorCaixinha, paraQuem, temCaixinha } = extrairCaixinhaDeLancamento(e)
      const cleanIdentification = (e.identification || '')
        .replace(REGEX_CAIXINHA, '')
        .trim()

      const consumidorNome =
        e.client?.name ||
        e.employee?.name ||
        (FORMAS_CASA.some(
          (f) => normalizeStr(f) === normalizeStr(e.payment_method),
        ) &&
        cleanIdentification &&
        !normalizeStr(cleanIdentification).includes('mesa') &&
        !normalizeStr(cleanIdentification).includes('balcao') &&
        !normalizeStr(cleanIdentification).includes('delivery')
          ? cleanIdentification
          : '')

      const isCaixinhaAvulsa = Boolean(
        e.is_tip ||
          e.type === 'TIP' ||
          (e.payment_method || '').toLowerCase().includes('caixinha') ||
          (e.payment_method || '').toLowerCase().includes('gorjeta'),
      )

      return {
        id: e.id,
        isSaida: e.is_withdrawal || false,
        isSuprimento: e.is_addition || false,
        isCaixinha: isCaixinhaAvulsa,
        temCaixinha,
        is_checked: e.is_checked || false,
        valor: e.amount,
        formaPagamento: e.payment_method || 'Dinheiro',
        origin: e.origin || 'Mesa',
        identification: cleanIdentification,
        identificacao: cleanIdentification,
        paraQuem: paraQuem || (e.is_tip ? cleanIdentification : ''),
        mesa: e.origin === 'Mesa' ? cleanIdentification : '',
        banco: e.bank || 'CAIXA',
        conferido: e.is_checked || false,
        consumidorCasa: consumidorNome,
        client_id: e.client_id || null,
        employee_id: e.employee_id || null,
        valorCaixinha,
      }
    })

  const loteAtivo = {
    id: session.id,
    dataReferencia: session.opened_at,
    periodo: getPeriodo(session.opened_at, session.period, session.sequence_number),
    valorAbertura: session.initial_balance,
    status: mapStatus(session.status),
    lancamentos: mappedLancamentos,
  }

  // Cálculo do resumo em utils/cashier/resumo-sessao.ts (16/10/2026): agora com o quadro SEM MAQUININHA (lançamentos sem banco)
  const resumoLote =
    summary && Object.keys(summary).length > 0 && summary.GERAL
      ? summary
      : computeResumoSessao(session, entries, dbMachines || [])

  const handleAlterarStatus = async (novoStatus: string) => {
    if (!isAdmin) return
    if (
      novoStatus === 'checked' &&
      session.status !== 'AUDITED' &&
      session.status !== 'CHECKED' &&
      session.status !== 'CONFERIDO'
    ) {
      try {
        await audit(id!)
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Erro ao auditar caixa.')
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
        identification:
          dados.identificacao || (dados.mesa ? `Mesa ${dados.mesa}` : ''),
        client_id: dados.client_id || null,
        employee_id: dados.employee_id || null,
        sector_id: dados.sector_id || null,
      })
    } catch (err: any) {
      console.error('Erro ao adicionar lançamento:', err)
      alert(
        err?.response?.data?.message ||
          'Erro ao adicionar lançamento no caixa.',
      )
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
        is_checked:
          dados.is_checked !== undefined ? dados.is_checked : dados.conferido,
        client_id: dados.client_id !== undefined ? dados.client_id : undefined,
        employee_id: dados.employee_id !== undefined ? dados.employee_id : undefined,
        sector_id: dados.sector_id || null,
      })
    } catch (err: any) {
      console.error('Erro ao editar lançamento:', err)
      alert(err?.response?.data?.message || 'Erro ao editar lançamento no caixa.')
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
      toast.error(
        err?.response?.data?.message || 'Erro ao enviar para conferência.',
      )
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
      toast.error(
        err?.response?.data?.message || 'Erro ao enviar para conferência.',
      )
    }
  }

  // Mergulho 14:X1: mesma regra da nuvem para o fundo de troco (saldo inicial)
  const statusAbertura = mapStatus(session.status)
  const podeEditarAbertura =
    statusAbertura === 'ABERTO' || (statusAbertura === 'PENDENTE' && isAdmin)

  const avisoDePlataforma = avisosDaConferencia.some((a) =>
    a.toLowerCase().includes('plataforma'),
  )

  return (
    <div className="relative">
      <AlertDialog
        open={avisosDaConferencia.length > 0}
        onOpenChange={(open) => !open && setAvisosDaConferencia([])}
      >
        <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Caixa conferido, com{' '}
              {avisosDaConferencia.length === 1
                ? '1 aviso'
                : `${avisosDaConferencia.length} avisos`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              O caixa foi conferido. Veja o que precisa de atenção:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="space-y-2">
            {avisosDaConferencia.map((aviso, i) => (
              <li
                key={i}
                className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
              >
                {aviso}
              </li>
            ))}
          </ul>
          <AlertDialogFooter className="gap-2">
            {avisoDePlataforma && isAdmin && (
              <Link
                to="/settings/delivery-platforms"
                className="inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold hover:bg-muted"
              >
                Abrir Plataformas
              </Link>
            )}
            <AlertDialogAction className="min-h-11">Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DetalheLote
        loteAtivo={loteAtivo}
        resumoLote={resumoLote}
        contaDoCaixa={
          <LinhaDaConta
            conta={contaDoCaixa.data?.conta}
            carregando={contaDoCaixa.isLoading}
            erro={contaDoCaixa.isError}
            titulo="Vendido e recebido neste caixa"
          />
        }
        onVoltar={handleVoltar}
        onAdicionarLancamento={handleAdicionarLancamento}
        onRemoverLancamento={handleRemoverLancamento}
        onEditarLancamento={handleEditarLancamento}
        // Mergulho 14:X1: a nuvem só deixa mudar o fundo de caixa aberto; em conferência, só o ADMIN; conferido, ninguém
        onEditarAbertura={
          podeEditarAbertura
            ? async (novoValor) => {
                if (!id) return
                try {
                  await editBalance({ session_id: id, initial_balance: novoValor })
                } catch (err) {
                  console.error('Erro ao editar saldo:', err)
                }
              }
            : undefined
        }
        onAlterarStatus={handleAlterarStatus}
        onConferirECaixaConferido={
          isAdmin ? handleConferirECaixaConferido : undefined
        }
        onEnviarParaConferencia={
          session.status === 'OPEN'
            ? isAdmin
              ? handleEnviarParaConferenciaComoAdmin
              : handleEnviarParaConferenciaComoOperador
            : undefined
        }
        isAdmin={isAdmin}
        onOrderCompleted={() => {
          queryClient.invalidateQueries({ queryKey: ['cashier-session', id] })
        }}
      />
    </div>
  )
}
