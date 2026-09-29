import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extrairCaixinhaDeLancamento,
  calcularTotalCaixinhaLote,
  REGEX_CAIXINHA,
} from './caixinha.ts'

test('REGEX_CAIXINHA: deve capturar tags com Gorjeta e Caixinha com ponto ou virgula', () => {
  const m1 = 'Mesa 15 [Caixinha: R$ 18.00 | Garçom]'.match(REGEX_CAIXINHA)
  assert.ok(m1)
  assert.equal(m1[1], '18.00')
  assert.equal(m1[2].trim(), 'Garçom')

  const m2 = 'Mesa 12 [Gorjeta: R$ 18,00 | Garçom]'.match(REGEX_CAIXINHA)
  assert.ok(m2)
  assert.equal(m2[1], '18,00')
  assert.equal(m2[2].trim(), 'Garçom')

  const m3 = 'Balcão [Caixinha: R$ 5.50]'.match(REGEX_CAIXINHA)
  assert.ok(m3)
  assert.equal(m3[1], '5.50')
  assert.equal(m3[2], undefined)
})

test('Regra de Ouro da Caixinha: conta de R$ 182,00 passada no débito como R$ 200,00 deve somar estritamente R$ 18,00 de caixinha', () => {
  const lancamentoVendaComCaixinha = {
    amount: 200.0,
    valor: 200.0,
    payment_method: 'Débito',
    type: 'SALE',
    is_tip: false,
    identification: 'Mesa 15 [Caixinha: R$ 18.00 | Garçom]',
  }

  const res = extrairCaixinhaDeLancamento(lancamentoVendaComCaixinha)
  assert.equal(res.temCaixinha, true)
  assert.equal(res.valorCaixinha, 18.0)
  assert.equal(res.paraQuem, 'Garçom')
})

test('Venda comum sem caixinha: conta de R$ 182,00 sem marcação deve resultar em R$ 0,00 de caixinha', () => {
  const lancamentoSemCaixinha = {
    amount: 182.0,
    valor: 182.0,
    payment_method: 'Débito',
    type: 'SALE',
    is_tip: false,
    identification: 'Mesa 15',
  }

  const res = extrairCaixinhaDeLancamento(lancamentoSemCaixinha)
  assert.equal(res.temCaixinha, false)
  assert.equal(res.valorCaixinha, 0.0)
})

test('Caixinha avulsa pura: lançamento de gorjeta direta (sem venda de produto) soma o valor total da entrada', () => {
  const caixinhaAvulsa = {
    amount: 25.0,
    valor: 25.0,
    payment_method: 'Dinheiro',
    type: 'TIP',
    is_tip: true,
    identification: 'Thiago',
  }

  const res = extrairCaixinhaDeLancamento(caixinhaAvulsa)
  assert.equal(res.temCaixinha, true)
  assert.equal(res.valorCaixinha, 25.0)
  assert.equal(res.paraQuem, 'Thiago')
})

test('calcularTotalCaixinhaLote: soma corretamente caixinhas acopladas, avulsas e service_fee de vendas não canceladas', () => {
  const lote = {
    initial_balance: 100.0,
    lancamentos: [
      // 1. Venda de R$ 182,00 passada por R$ 200,00 (Caixinha = 18,00)
      {
        amount: 200.0,
        valor: 200.0,
        payment_method: 'Débito',
        type: 'SALE',
        identification: 'Mesa 15 [Caixinha: R$ 18.00 | Garçom]',
      },
      // 2. Venda comum sem caixinha de R$ 50,00 (Caixinha = 0,00)
      {
        amount: 50.0,
        valor: 50.0,
        payment_method: 'Dinheiro',
        type: 'SALE',
        identification: 'Balcão',
      },
      // 3. Caixinha avulsa pura de R$ 15,00 (Caixinha = 15,00)
      {
        amount: 15.0,
        valor: 15.0,
        payment_method: 'Dinheiro',
        type: 'TIP',
        is_tip: true,
        identification: 'Thiago',
      },
      // 4. Sangria de R$ 30,00 (não soma na caixinha)
      {
        amount: 30.0,
        valor: 30.0,
        is_withdrawal: true,
        isSaida: true,
        payment_method: 'Sangria',
      },
    ],
    sales: [
      // Venda do PDV com taxa de serviço de R$ 12,00
      {
        status: 'COMPLETED',
        service_fee: 12.0,
      },
      // Venda cancelada com taxa de serviço (NÃO deve somar)
      {
        status: 'CANCELLED',
        service_fee: 20.0,
      },
    ],
  }

  // Total esperado: 18.00 (venda 1) + 0.00 (venda 2) + 15.00 (avulsa) + 12.00 (service_fee da sale ativa) = 45.00
  const total = calcularTotalCaixinhaLote(lote)
  assert.equal(total, 45.0)
})
