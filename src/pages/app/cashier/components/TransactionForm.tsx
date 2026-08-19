import { useQuery } from '@tanstack/react-query'
import {
  Check,
  ChevronDown,
  Plus,
  Search,
  TrendingDown,
  UserCircle,
  UserPlus,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { getCashierEmployees } from '@/api/cashier/cashier'
import { getAccounts } from '@/api/get-accounts'
import { getClients } from '@/api/get-clients'
import { getSectors } from '@/api/get-sectors'
import { getPaymentIdentifiers } from '@/api/payment-identifiers'
import { getPOSMachines } from '@/api/pos-machines'
import { useModules } from '@/context/module-context'

import { QuickClientDialog } from './QuickClientDialog'

export function TransactionForm({ onAdd }: { onAdd: (dados: any) => void }) {
  const { modules } = useModules()
  const [tipo, setTipo] = useState<
    'venda' | 'sangria' | 'suprimento' | 'caixinha'
  >('venda')
  const [valor, setValor] = useState('')
  const [paraQuem, setParaQuem] = useState('')
  const [forma, setForma] = useState('Dinheiro')
  const [banco, setBanco] = useState('CAIXA')

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  )
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const dropdownListRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Tipo de Devedor (Cliente ou Funcionário) para Conta da Casa / Permuta / A Prazo
  const [targetType, setTargetType] = useState<'client' | 'employee'>('client')
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)

  // Helper para normalização textual imune a acentos e maiúsculas/minúsculas
  const normalizeStr = (str: string) => {
    if (!str) return ''
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  }

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll automático no item destacado
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [highlightedIndex])

  // Buscar dados do banco
  const { data: dbMachines } = useQuery({
    queryKey: ['pos-machines'],
    queryFn: getPOSMachines,
  })

  const { data: dbIdentifiers } = useQuery({
    queryKey: ['payment-identifiers'],
    queryFn: getPaymentIdentifiers,
  })

  const { data: dbAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  })

  const { data: cashierEmployees } = useQuery({
    queryKey: ['cashier-employees'],
    queryFn: getCashierEmployees,
  })

  const { data: sectorsData } = useQuery({
    queryKey: ['sectors'],
    queryFn: getSectors,
  })
  const sectorsList = useMemo(() => {
    if (Array.isArray(sectorsData)) return sectorsData
    if (sectorsData && Array.isArray((sectorsData as any).sectors))
      return (sectorsData as any).sectors
    if (
      sectorsData &&
      (sectorsData as any).data &&
      Array.isArray((sectorsData as any).data.sectors)
    )
      return (sectorsData as any).data.sectors
    return []
  }, [sectorsData])

  const clientsList = useMemo(() => {
    if (Array.isArray(clientsData)) return clientsData
    if (clientsData && Array.isArray((clientsData as any).clients))
      return (clientsData as any).clients
    if (
      clientsData &&
      (clientsData as any).data &&
      Array.isArray((clientsData as any).data.clients)
    )
      return (clientsData as any).data.clients
    return []
  }, [clientsData])

  const employeesList = useMemo(() => {
    if (Array.isArray(cashierEmployees)) return cashierEmployees
    if (cashierEmployees && Array.isArray((cashierEmployees as any).employees))
      return (cashierEmployees as any).employees
    return []
  }, [cashierEmployees])

  const getInitialOrigem = (): 'Mesa' | 'Balcão' | 'Delivery' => {
    const configured = modules?.cashier_default_origin
    if (
      configured === 'Balcão' ||
      configured === 'Delivery' ||
      configured === 'Mesa'
    ) {
      return configured
    }
    const saved = localStorage.getItem('cashier_default_origin')
    if (saved === 'Balcão' || saved === 'Delivery' || saved === 'Mesa') {
      return saved
    }
    return 'Mesa'
  }

  const [tipoOrigem, setTipoOrigem] = useState<'Mesa' | 'Balcão' | 'Delivery'>(
    getInitialOrigem,
  )

  useEffect(() => {
    if (modules?.cashier_default_origin) {
      setTipoOrigem(modules.cashier_default_origin)
    }
  }, [modules?.cashier_default_origin])

  const [numOrigem, setNumOrigem] = useState('')
  const [identificacao, setIdentificacao] = useState('')
  const [consumidorCasa, setConsumidorCasa] = useState('')

  const [descricaoRetirada, setDescricaoRetirada] = useState('')
  const [funcionarioRetiradaId, setFuncionarioRetiradaId] = useState<
    string | null
  >(null)
  const [sectorId, setSectorId] = useState<string | null>(null)
  const [incluirCaixinha, setIncluirCaixinha] = useState(false)
  const [caixinhaValor, setCaixinhaValor] = useState('')
  const [caixinhaParaQuem, setCaixinhaParaQuem] = useState('')

  const [showTooltip, setShowTooltip] = useState(false)

  // Refs para controle refinado do foco
  const valorInputRef = useRef<HTMLInputElement>(null)
  const origemInputRef = useRef<HTMLInputElement>(null)
  const formaSelectRef = useRef<HTMLSelectElement>(null)
  const bancoSelectRef = useRef<HTMLSelectElement>(null)
  const paraQuemInputRef = useRef<HTMLInputElement>(null)
  const submitBtnRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const motivoInputRef = useRef<HTMLInputElement>(null)

  const FORMAS_PAGAMENTO = useMemo(() => {
    const base = [
      { key: '', name: 'Dinheiro', display: '' },
      { key: '', name: 'PIX', display: '' },
      { key: '', name: 'Débito', display: '' },
      { key: '', name: 'Crédito', display: '' },
      { key: '', name: 'Voucher', display: '' },
    ]

    if (dbIdentifiers && dbIdentifiers.length > 0) {
      dbIdentifiers.forEach((idItem, idx) => {
        base.push({
          key: '',
          name: idItem.name,
          display: '',
        })
      })
    } else {
      base.push(
        { key: '', name: 'Funcionário', display: '' },
        { key: '', name: 'Pró-labore', display: '' },
        { key: '', name: 'Cortesia', display: '' },
        { key: '', name: 'Permuta', display: '' },
      )
    }

    const savedOrder = localStorage.getItem('metrics-payment-forms-order')
    if (savedOrder) {
      try {
        const orderArray = JSON.parse(savedOrder)
        base.sort((a, b) => {
          const idxA = orderArray.indexOf(a.name)
          const idxB = orderArray.indexOf(b.name)
          if (idxA === -1 && idxB === -1) return 0
          if (idxA === -1) return 1
          if (idxB === -1) return -1
          return idxA - idxB
        })
      } catch (e) {}
    }

    return base.map((item, index) => {
      const numKey = (index + 1).toString()
      return {
        ...item,
        key: numKey,
        display: `${numKey} - ${item.name}`,
      }
    })
  }, [dbIdentifiers])

  const isAcessoDevedor = useMemo(() => {
    if (tipo !== 'venda') return false
    const normForma = normalizeStr(forma)
    const padraoDevedor = ['funcionario', 'permuta', 'a prazo']
    return padraoDevedor.some((p) => normForma.includes(p))
  }, [forma, tipo])

  const isOperacional = useMemo(() => {
    if (tipo !== 'venda') return false
    if (isAcessoDevedor) return false

    const normForma = normalizeStr(forma)

    const padraoOperacional = ['pro-labore', 'cortesia']
    if (padraoOperacional.some((p) => normForma.includes(p))) return true

    if (dbIdentifiers && dbIdentifiers.length > 0) {
      const found = dbIdentifiers.find(
        (i) => normalizeStr(i.name) === normForma,
      )
      if (found) return true
    }
    return false
  }, [forma, tipo, dbIdentifiers, isAcessoDevedor])

  const isContaCasa = isOperacional || isAcessoDevedor

  // Identifica se a forma selecionada é Funcionário vs Outro A Prazo (Cliente)
  const isEmployeeTarget = useMemo(() => {
    return normalizeStr(forma).includes('funcionario')
  }, [forma])

  // Filtragem em tempo real da lista de Clientes ou Funcionários
  const filteredTargets = useMemo(() => {
    const query = normalizeStr(searchTerm)
    if (isEmployeeTarget) {
      const validEmployees = (employeesList || []).filter(
        (e: any) => e && e.id && e.name,
      )
      if (!query) return validEmployees
      return validEmployees.filter(
        (emp: any) =>
          normalizeStr(emp.name).includes(query) ||
          normalizeStr(emp.role || '').includes(query),
      )
    } else {
      const validClients = (clientsList || []).filter(
        (c: any) => c && c.id && c.name,
      )
      if (!query) return validClients
      return validClients.filter(
        (cli: any) =>
          normalizeStr(cli.name).includes(query) ||
          normalizeStr(cli.phone || '').includes(query) ||
          normalizeStr(cli.identification || '').includes(query),
      )
    }
  }, [isEmployeeTarget, searchTerm, clientsList, employeesList])

  // Funções utilitárias de normalização de categoria
  const normalizeCategory = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()

  const BANCOS_NUMERADOS = useMemo(() => {
    const formaNorm = normalizeCategory(forma)

    let base = []

    if (dbMachines && dbMachines.length > 0) {
      const matchingMachines = dbMachines.filter((m) => {
        if (!m.rates || m.rates.length === 0) return true
        return m.rates.some(
          (r) => normalizeCategory(r.payment_category) === formaNorm,
        )
      })

      const machinesToUse =
        matchingMachines.length > 0 ? matchingMachines : dbMachines

      base = machinesToUse.map((m) => ({
        key: '',
        name: m.name,
        display: '',
      }))
    } else if (
      dbAccounts &&
      dbAccounts.accounts &&
      dbAccounts.accounts.length > 0
    ) {
      base = dbAccounts.accounts.map((acc) => ({
        key: '',
        name: acc.name,
        display: '',
      }))
    } else {
      base = [
        { key: '', name: 'SAFRA', display: '' },
        { key: '', name: 'PAGBANK', display: '' },
        { key: '', name: 'CIELO', display: '' },
        { key: '', name: 'IFOOD', display: '' },
        { key: '', name: 'STONE', display: '' },
      ]
    }

    const savedOrder = localStorage.getItem('metrics-payment-conditions-order')
    if (savedOrder) {
      try {
        const orderArray = JSON.parse(savedOrder)
        base.sort((a, b) => {
          const idxA = orderArray.indexOf(a.name)
          const idxB = orderArray.indexOf(b.name)
          if (idxA === -1 && idxB === -1) return 0
          if (idxA === -1) return 1
          if (idxB === -1) return -1
          return idxA - idxB
        })
      } catch (e) {}
    }

    return base.map((item, index) => {
      const numKey = (index + 1).toString()
      return {
        ...item,
        key: numKey,
        display: `${numKey} - ${item.name}`,
      }
    })
  }, [forma, dbMachines, dbAccounts])

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '')
    const amount = Number(digits) / 100
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const parseCurrencyToFloat = (value: string) => {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
  }

  useEffect(() => {
    if (tipo === 'venda') {
      if (forma === 'Dinheiro') {
        setBanco('CAIXA')
      } else if (isContaCasa) {
        setBanco('CONTA DA CASA')
      } else {
        if (
          BANCOS_NUMERADOS.length > 0 &&
          (banco === 'CAIXA' || banco === 'CONTA DA CASA')
        ) {
          setBanco(BANCOS_NUMERADOS[0].name)
        }
      }
    } else {
      setBanco('CAIXA')
    }
  }, [forma, tipo, isContaCasa, BANCOS_NUMERADOS])

  const advanceFromForma = (formaSelecionada: string) => {
    setForma(formaSelecionada)
    setHighlightedIndex(-1)

    // Determine if the new form is conta da casa (need to check against dbIdentifiers)
    const normForma = normalizeStr(formaSelecionada)
    let newIsContaCasa = false
    if (dbIdentifiers && dbIdentifiers.length > 0) {
      const found = dbIdentifiers.find(
        (i: any) => normalizeStr(i.name) === normForma,
      )
      if (found) newIsContaCasa = true
    }
    if (!newIsContaCasa) {
      const padraoContaCasa = [
        'funcionario',
        'pro-labore',
        'cortesia',
        'permuta',
        'a prazo',
      ]
      newIsContaCasa = padraoContaCasa.some((p) => normForma.includes(p))
    }

    if (formaSelecionada === 'Dinheiro') {
      setBanco('CAIXA')
      setTimeout(() => {
        submitBtnRef.current?.focus()
      }, 60)
    } else if (newIsContaCasa && tipo === 'venda') {
      setBanco('CONTA DA CASA')
      setTimeout(() => {
        const isOperacionalLocal =
          ['pro-labore', 'cortesia'].some((p) => normForma.includes(p)) ||
          (dbIdentifiers &&
            dbIdentifiers.some((i) => normalizeStr(i.name) === normForma))
        if (isOperacionalLocal) {
          motivoInputRef.current?.focus()
        } else {
          setIsDropdownOpen(true)
          searchInputRef.current?.focus()
        }
      }, 80)
    } else {
      setTimeout(() => {
        bancoSelectRef.current?.focus()
      }, 80)
    }
  }

  const advanceFromBanco = (bancoSelecionado: string) => {
    setBanco(bancoSelecionado)
    setTimeout(() => {
      submitBtnRef.current?.focus()
    }, 60)
  }

  const handleFormaKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    const item = FORMAS_PAGAMENTO.find((f) => f.key === e.key)
    if (item) {
      e.preventDefault()
      advanceFromForma(item.name)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      advanceFromForma(forma)
    }
  }

  const handleBancoKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    const item = BANCOS_NUMERADOS.find((b) => b.key === e.key)
    if (item) {
      e.preventDefault()
      advanceFromBanco(item.name)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      advanceFromBanco(banco)
    }
  }

  const handleOrigemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key.toLowerCase()
    if (key === 'b') {
      e.preventDefault()
      setTipoOrigem('Balcão')
      return
    }
    if (key === 'd') {
      e.preventDefault()
      setTipoOrigem('Delivery')
      return
    }
    if (key === 'm') {
      e.preventDefault()
      setTipoOrigem('Mesa')
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      formaSelectRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const valorNumerico = parseCurrencyToFloat(valor)
    if (valorNumerico <= 0) return

    const finalConsumidor = consumidorCasa.trim() || searchTerm.trim() || forma

    let finalIdentificacao =
      tipo === 'venda' && isContaCasa && finalConsumidor
        ? finalConsumidor
        : tipo === 'venda'
          ? numOrigem
            ? `${tipoOrigem} ${numOrigem}`
            : tipoOrigem
          : tipo === 'caixinha'
            ? paraQuem
            : identificacao

    if (tipo === 'venda' && incluirCaixinha) {
      const tipVal = parseCurrencyToFloat(caixinhaValor)
      if (tipVal > 0 && caixinhaParaQuem.trim()) {
        finalIdentificacao = `${finalIdentificacao} [Caixinha: R$ ${tipVal.toFixed(2)} | ${caixinhaParaQuem.trim()}]`
      }
    }

    if (tipo === 'sangria' || tipo === 'suprimento') {
      finalIdentificacao = descricaoRetirada.trim()
    }

    const employeeId =
      tipo === 'venda' && isAcessoDevedor && isEmployeeTarget
        ? selectedEmployeeId
        : tipo === 'sangria'
          ? funcionarioRetiradaId
          : null

    onAdd({
      valor: valorNumerico,
      valorCaixinha: tipo === 'caixinha' ? valorNumerico : 0,
      paraQuem: tipo === 'caixinha' ? paraQuem : '',
      formaPagamento:
        tipo === 'sangria' || tipo === 'suprimento'
          ? tipo === 'sangria'
            ? 'Sangria'
            : 'Suprimento'
          : forma,
      banco: tipo === 'sangria' || tipo === 'suprimento' ? 'CAIXA' : banco,
      origin: tipo === 'venda' ? tipoOrigem : '',
      mesa: tipo === 'venda' && tipoOrigem === 'Mesa' ? numOrigem : '',
      identificacao: finalIdentificacao,
      consumidorCasa: tipo === 'venda' && isContaCasa ? finalConsumidor : '',
      client_id:
        tipo === 'venda' && isAcessoDevedor && !isEmployeeTarget
          ? selectedClientId
          : null,
      employee_id: employeeId,
      isCaixinha: tipo === 'caixinha',
      isSaida: tipo === 'sangria',
      isSuprimento: tipo === 'suprimento',
      type:
        tipo === 'sangria'
          ? 'WITHDRAWAL'
          : tipo === 'suprimento'
            ? 'ADDITION'
            : tipo === 'caixinha'
              ? 'TIP'
              : 'SALE',
      sector_id: tipo === 'sangria' || tipo === 'suprimento' ? sectorId : null,
    })

    setTipo('venda')
    setValor('')
    setParaQuem('')
    setTipoOrigem(getInitialOrigem())
    setNumOrigem('')
    setIdentificacao('')
    setConsumidorCasa('')
    setSearchTerm('')
    setSelectedClientId(null)
    setSelectedEmployeeId(null)
    setDescricaoRetirada('')
    setFuncionarioRetiradaId(null)
    setIncluirCaixinha(false)
    setCaixinhaValor('')
    setCaixinhaParaQuem('')

    setShowTooltip(true)
    setTimeout(() => setShowTooltip(false), 2000)
    setTimeout(() => valorInputRef.current?.focus(), 100)
  }

  const formConfig = {
    venda: {
      title: 'Lançar Venda',
      cardStyle: 'bg-white border-slate-200 dark:bg-slate-900/90 dark:border-slate-800 dark:shadow-xl',
      btnStyle: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25',
      btnLabel: 'Adicionar',
      icon: <Plus size={18} />,
    },
    sangria: {
      title: 'Lançar Sangria',
      cardStyle: 'bg-red-50/40 border-red-200 dark:bg-red-950/20 dark:border-red-950/50',
      btnStyle: 'bg-red-600 hover:bg-red-700',
      btnLabel: 'Lançar Sangria',
      icon: <TrendingDown size={18} />,
    },
    suprimento: {
      title: 'Lançar Suprimento',
      cardStyle: 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-950/50',
      btnStyle: 'bg-emerald-600 hover:bg-emerald-700',
      btnLabel: 'Lançar Suprimento',
      icon: <Plus size={18} />,
    },
    caixinha: {
      title: 'Lançar Caixinha',
      cardStyle: 'bg-purple-50/40 border-purple-200 dark:bg-purple-950/20 dark:border-purple-950/50',
      btnStyle: 'bg-purple-600 hover:bg-purple-700',
      btnLabel: 'Lançar Caixinha',
      icon: <Plus size={18} />,
    },
  }

  const currentConfig = formConfig[tipo]

  return (
    <div
      className={`relative rounded-2xl border p-4 shadow-sm transition-all md:p-6 ${currentConfig.cardStyle}`}
    >
      <QuickClientDialog
        isOpen={isQuickClientOpen}
        onClose={() => setIsQuickClientOpen(false)}
        onSuccess={(newClient) => {
          setTargetType('client')
          setSelectedClientId(newClient.id)
          setSelectedEmployeeId(null)
          setConsumidorCasa(newClient.name)
          setSearchTerm(newClient.name)
          setIsDropdownOpen(false)
        }}
      />

      {/* SELETOR DE MODOS DE OPERAÇÃO (SUB-ABAS DE OPERAÇÃO) */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => {
            setTipo('venda')
            setTimeout(() => valorInputRef.current?.focus(), 50)
          }}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black uppercase transition-all ${tipo === 'venda' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
        >
          <Plus size={14} /> Venda Normal
        </button>
        <button
          type="button"
          onClick={() => {
            setTipo('sangria')
            setForma('Sangria')
            setBanco('CAIXA')
            setTimeout(() => valorInputRef.current?.focus(), 50)
          }}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black uppercase transition-all ${tipo === 'sangria' ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
        >
          <TrendingDown size={14} /> Sangria (Retirada)
        </button>
        <button
          type="button"
          onClick={() => {
            setTipo('suprimento')
            setForma('Suprimento')
            setBanco('CAIXA')
            setTimeout(() => valorInputRef.current?.focus(), 50)
          }}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black uppercase transition-all ${tipo === 'suprimento' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
        >
          <Plus size={14} /> Suprimento (Entrada)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 items-end gap-3 md:flex md:flex-wrap">
          {/* VALOR DA OPERAÇÃO */}
          <div className="col-span-1 md:w-36">
            <label className="mb-1 ml-1 block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
              Valor (R$)
            </label>
            <input
              ref={valorInputRef}
              type="text"
              required
              autoFocus
              value={valor}
              onChange={(e) => setValor(formatCurrency(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (tipo === 'venda') {
                    origemInputRef.current?.focus()
                    origemInputRef.current?.select()
                  } else if (tipo === 'caixinha') {
                    paraQuemInputRef.current?.focus()
                  } else {
                    submitBtnRef.current?.focus()
                  }
                }
              }}
              placeholder="0,00"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 md:p-3 md:text-sm"
            />
          </div>

          {tipo === 'venda' && (
            <>
              {/* ORIGEM (MESA, BALCÃO, DELIVERY) */}
              <div className="col-span-1 md:w-44">
                <div className="mb-1 ml-1 flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                    Origem
                  </label>
                  <div className="flex items-center gap-1 text-[8px]">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setTipoOrigem('Mesa')}
                      className={`rounded px-1 ${tipoOrigem === 'Mesa' ? 'bg-blue-100 font-black text-blue-600' : 'text-zinc-400'}`}
                      title="Mesa (Atalho: M)"
                    >
                      Mesa
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setTipoOrigem('Balcão')}
                      className={`rounded px-1 ${tipoOrigem === 'Balcão' ? 'bg-blue-100 font-black text-blue-600' : 'text-zinc-400'}`}
                      title="Balcão (Atalho: B)"
                    >
                      Balcão
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setTipoOrigem('Delivery')}
                      className={`rounded px-1 ${tipoOrigem === 'Delivery' ? 'bg-blue-100 font-black text-blue-600' : 'text-zinc-400'}`}
                      title="Delivery (Atalho: D)"
                    >
                      Delivery
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    ref={origemInputRef}
                    type="text"
                    value={numOrigem}
                    onChange={(e) => setNumOrigem(e.target.value)}
                    onKeyDown={handleOrigemKeyDown}
                    placeholder={
                      tipoOrigem === 'Mesa'
                        ? 'Nº Mesa'
                        : tipoOrigem === 'Balcão'
                          ? 'Nº Balcão'
                          : 'Nº Delivery'
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 md:p-3 md:text-sm"
                  />
                </div>
              </div>

              {/* FORMA DE PAGAMENTO */}
              <div className="col-span-2 md:w-56">
                <label className="mb-1 ml-1 block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  Forma de Pagamento
                </label>
                <select
                  ref={formaSelectRef}
                  value={forma}
                  onFocus={(e) => {
                    try {
                      e.target.showPicker()
                    } catch (err) {}
                  }}
                  onChange={(e) => {
                    advanceFromForma(e.target.value)
                  }}
                  onKeyDown={handleFormaKeyDown}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 md:p-3 md:text-sm"
                >
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f.key} value={f.name} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                      {f.display}
                    </option>
                  ))}
                </select>
              </div>

              {/* SELETOR DE DEVEDOR COM PESQUISA EM TEMPO REAL (CLIENTE OU FUNCIONÁRIO) */}
              {isAcessoDevedor && (
                <div
                  className="relative col-span-2 animate-in slide-in-from-left-2 md:flex-1"
                  ref={comboboxRef}
                >
                  <div className="mb-1 ml-1 flex items-center justify-between">
                    <label className="flex items-center gap-1 text-[9px] font-black uppercase text-orange-600">
                      <UserCircle size={12} />{' '}
                      {isEmployeeTarget
                        ? 'Selecione o Funcionário (RH)'
                        : 'Selecione o Cliente / Correntista'}
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-orange-500"
                      />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setConsumidorCasa(e.target.value)
                          setIsDropdownOpen(true)
                          setHighlightedIndex(-1)
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        onKeyDown={(e) => {
                          if (!isDropdownOpen || filteredTargets.length === 0) {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              submitBtnRef.current?.focus()
                            }
                            return
                          }
                          if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            setHighlightedIndex((prev) =>
                              Math.min(prev + 1, filteredTargets.length - 1),
                            )
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            setHighlightedIndex((prev) => Math.max(prev - 1, 0))
                          } else if (e.key === 'Enter') {
                            e.preventDefault()
                            const item =
                              highlightedIndex >= 0
                                ? filteredTargets[highlightedIndex]
                                : filteredTargets[0]
                            if (item) {
                              if (isEmployeeTarget) {
                                setSelectedEmployeeId(item.id)
                                setSelectedClientId(null)
                              } else {
                                setSelectedClientId(item.id)
                                setSelectedEmployeeId(null)
                              }
                              setConsumidorCasa(item.name)
                              setSearchTerm(item.name)
                              setIsDropdownOpen(false)
                              setHighlightedIndex(-1)
                              setTimeout(
                                () => submitBtnRef.current?.focus(),
                                60,
                              )
                            }
                          } else if (e.key === 'Escape') {
                            setIsDropdownOpen(false)
                          }
                        }}
                        placeholder={
                          isEmployeeTarget
                            ? 'Digite para buscar o funcionário (RH)...'
                            : 'Digite para buscar o cliente...'
                        }
                        className="w-full rounded-xl border-2 border-orange-200 bg-orange-50/30 py-3 pl-9 pr-8 text-xs font-bold text-orange-950 outline-none focus:ring-2 focus:ring-orange-500 dark:border-orange-950/60 dark:bg-orange-950/20 dark:text-orange-100"
                      />
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-orange-400"
                      />
                    </div>

                    {!isEmployeeTarget && (
                      <button
                        type="button"
                        onClick={() => setIsQuickClientOpen(true)}
                        className="flex h-[42px] shrink-0 items-center gap-1 rounded-xl bg-orange-500 px-3 text-xs font-black uppercase text-white shadow transition-all hover:bg-orange-600 active:scale-95"
                        title="Cadastrar Novo Cliente Rápido"
                      >
                        <UserPlus size={14} /> + Novo
                      </button>
                    )}
                  </div>

                  {/* DROPDOWN FLUTUANTE COM RESULTADOS DA PESQUISA EM TEMPO REAL */}
                  {isDropdownOpen && (
                    <div
                      ref={dropdownListRef}
                      className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-orange-200 bg-white p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
                    >
                      {filteredTargets.length > 0 ? (
                        filteredTargets.map((item: any, idx: number) => {
                          const isSelected = isEmployeeTarget
                            ? selectedEmployeeId === item.id
                            : selectedClientId === item.id
                          return (
                            <div
                              key={item.id}
                              ref={(el) => {
                                itemRefs.current[idx] = el
                              }}
                              onClick={() => {
                                if (isEmployeeTarget) {
                                  setSelectedEmployeeId(item.id)
                                  setSelectedClientId(null)
                                } else {
                                  setSelectedClientId(item.id)
                                  setSelectedEmployeeId(null)
                                }
                                setConsumidorCasa(item.name)
                                setSearchTerm(item.name)
                                setIsDropdownOpen(false)
                                setHighlightedIndex(-1)
                                setTimeout(
                                  () => submitBtnRef.current?.focus(),
                                  60,
                                )
                              }}
                              className={`flex cursor-pointer items-center justify-between rounded-xl p-2.5 text-xs font-bold transition-colors ${isSelected || idx === highlightedIndex ? 'bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-300' : 'text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900'}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  {isEmployeeTarget ? '👤' : '🏢'}
                                </span>
                                <div>
                                  <p className="font-bold">{item.name}</p>
                                  <p className="text-[10px] font-medium text-slate-400">
                                    {isEmployeeTarget
                                      ? item.role || 'Colaborador RH'
                                      : item.phone ||
                                        item.identification ||
                                        'Cliente'}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <Check size={14} className="text-orange-600" />
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="p-3 text-center text-xs font-bold text-slate-400">
                          {searchTerm
                            ? `Nenhum ${isEmployeeTarget ? 'funcionário' : 'cliente'} encontrado com "${searchTerm}"`
                            : 'Nenhum registro cadastrado.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isOperacional && (
                <div className="relative col-span-2 animate-in slide-in-from-left-2 md:flex-1">
                  <div className="mb-1 ml-1 flex items-center justify-between">
                    <label className="flex items-center gap-1 text-[9px] font-black uppercase text-orange-600">
                      <UserCircle size={12} /> Motivo / Descrição
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={motivoInputRef}
                      type="text"
                      value={consumidorCasa}
                      onChange={(e) => {
                        setConsumidorCasa(e.target.value)
                        setSearchTerm(e.target.value)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          submitBtnRef.current?.focus()
                        }
                      }}
                      placeholder="Digite o motivo ou descrição..."
                      className="w-full rounded-xl border-2 border-orange-200 bg-orange-50/30 px-4 py-3 text-xs font-bold text-orange-950 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* BANCO / DESTINO */}
              {!isContaCasa && (
                <div className="col-span-2 md:w-48">
                  <label className="mb-1 ml-1 block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                    Banco / Operadora
                  </label>
                  <select
                    ref={bancoSelectRef}
                    disabled={forma === 'Dinheiro'}
                    value={banco}
                    onFocus={(e) => {
                      try {
                        e.target.showPicker()
                      } catch (err) {}
                    }}
                    onChange={(e) => advanceFromBanco(e.target.value)}
                    onKeyDown={handleBancoKeyDown}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 text-base font-bold text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:border-slate-200/60 disabled:bg-slate-200/40 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:border-slate-800/60 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-600 md:p-3 md:text-sm"
                  >
                    {forma === 'Dinheiro' ? (
                      <option value="CAIXA" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">CAIXA</option>
                    ) : (
                      BANCOS_NUMERADOS.map((b) => (
                        <option key={b.key} value={b.name} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                          {b.display}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
            </>
          )}

          {(tipo === 'sangria' || tipo === 'suprimento') && (
            <>
              {/* MOTIVO / DESCRIÇÃO */}
              <div className="col-span-2 md:flex-1">
                <label className="mb-1 ml-1 block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  Motivo / Descrição
                </label>
                <input
                  type="text"
                  required
                  value={descricaoRetirada}
                  onChange={(e) => setDescricaoRetirada(e.target.value)}
                  placeholder="Ex: Depósito banco, Troco inicial, Vale..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 md:p-3 md:text-sm"
                />
              </div>

              {tipo === 'sangria' && (
                <div className="col-span-2 md:w-56">
                  <label className="mb-1 ml-1 block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                    Funcionário (Vale RH - Opcional)
                  </label>
                  <select
                    value={funcionarioRetiradaId || ''}
                    disabled={!!sectorId}
                    onChange={(e) => {
                      const val = e.target.value || null
                      setFuncionarioRetiradaId(val)
                      if (val) setSectorId(null)
                    }}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 text-base font-bold text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 md:p-3 md:text-sm"
                  >
                    <option value="">Não vincular (Sangria Comum)</option>
                    {employeesList.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="col-span-2 md:w-48">
                <label className="mb-1 ml-1 block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  Setor / Categoria (Opcional)
                </label>
                <select
                  value={sectorId || ''}
                  disabled={!!funcionarioRetiradaId}
                  onChange={(e) => {
                    const val = e.target.value || null
                    setSectorId(val)
                    if (val) setFuncionarioRetiradaId(null)
                  }}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 text-base font-bold text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 md:p-3 md:text-sm"
                >
                  <option value="">Nenhum Setor</option>
                  {sectorsList.map((sec: any) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {tipo === 'caixinha' && (
            <>
              <div className="col-span-2 md:flex-1">
                <label className="mb-1 ml-1 block text-[9px] font-black uppercase text-purple-600">
                  Para quem é a caixinha?
                </label>
                <input
                  ref={paraQuemInputRef}
                  type="text"
                  required
                  value={paraQuem}
                  onChange={(e) => setParaQuem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      formaSelectRef.current?.focus()
                    }
                  }}
                  placeholder="Ex: João, Cozinha, Garçons..."
                  className="w-full rounded-xl border border-purple-200 bg-slate-50 p-4 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-900/50 dark:bg-slate-950 dark:text-slate-100 md:p-3 md:text-sm"
                />
              </div>
              <div className="col-span-2 md:w-48">
                <label className="mb-1 ml-1 block text-[9px] font-black uppercase text-purple-600">
                  Forma de Pagamento
                </label>
                <select
                  ref={formaSelectRef}
                  value={forma}
                  onChange={(e) => setForma(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-purple-200 bg-slate-50 p-4 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-900/50 dark:bg-slate-950 dark:text-slate-100 md:p-3 md:text-sm"
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="Débito">Débito</option>
                  <option value="Crédito">Crédito</option>
                </select>
              </div>
            </>
          )}

          {/* BOTÃO ADICIONAR */}
          <div className="col-span-2 md:w-auto">
            <button
              ref={submitBtnRef}
              type="submit"
              className={`flex h-[46px] w-full items-center justify-center gap-2 rounded-xl px-6 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-95 md:h-[46px] md:w-auto ${currentConfig.btnStyle}`}
            >
              {currentConfig.icon}
              <span>{currentConfig.btnLabel}</span>
            </button>
          </div>
        </div>

        {/* LINKED CAIXINHA TOGGLE & INPUTS - MOVIDO PARA FORA DO GRID PRINCIPAL */}
        {tipo === 'venda' && (
          <div className="flex w-full flex-col gap-2">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setIncluirCaixinha(!incluirCaixinha)}
              className={`flex w-fit items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase transition-all ${incluirCaixinha ? 'border border-purple-200 bg-purple-100 text-purple-700' : 'border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100'}`}
            >
              💖 {incluirCaixinha ? 'Remover Caixinha' : 'Incluir Caixinha'}
            </button>

            {incluirCaixinha && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-purple-100 bg-purple-50/20 p-3 duration-200 animate-in fade-in slide-in-from-top-1">
                <div>
                  <label className="mb-1 ml-1 block text-[9px] font-black uppercase text-purple-600">
                    Valor da Caixinha (R$)
                  </label>
                  <input
                    type="text"
                    required
                    value={caixinhaValor}
                    onChange={(e) =>
                      setCaixinhaValor(formatCurrency(e.target.value))
                    }
                    placeholder="0,00"
                    className="w-full rounded-xl border border-purple-200 bg-white p-2.5 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 ml-1 block text-[9px] font-black uppercase text-purple-600">
                    Para quem é a caixinha?
                  </label>
                  <input
                    type="text"
                    required
                    value={caixinhaParaQuem}
                    onChange={(e) => setCaixinhaParaQuem(e.target.value)}
                    placeholder="Ex: João, Garçons..."
                    className="w-full rounded-xl border border-purple-200 bg-white p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
