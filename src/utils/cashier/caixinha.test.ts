import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extrairCaixinhaDeLancamento,
  calcularTotalCaixinhaLote,
  parseMoedaBR,
  REGEX_CAIXINHA,
} from './caixinha.ts'

test('parseMoedaBR: deve tratar formato com ponto de milhar brasileiro (1.250,00) e formato decimal (1250.00)', () => {
  assert.equal(parseMoedaBR('1.250,00'), 1250.0)
  assert.equal(parseMoedaBR('1250.00'), 1250.0)
  assert.equal(parseMoedaBR('1250,00'), 1250.0)
  assert.equal(parseMoedaBR('18.00'), 18.0)
  assert.equal(parseMoedaBR('18,00'), 18.0)
  assert.equal(parseMoedaBR('0.60'), 0.6)
  assert.equal(parseMoedaBR('0,60'), 0.6)
  assert.equal(parseMoedaBR('1.250.500,50'), 1250500.5)
  assert.equal(parseMoedaBR(''), 0.0)
})

test('REGEX_CAIXINHA: deve capturar tags com Gorjeta e Caixinha com ponto ou virgula, incluindo ponto de milhar', () => {
  const m1 = 'Mesa 15 [Caixinha: R$ 18.00 | Garçom]'.match(REGEX_CAIXINHA)
  assert.ok(m1)
  assert.equal(m1[1], '18.00')
  assert.equal(m1[2].trim(), 'Garçom')

  const m2 = 'Mesa 12 [Gorjeta: R$ 18,00 | Garçom]'.match(REGEX_CAIXINHA)
  assert.ok(m2)
  assert.equal(m2[1], '18,00')
  assert.equal(m2[2].trim(), 'Garçom')

  const m3 = 'Mesa VIP [Caixinha: R$ 1.250,00 | Gerente]'.match(REGEX_CAIXINHA)
  assert.ok(m3)
  assert.equal(m3[1], '1.250,00')
  assert.equal(m3[2].trim(), 'Gerente')
  assert.equal(parseMoedaBR(m3[1]), 1250.0)

  const m4 = 'Balcão [Caixinha: R$ 5.50]'.match(REGEX_CAIXINHA)
  assert.ok(m4)
  assert.equal(m4[1], '5.50')
  assert.equal(m4[2], undefined)
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

test('Caixinha com formato de milhar antigo: R$ 1.250,00 não pode virar 1,25', () => {
  const lancamentoMilhar = {
    amount: 5000.0,
    valor: 5000.0,
    payment_method: 'Crédito',
    type: 'SALE',
    is_tip: false,
    identification: 'Mesa 01 [Caixinha: R$ 1.250,00 | Maître]',
  }

  const res = extrairCaixinhaDeLancamento(lancamentoMilhar)
  assert.equal(res.temCaixinha, true)
  assert.equal(res.valorCaixinha, 1250.0)
  assert.equal(res.paraQuem, 'Maître')
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

test('Serviço 10% NÃO é caixinha: turno com caixinha de R$ 18,00 e serviço de R$ 16,00 deve resultar em caixinha = R$ 18,00', () => {
  const lote = {
    initial_balance: 100.0,
    lancamentos: [
      // Venda de R$ 182,00 passada por R$ 200,00 (Caixinha = R$ 18,00)
      {
        amount: 200.0,
        valor: 200.0,
        payment_method: 'Débito',
        type: 'SALE',
        identification: 'Mesa 15 [Caixinha: R$ 18.00 | Garçom]',
      },
    ],
    sales: [
      // Venda com taxa de serviço de R$ 16,00 (10% na nota fiscal)
      {
        status: 'COMPLETED',
        service_fee: 16.0,
      },
    ],
  }

  const total = calcularTotalCaixinhaLote(lote)
  // Regra do Thomás: serviço não é caixinha. O total de caixinhas DEVE ser estritamente R$ 18,00!
  assert.equal(total, 18.0)
})
