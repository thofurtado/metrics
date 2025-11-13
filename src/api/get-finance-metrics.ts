import { api } from '@/lib/axios'

export interface GetFinanceMetricsResponse {
  saldoDisponivel: number
  receita: number
  despesa: number
  aReceber: number
  aPagar: number
  receitaVencida: number
  despesaVencida: number
}

export async function getFinanceMetrics(): Promise<GetFinanceMetricsResponse> {
  try {
    const response = await api.get('/summary')
    console.log('📊 Dados COMPLETOS recebidos da API:', response.data)
    console.log('📊 Estrutura do summary:', response.data.summary)

    // Verifique a estrutura real dos dados
    const apiData = response.data.summary || response.data

    console.log('🔍 Dados que vamos mapear:', apiData)
    console.log('🔍 overdueIncome existe?', 'overdueIncome' in apiData)
    console.log('🔍 overdueExpenses existe?', 'overdueExpenses' in apiData)

    const result = {
      saldoDisponivel: apiData.totalBalance || 0,
      receita: apiData.monthlyIncome || 0,
      despesa: apiData.monthlyExpenses || 0,
      aReceber: apiData.pendingIncome || 0,
      aPagar: apiData.pendingExpenses || 0,
      receitaVencida: apiData.overdueIncome || 0,
      despesaVencida: apiData.overdueExpenses || 0
    }

    console.log('🎯 Resultado final:', result)
    return result

  } catch (error) {
    console.error('❌ Erro na API financeira:', error)
    // Retorna dados vazios em caso de erro
    return {
      saldoDisponivel: 0,
      receita: 0,
      despesa: 0,
      aReceber: 0,
      aPagar: 0,
      receitaVencida: 0,
      despesaVencida: 0
    }
  }
}