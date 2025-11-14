import { api } from '@/lib/axios'

// 1. INTERFACE CORRIGIDA: Usa Date, pois é o que o useForm retorna,
// mas a função fará a conversão para string.
export interface UpdateStatusTransactionParams {
  id: string
  amount: number // Valor liquidado (parcial ou total)
  date: Date // Data de liquidação efetiva
  remainingDate?: Date // Data de vencimento para a parcela restante (opcional)
}

// 2. FUNÇÃO CORRIGIDA: Recebe Date e converte para string ISO antes de enviar o PATCH.
export async function updateStatusTransaction({
  id,
  amount,
  date,
  remainingDate,
}: UpdateStatusTransactionParams) {

  // Garantir que as datas são convertidas para o formato ISO string (padrão de API)
  const payload = {
    amount,
    date: date.toISOString(),
    remainingDate: remainingDate ? remainingDate.toISOString() : undefined,
  }

  // Chama o endpoint com o ID da transação original e o corpo da requisição.
  await api.patch(`/switch-transaction/${id}`, payload)
}