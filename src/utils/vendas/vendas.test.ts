import assert from 'node:assert/strict'
import test from 'node:test'

import {
  campo,
  csvDasVendas,
  csvDosProdutos,
  nomeDoArquivo,
  numeroCsv,
} from './exportar-csv.ts'
import {
  atalhoDoPeriodo,
  diaDaVenda,
  moeda,
  numeroDaVenda,
  percentual,
  periodoDoAtalho,
  periodoDoMes,
  quantidade,
  textoDoPeriodo,
} from './formatos.ts'

// Módulo Vendas (16/10/2026): períodos em dias operacionais (o dia vira às 05:00 de Brasília), formatos e o CSV (D10).
// Rodar com: node --test src/utils/vendas/vendas.test.ts

test('o dia operacional vira às 05:00 de Brasília (02:00 do dia 17 ainda é o dia 16)', () => {
  assert.equal(diaDaVenda(new Date('2026-10-17T05:00:00.000Z')), '2026-10-16')
  assert.equal(diaDaVenda(new Date('2026-10-17T08:00:00.000Z')), '2026-10-17')
})

test('atalhos do período', () => {
  const agora = new Date('2026-10-16T15:00:00.000Z')
  assert.deepEqual(periodoDoAtalho('hoje', agora), {
    de: '2026-10-16',
    ate: '2026-10-16',
  })
  assert.deepEqual(periodoDoAtalho('ontem', agora), {
    de: '2026-10-15',
    ate: '2026-10-15',
  })
  assert.deepEqual(periodoDoAtalho('7dias', agora), {
    de: '2026-10-10',
    ate: '2026-10-16',
  })
  assert.deepEqual(periodoDoAtalho('mes', agora), {
    de: '2026-10-01',
    ate: '2026-10-16',
  })
  assert.deepEqual(periodoDoAtalho('mesPassado', agora), {
    de: '2026-09-01',
    ate: '2026-09-30',
  })
  assert.equal(
    atalhoDoPeriodo({ de: '2026-10-10', ate: '2026-10-16' }, agora),
    '7dias',
  )
  assert.equal(
    atalhoDoPeriodo({ de: '2026-10-02', ate: '2026-10-16' }, agora),
    null,
  )
  // Virada do ano
  assert.deepEqual(
    periodoDoAtalho('mesPassado', new Date('2026-01-10T15:00:00.000Z')),
    { de: '2025-12-01', ate: '2025-12-31' },
  )
})

test('período do mês do painel (mes de 0 a 11)', () => {
  assert.deepEqual(periodoDoMes(2026, 1), {
    de: '2026-02-01',
    ate: '2026-02-28',
  })
  assert.deepEqual(periodoDoMes(2028, 1), {
    de: '2028-02-01',
    ate: '2028-02-29',
  })
  assert.deepEqual(periodoDoMes(2026, 11), {
    de: '2026-12-01',
    ate: '2026-12-31',
  })
})

test('formatos', () => {
  assert.equal(moeda(8788.52), 'R$ 8.788,52')
  assert.equal(moeda(-5), '−R$ 5,00')
  assert.equal(moeda(null), '—')
  assert.equal(quantidade(3), '3')
  assert.equal(quantidade(0.33), '0,33')
  assert.equal(quantidade(0.604, 'kg'), '0,604 kg')
  assert.equal(percentual(74.07), '74,1%')
  assert.equal(percentual(null), '—')
  assert.equal(
    textoDoPeriodo({ de: '2026-10-16', ate: '2026-10-16' }),
    '16/10/2026',
  )
  assert.equal(
    textoDoPeriodo({ de: '2026-10-01', ate: '2026-10-16' }),
    '01/10/2026 a 16/10/2026',
  )
  assert.equal(
    numeroDaVenda({ numero: 1234, senha: 7, codigo: '#1f9408ee' }),
    '#1234 · Senha 7',
  )
  assert.equal(
    numeroDaVenda({ numero: null, senha: null, codigo: '#1f9408ee' }),
    '#1f9408ee',
  )
})

const venda = {
  codigo: '#1f9408ee',
  numero: 1234,
  senha: 7,
  criadaEm: '2026-10-16T22:42:00.000Z',
  origem: { rotulo: 'Mesa 07' },
  caixa: { nome: 'Turno 01', computador: 'TERM-AB12' },
  cliente: 'João "Zé"; da Silva',
  total: 1234.5,
  formas: [
    { forma: 'PIX', valor: 1000 },
    { forma: 'Dinheiro', valor: 234.5 },
  ],
  nota: { rotulo: 'Autorizada', numero: 123, serie: 2 },
  cancelada: false,
  cancelamento: null,
}

test('CSV das vendas: ";" e vírgula decimal, aspas quando precisa, hora de Brasília e o BOM', () => {
  const csv = csvDasVendas([
    venda,
    {
      ...venda,
      codigo: '#00000002',
      numero: null,
      senha: null,
      nota: null,
      cancelada: true,
      cancelamento: { motivo: 'Desistiu', quem: 'Ana' },
      formas: [],
    },
  ])
  assert.ok(csv.startsWith('﻿Dia e hora;Venda;'))
  const linhas = csv.split('\r\n')
  assert.equal(linhas.length, 4) // cabeçalho, 2 vendas e a linha vazia do fim
  assert.equal(
    linhas[1],
    '16/10/2026 19:42;#1234 · Senha 7;1234;7;#1f9408ee;Mesa 07;Turno 01;TERM-AB12;"João ""Zé""; da Silva";PIX 1000,00 + Dinheiro 234,50;Autorizada;123;2;1234,50;Concluída;;',
  )
  assert.ok(linhas[2].endsWith(';Cancelada;Desistiu;Ana'))
  assert.ok(linhas[2].includes(';#00000002;'))
})

test('CSV dos produtos: sem permissão, sem as colunas de custo', () => {
  const p = {
    codigo: 10,
    nome: 'Pão francês',
    unidade: 'kg' as const,
    quantidade: 1.234,
    vendas: 3,
    faturamento: 33.3,
    custo: 10,
    margem: 23.3,
    margemPercentual: 69.97,
    participacao: 12.5,
    semCusto: 0,
  }
  const com = csvDosProdutos([p], true).split('\r\n')
  assert.equal(
    com[0],
    '﻿Código;Produto;Unidade;Quantidade;Vendas;Faturamento (R$);Participação (%);Custo (R$);Margem (R$);Margem (%);Quantidade sem custo',
  )
  assert.equal(
    com[1],
    '10;Pão francês;kg;1,234;3;33,30;12,50;10,00;23,30;69,97;0,000',
  )
  const sem = csvDosProdutos([p], false).split('\r\n')
  assert.equal(sem[1], '10;Pão francês;kg;1,234;3;33,30;12,50')
})

test('campos, números e o nome do arquivo', () => {
  assert.equal(campo('a;b'), '"a;b"')
  assert.equal(campo(null), '')
  assert.equal(numeroCsv(null), '')
  assert.equal(numeroCsv(1234.5), '1234,50')
  assert.equal(
    nomeDoArquivo('vendas', { de: '2026-10-16', ate: '2026-10-16' }, 'csv'),
    'vendas-2026-10-16.csv',
  )
  assert.equal(
    nomeDoArquivo('vendas', { de: '2026-10-01', ate: '2026-10-16' }, 'pdf'),
    'vendas-2026-10-01-a-2026-10-16.pdf',
  )
  assert.equal(nomeDoArquivo('vendas', null, 'csv'), 'vendas.csv')
})
