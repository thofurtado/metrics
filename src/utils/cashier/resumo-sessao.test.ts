/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict'
import test from 'node:test'

import { computeResumoSessao, SEM_MAQUININHA } from './resumo-sessao.ts'

// Mesma conta do quadro CARTÕES / PIX (SummaryCards.totalPorForma): soma a forma em todos os quadros de banco
const totalPorForma = (res: any, forma: string) =>
  Object.keys(res)
    .filter((k) => !['GERAL', 'CAIXA', 'CASA'].includes(k))
    .reduce((acc, k) => acc + Number(res[k]?.[forma] || 0), 0)

const centavos = (v: number) => Math.round(v * 100) / 100

// Caixa 10 da Katatau (16/10/2026): Pix com banco somando R$ 1.999,72 e 2 Pix sem banco (R$ 26,00 e R$ 3,50)
const sessao = { initial_balance: 200 }
const lancamentos = [
  { amount: 1500, payment_method: 'Dinheiro', bank: null },
  { amount: 1200.0, payment_method: 'PIX', bank: 'PagBank' },
  { amount: 799.72, payment_method: 'PIX', bank: 'STONE' },
  { amount: 26.0, payment_method: 'PIX', bank: null },
  { amount: 3.5, payment_method: 'PIX', bank: '' },
  { amount: 640.0, payment_method: 'Débito', bank: 'STONE' },
  {
    amount: 475.94,
    payment_method: 'A Prazo',
    bank: null,
    identification: 'Correntista',
  },
  { amount: 80.0, payment_method: 'Sangria', bank: null, is_withdrawal: true },
]

test('Pix sem banco entra no PIX do quadro CARTÕES / PIX (R$ 2.029,22, igual ao PDV)', () => {
  const res = computeResumoSessao(sessao, lancamentos, [])
  assert.equal(centavos(totalPorForma(res, 'PIX')), 2029.22) // antes R$ 1.999,72
})

test('Pix sem banco aparece no quadro "Sem maquininha", sem taxa', () => {
  const res = computeResumoSessao(sessao, lancamentos, [
    { name: 'STONE', rates: [{ payment_category: 'PIX', tax_percentage: 1 }] },
  ])
  assert.equal(centavos(res[SEM_MAQUININHA].PIX), 29.5)
  assert.equal(centavos(res[SEM_MAQUININHA].total), 29.5)
  assert.equal(res[SEM_MAQUININHA].juros, 0)
  // Os bancos continuam iguais
  assert.equal(centavos(res.PAGBANK.PIX), 1200)
  assert.equal(centavos(res.STONE.total), 1439.72)
  assert.equal(centavos(res.STONE.juros), 8)
})

test('O total geral não muda e nenhum lançamento conta duas vezes', () => {
  const res = computeResumoSessao(sessao, lancamentos, [])
  const entradas = lancamentos
    .filter((l) => !l.is_withdrawal)
    .reduce((a, l) => a + l.amount, 0)
  assert.equal(centavos(res.GERAL.entradas), centavos(entradas))

  const somaDosQuadros =
    res.CAIXA.entradasDinheiro +
    res.CASA.total +
    Object.keys(res)
      .filter((k) => !['GERAL', 'CAIXA', 'CASA'].includes(k))
      .reduce((acc, k) => acc + res[k].total, 0)
  assert.equal(centavos(somaDosQuadros), centavos(res.GERAL.entradas))
  assert.equal(centavos(res.GERAL.saldo), centavos(entradas - 80))
  assert.equal(res.CASA.total, 475.94) // a prazo sem banco continua no consumo interno / a prazo
})

test('Qualquer forma sem banco vai para "Sem maquininha" com o nome dela', () => {
  const res = computeResumoSessao(
    sessao,
    [
      { amount: 50, payment_method: 'Crédito', bank: null },
      { amount: 12.5, payment_method: 'Pago na plataforma', bank: null },
    ],
    [],
  )
  assert.equal(res[SEM_MAQUININHA].Crédito, 50)
  assert.equal(res[SEM_MAQUININHA]['Pago na plataforma'], 12.5)
  assert.equal(res[SEM_MAQUININHA].total, 62.5)
})

test('Sem lançamento sem banco, não existe o quadro "Sem maquininha"', () => {
  const res = computeResumoSessao(
    sessao,
    [{ amount: 10, payment_method: 'PIX', bank: 'STONE' }],
    [],
  )
  assert.equal(res[SEM_MAQUININHA], undefined)
})
