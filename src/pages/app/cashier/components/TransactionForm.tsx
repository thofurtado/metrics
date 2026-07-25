import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, TrendingDown, UserCircle, UserPlus, Search, Check, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useModules } from '@/context/module-context';
import { getPOSMachines } from '@/api/pos-machines';
import { getPaymentIdentifiers } from '@/api/payment-identifiers';
import { getAccounts } from '@/api/get-accounts';
import { getClients } from '@/api/get-clients';
import { getCashierUsers } from '@/api/cashier/cashier';
import { QuickClientDialog } from './QuickClientDialog';

export function TransactionForm({ onAdd }: { onAdd: (dados: any) => void }) {
    const { modules } = useModules();
    const [tipo, setTipo] = useState<'venda' | 'sangria' | 'suprimento' | 'caixinha'>('venda');
    const [valor, setValor] = useState('');
    const [paraQuem, setParaQuem] = useState('');
    const [forma, setForma] = useState('Dinheiro');
    const [banco, setBanco] = useState('CAIXA');

    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);

    // Tipo de Devedor (Cliente ou Funcionário) para Conta da Casa / Permuta / A Prazo
    const [targetType, setTargetType] = useState<'client' | 'employee'>('client');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const comboboxRef = useRef<HTMLDivElement>(null);

    // Helper para normalização textual imune a acentos e maiúsculas/minúsculas
    const normalizeStr = (str: string) => {
        if (!str) return '';
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    };

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Buscar dados do banco
    const { data: dbMachines } = useQuery({
        queryKey: ['pos-machines'],
        queryFn: getPOSMachines,
    });

    const { data: dbIdentifiers } = useQuery({
        queryKey: ['payment-identifiers'],
        queryFn: getPaymentIdentifiers,
    });

    const { data: dbAccounts } = useQuery({
        queryKey: ['accounts'],
        queryFn: getAccounts,
    });

    const { data: clientsData } = useQuery({
        queryKey: ['clients'],
        queryFn: getClients,
    });

    const { data: cashierUsers } = useQuery({
        queryKey: ['cashier-users'],
        queryFn: getCashierUsers,
    });

    const clientsList = useMemo(() => {
        if (Array.isArray(clientsData)) return clientsData;
        if (clientsData && Array.isArray((clientsData as any).clients)) return (clientsData as any).clients;
        if (clientsData && (clientsData as any).data && Array.isArray((clientsData as any).data.clients)) return (clientsData as any).data.clients;
        return [];
    }, [clientsData]);

    const employeesList = useMemo(() => {
        if (Array.isArray(cashierUsers)) return cashierUsers;
        if (cashierUsers && Array.isArray((cashierUsers as any).users)) return (cashierUsers as any).users;
        return [];
    }, [cashierUsers]);

    const getInitialOrigem = (): 'Mesa' | 'Balcão' | 'Delivery' => {
        const configured = modules?.cashier_default_origin;
        if (configured === 'Balcão' || configured === 'Delivery' || configured === 'Mesa') {
            return configured;
        }
        const saved = localStorage.getItem('cashier_default_origin')
        if (saved === 'Balcão' || saved === 'Delivery' || saved === 'Mesa') {
            return saved
        }
        return 'Mesa'
    }

    const [tipoOrigem, setTipoOrigem] = useState<'Mesa' | 'Balcão' | 'Delivery'>(getInitialOrigem);

    useEffect(() => {
        if (modules?.cashier_default_origin) {
            setTipoOrigem(modules.cashier_default_origin);
        }
    }, [modules?.cashier_default_origin]);

    const [numOrigem, setNumOrigem] = useState('');
    const [identificacao, setIdentificacao] = useState('');
    const [consumidorCasa, setConsumidorCasa] = useState('');

    const [showTooltip, setShowTooltip] = useState(false);

    // Refs para controle refinado do foco
    const valorInputRef = useRef<HTMLInputElement>(null);
    const origemInputRef = useRef<HTMLInputElement>(null);
    const formaSelectRef = useRef<HTMLSelectElement>(null);
    const bancoSelectRef = useRef<HTMLSelectElement>(null);
    const paraQuemInputRef = useRef<HTMLInputElement>(null);
    const submitBtnRef = useRef<HTMLButtonElement>(null);

    // Monta lista dinâmica de FORMAS_PAGAMENTO
    const FORMAS_PAGAMENTO = useMemo(() => {
        const base = [
            { key: '1', name: 'Dinheiro', display: '1 - Dinheiro' },
            { key: '2', name: 'PIX', display: '2 - PIX' },
            { key: '3', name: 'Débito', display: '3 - Débito' },
            { key: '4', name: 'Crédito', display: '4 - Crédito' },
            { key: '5', name: 'Voucher', display: '5 - Voucher' },
        ];

        if (dbIdentifiers && dbIdentifiers.length > 0) {
            dbIdentifiers.forEach((idItem, idx) => {
                const numKey = (6 + idx).toString();
                base.push({
                    key: numKey,
                    name: idItem.name,
                    display: `${numKey} - ${idItem.name}`,
                });
            });
        } else {
            base.push(
                { key: '6', name: 'Funcionário', display: '6 - Funcionário' },
                { key: '7', name: 'Pró-labore', display: '7 - Pró-labore' },
                { key: '8', name: 'Cortesia', display: '8 - Cortesia' },
                { key: '9', name: 'Permuta', display: '9 - Permuta' }
            );
        }

        return base;
    }, [dbIdentifiers]);

    // Identifica se a forma selecionada é Conta da Casa / Identificador
    const isContaCasa = useMemo(() => {
        if (tipo !== 'venda') return false;
        
        const normForma = normalizeStr(forma);
        if (dbIdentifiers && dbIdentifiers.length > 0) {
            const found = dbIdentifiers.find(i => normalizeStr(i.name) === normForma);
            if (found) return true;
        }

        const padraoContaCasa = ['funcionario', 'pro-labore', 'cortesia', 'permuta', 'a prazo'];
        return padraoContaCasa.some(p => normForma.includes(p));
    }, [forma, tipo, dbIdentifiers]);

    // Ajusta o targetType padrão se a forma de pagamento selecionada for Funcionário
    useEffect(() => {
        const normForma = normalizeStr(forma);
        if (normForma.includes('funcionario')) {
            setTargetType('employee');
        }
    }, [forma]);

    // Filtragem em tempo real da lista de Clientes ou Funcionários
    const filteredTargets = useMemo(() => {
        const query = normalizeStr(searchTerm);
        if (targetType === 'employee') {
            if (!query) return employeesList;
            return employeesList.filter((emp: any) =>
                normalizeStr(emp.name).includes(query) ||
                normalizeStr(emp.role || '').includes(query)
            );
        } else {
            if (!query) return clientsList;
            return clientsList.filter((cli: any) =>
                normalizeStr(cli.name).includes(query) ||
                normalizeStr(cli.phone || '').includes(query) ||
                normalizeStr(cli.identification || '').includes(query)
            );
        }
    }, [targetType, searchTerm, clientsList, employeesList]);

    // Funções utilitárias de normalização de categoria
    const normalizeCategory = (str: string) =>
        str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

    // Monta lista dinâmica de BANCOS_NUMERADOS
    const BANCOS_NUMERADOS = useMemo(() => {
        const formaNorm = normalizeCategory(forma);
        
        if (dbMachines && dbMachines.length > 0) {
            const matchingMachines = dbMachines.filter(m => {
                if (!m.rates || m.rates.length === 0) return true;
                return m.rates.some(r => normalizeCategory(r.payment_category) === formaNorm);
            });

            const machinesToUse = matchingMachines.length > 0 ? matchingMachines : dbMachines;

            return machinesToUse.map((m, idx) => ({
                key: (idx + 1).toString(),
                name: m.name,
                display: `${idx + 1} - ${m.name}`
            }));
        }

        if (dbAccounts && dbAccounts.accounts && dbAccounts.accounts.length > 0) {
            return dbAccounts.accounts.map((acc, idx) => ({
                key: (idx + 1).toString(),
                name: acc.name,
                display: `${idx + 1} - ${acc.name}`
            }));
        }

        return [
            { key: '1', name: 'SAFRA', display: '1 - SAFRA' },
            { key: '2', name: 'PAGBANK', display: '2 - PAGBANK' },
            { key: '3', name: 'CIELO', display: '3 - CIELO' },
            { key: '4', name: 'IFOOD', display: '4 - IFOOD' },
            { key: '5', name: 'STONE', display: '5 - STONE' },
        ];
    }, [forma, dbMachines, dbAccounts]);

    const formatCurrency = (value: string) => {
        const digits = value.replace(/\D/g, '');
        const amount = Number(digits) / 100;
        return amount.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const parseCurrencyToFloat = (value: string) => {
        return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
    };

    useEffect(() => {
        if (tipo === 'venda') {
            if (forma === 'Dinheiro') {
                setBanco('CAIXA');
            } else if (isContaCasa) {
                setBanco('CONTA DA CASA');
            } else {
                if (BANCOS_NUMERADOS.length > 0 && (banco === 'CAIXA' || banco === 'CONTA DA CASA')) {
                    setBanco(BANCOS_NUMERADOS[0].name);
                }
            }
        } else {
            setBanco('CAIXA');
        }
    }, [forma, tipo, isContaCasa, BANCOS_NUMERADOS]);

    const advanceFromForma = (formaSelecionada: string) => {
        setForma(formaSelecionada);

        if (formaSelecionada === 'Dinheiro') {
            setBanco('CAIXA');
            setTimeout(() => {
                submitBtnRef.current?.focus();
            }, 60);
        } else if (isContaCasa && tipo === 'venda') {
            setBanco('CONTA DA CASA');
        } else {
            setTimeout(() => {
                bancoSelectRef.current?.focus();
                try {
                    bancoSelectRef.current?.showPicker();
                } catch (e) {}
            }, 80);
        }
    };

    const advanceFromBanco = (bancoSelecionado: string) => {
        setBanco(bancoSelecionado);
        setTimeout(() => {
            submitBtnRef.current?.focus();
        }, 60);
    };

    const handleFormaKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
        const item = FORMAS_PAGAMENTO.find(f => f.key === e.key);
        if (item) {
            e.preventDefault();
            advanceFromForma(item.name);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            advanceFromForma(forma);
        }
    };

    const handleBancoKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
        const item = BANCOS_NUMERADOS.find(b => b.key === e.key);
        if (item) {
            e.preventDefault();
            advanceFromBanco(item.name);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            advanceFromBanco(banco);
        }
    };

    const handleOrigemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const key = e.key.toLowerCase();
        if (key === 'b') {
            e.preventDefault();
            setTipoOrigem('Balcão');
            return;
        }
        if (key === 'd') {
            e.preventDefault();
            setTipoOrigem('Delivery');
            return;
        }
        if (key === 'm') {
            e.preventDefault();
            setTipoOrigem('Mesa');
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            formaSelectRef.current?.focus();
            try {
                formaSelectRef.current?.showPicker();
            } catch (err) {}
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const valorNumerico = parseCurrencyToFloat(valor);
        if (valorNumerico <= 0) return;

        const finalConsumidor = consumidorCasa.trim() || searchTerm.trim() || forma;

        onAdd({
            valor: valorNumerico,
            valorCaixinha: tipo === 'caixinha' ? valorNumerico : 0,
            paraQuem: tipo === 'caixinha' ? paraQuem : '',
            formaPagamento: (tipo === 'sangria' || tipo === 'suprimento')
                ? (tipo === 'sangria' ? 'Sangria' : 'Suprimento')
                : forma,
            banco: (tipo === 'sangria' || tipo === 'suprimento') ? 'CAIXA' : banco,
            origin: tipo === 'venda' ? tipoOrigem : '',
            mesa: (tipo === 'venda' && tipoOrigem === 'Mesa') ? numOrigem : '',
            identificacao: tipo === 'venda' ? (numOrigem ? `${tipoOrigem} ${numOrigem}` : tipoOrigem) : (tipo === 'caixinha' ? paraQuem : identificacao),
            consumidorCasa: (tipo === 'venda' && isContaCasa) ? finalConsumidor : '',
            client_id: (tipo === 'venda' && isContaCasa && targetType === 'client') ? selectedClientId : null,
            employee_id: (tipo === 'venda' && isContaCasa && targetType === 'employee') ? selectedEmployeeId : null,
            isCaixinha: tipo === 'caixinha',
            isSaida: tipo === 'sangria',
            isSuprimento: tipo === 'suprimento',
            type: tipo === 'sangria' ? 'WITHDRAWAL' : tipo === 'suprimento' ? 'ADDITION' : tipo === 'caixinha' ? 'TIP' : 'SALE'
        });

        setTipo('venda');
        setValor('');
        setParaQuem('');
        setTipoOrigem(getInitialOrigem());
        setNumOrigem('');
        setIdentificacao('');
        setConsumidorCasa('');
        setSearchTerm('');
        setSelectedClientId(null);
        setSelectedEmployeeId(null);

        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2000);
        setTimeout(() => valorInputRef.current?.focus(), 100);
    };

    const formConfig = {
        venda: {
            title: "Lançar Venda",
            cardStyle: "bg-white border-zinc-200",
            btnStyle: "bg-zinc-900 hover:bg-zinc-800",
            btnLabel: "Adicionar",
            icon: <Plus size={18} />
        },
        sangria: {
            title: "Lançar Sangria",
            cardStyle: "bg-red-50/40 border-red-200",
            btnStyle: "bg-red-600 hover:bg-red-700",
            btnLabel: "Lançar Sangria",
            icon: <TrendingDown size={18} />
        },
        suprimento: {
            title: "Lançar Suprimento",
            cardStyle: "bg-emerald-50/40 border-emerald-200",
            btnStyle: "bg-emerald-600 hover:bg-emerald-700",
            btnLabel: "Lançar Suprimento",
            icon: <Plus size={18} />
        },
        caixinha: {
            title: "Lançar Gorjeta / Caixinha",
            cardStyle: "bg-purple-50/40 border-purple-200",
            btnStyle: "bg-purple-600 hover:bg-purple-700",
            btnLabel: "Lançar Caixinha",
            icon: <Plus size={18} />
        }
    };

    const currentConfig = formConfig[tipo];

    return (
        <div className={`rounded-2xl border p-4 md:p-6 shadow-sm transition-all relative ${currentConfig.cardStyle}`}>
            <QuickClientDialog
                isOpen={isQuickClientOpen}
                onClose={() => setIsQuickClientOpen(false)}
                onSuccess={(newClient) => {
                    setTargetType('client');
                    setSelectedClientId(newClient.id);
                    setSelectedEmployeeId(null);
                    setConsumidorCasa(newClient.name);
                    setSearchTerm(newClient.name);
                    setIsDropdownOpen(false);
                }}
            />

            {/* SELETOR DE MODOS DE OPERAÇÃO (SUB-ABAS DE OPERAÇÃO) */}
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-3 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => { setTipo('venda'); setTimeout(() => valorInputRef.current?.focus(), 50); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 shrink-0 ${tipo === 'venda' ? 'bg-zinc-900 text-white shadow-sm' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                >
                    <Plus size={14} /> Venda Normal
                </button>
                <button
                    type="button"
                    onClick={() => { setTipo('sangria'); setForma('Sangria'); setBanco('CAIXA'); setTimeout(() => valorInputRef.current?.focus(), 50); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 shrink-0 ${tipo === 'sangria' ? 'bg-red-600 text-white shadow-sm' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                >
                    <TrendingDown size={14} /> Sangria (Retirada)
                </button>
                <button
                    type="button"
                    onClick={() => { setTipo('suprimento'); setForma('Suprimento'); setBanco('CAIXA'); setTimeout(() => valorInputRef.current?.focus(), 50); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 shrink-0 ${tipo === 'suprimento' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                >
                    <Plus size={14} /> Suprimento (Entrada)
                </button>
                <button
                    type="button"
                    onClick={() => { setTipo('caixinha'); setForma('Dinheiro'); setTimeout(() => valorInputRef.current?.focus(), 50); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 shrink-0 ${tipo === 'caixinha' ? 'bg-purple-600 text-white shadow-sm' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                >
                    <Plus size={14} /> Caixinha (Gorjeta)
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 md:flex md:flex-wrap items-end gap-3">
                    {/* VALOR DA OPERAÇÃO */}
                    <div className="col-span-1 md:w-36">
                        <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1 ml-1">Valor (R$)</label>
                        <input
                            ref={valorInputRef}
                            type="text"
                            required
                            autoFocus
                            value={valor}
                            onChange={e => setValor(formatCurrency(e.target.value))}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (tipo === 'venda') {
                                        origemInputRef.current?.focus();
                                        origemInputRef.current?.select();
                                    } else if (tipo === 'caixinha') {
                                        paraQuemInputRef.current?.focus();
                                    } else {
                                        submitBtnRef.current?.focus();
                                    }
                                }
                            }}
                            placeholder="0,00"
                            className="w-full border border-zinc-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>

                    {tipo === 'venda' && (
                        <>
                            {/* ORIGEM (MESA, BALCÃO, DELIVERY) */}
                            <div className="col-span-1 md:w-44">
                                <div className="flex items-center justify-between mb-1 ml-1">
                                    <label className="text-[9px] font-black uppercase text-zinc-400">Origem</label>
                                    <div className="flex items-center gap-1 text-[8px]">
                                        <button
                                            type="button"
                                            onClick={() => setTipoOrigem('Mesa')}
                                            className={`px-1 rounded ${tipoOrigem === 'Mesa' ? 'bg-blue-100 text-blue-600 font-black' : 'text-zinc-400'}`}
                                            title="Mesa (Atalho: M)"
                                        >
                                            Mesa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTipoOrigem('Balcão')}
                                            className={`px-1 rounded ${tipoOrigem === 'Balcão' ? 'bg-blue-100 text-blue-600 font-black' : 'text-zinc-400'}`}
                                            title="Balcão (Atalho: B)"
                                        >
                                            Balcão
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTipoOrigem('Delivery')}
                                            className={`px-1 rounded ${tipoOrigem === 'Delivery' ? 'bg-blue-100 text-blue-600 font-black' : 'text-zinc-400'}`}
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
                                        onChange={e => setNumOrigem(e.target.value)}
                                        onKeyDown={handleOrigemKeyDown}
                                        placeholder={tipoOrigem === 'Mesa' ? "Nº Mesa" : tipoOrigem === 'Balcão' ? "Nº Balcão" : "Nº Delivery"}
                                        className="w-full border border-zinc-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                            </div>

                            {/* FORMA DE PAGAMENTO */}
                            <div className="col-span-2 md:w-56">
                                <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1 ml-1">
                                    Forma de Pagamento
                                </label>
                                <select
                                    ref={formaSelectRef}
                                    value={forma}
                                    onChange={e => {
                                        advanceFromForma(e.target.value);
                                    }}
                                    onFocus={() => {
                                        try {
                                            formaSelectRef.current?.showPicker();
                                        } catch (e) {}
                                    }}
                                    onKeyDown={handleFormaKeyDown}
                                    className="w-full border border-zinc-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                                >
                                    {FORMAS_PAGAMENTO.map(f => (
                                        <option key={f.key} value={f.name}>
                                            {f.display}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* SELETOR DE DEVEDOR COM PESQUISA EM TEMPO REAL (CLIENTE OU FUNCIONÁRIO) */}
                            {isContaCasa && (
                                <div className="col-span-2 md:flex-1 animate-in slide-in-from-left-2 relative" ref={comboboxRef}>
                                    <div className="flex items-center justify-between mb-1 ml-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase text-orange-600 flex items-center gap-1">
                                                <UserCircle size={12} /> Consumidor / Devedor:
                                            </span>
                                            {/* Alternador entre Cliente e Funcionário */}
                                            <div className="flex items-center bg-orange-100/70 p-0.5 rounded-lg text-[9px] font-black uppercase">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTargetType('client');
                                                        setSelectedEmployeeId(null);
                                                        setSearchTerm('');
                                                        setConsumidorCasa('');
                                                        setIsDropdownOpen(true);
                                                    }}
                                                    className={`px-2 py-0.5 rounded-md transition-all ${targetType === 'client' ? 'bg-orange-500 text-white shadow-xs' : 'text-orange-800 hover:bg-orange-200/50'}`}
                                                >
                                                    🏢 Cliente
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTargetType('employee');
                                                        setSelectedClientId(null);
                                                        setSearchTerm('');
                                                        setConsumidorCasa('');
                                                        setIsDropdownOpen(true);
                                                    }}
                                                    className={`px-2 py-0.5 rounded-md transition-all ${targetType === 'employee' ? 'bg-orange-500 text-white shadow-xs' : 'text-orange-800 hover:bg-orange-200/50'}`}
                                                >
                                                    👤 Funcionário
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={e => {
                                                    setSearchTerm(e.target.value);
                                                    setConsumidorCasa(e.target.value);
                                                    setIsDropdownOpen(true);
                                                }}
                                                onFocus={() => setIsDropdownOpen(true)}
                                                placeholder={targetType === 'employee' ? "Digite para buscar o funcionário..." : "Digite para buscar o cliente..."}
                                                className="w-full border-2 border-orange-200 rounded-xl pl-9 pr-8 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50/30 text-orange-950"
                                            />
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" />
                                        </div>

                                        {targetType === 'client' && (
                                            <button
                                                type="button"
                                                onClick={() => setIsQuickClientOpen(true)}
                                                className="h-[42px] px-3 rounded-xl bg-orange-500 text-white font-black text-xs uppercase hover:bg-orange-600 shrink-0 flex items-center gap-1 shadow transition-all active:scale-95"
                                                title="Cadastrar Novo Cliente Rápido"
                                            >
                                                <UserPlus size={14} /> + Novo
                                            </button>
                                        )}
                                    </div>

                                    {/* DROPDOWN FLUTUANTE COM RESULTADOS DA PESQUISA EM TEMPO REAL */}
                                    {isDropdownOpen && (
                                        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-y-auto rounded-2xl border border-orange-200 bg-white p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                                            {filteredTargets.length > 0 ? (
                                                filteredTargets.map((item: any) => {
                                                    const isSelected = targetType === 'employee'
                                                        ? selectedEmployeeId === item.id
                                                        : selectedClientId === item.id;
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => {
                                                                if (targetType === 'employee') {
                                                                    setSelectedEmployeeId(item.id);
                                                                    setSelectedClientId(null);
                                                                } else {
                                                                    setSelectedClientId(item.id);
                                                                    setSelectedEmployeeId(null);
                                                                }
                                                                setConsumidorCasa(item.name);
                                                                setSearchTerm(item.name);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${isSelected ? 'bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-300' : 'hover:bg-slate-50 text-slate-800 dark:hover:bg-slate-900 dark:text-slate-200'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm">{targetType === 'employee' ? '👤' : '🏢'}</span>
                                                                <div>
                                                                    <p className="font-bold">{item.name}</p>
                                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                                        {targetType === 'employee' ? (item.role || 'Colaborador') : (item.phone || item.identification || 'Cliente')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {isSelected && <Check size={14} className="text-orange-600" />}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-3 text-center text-xs font-bold text-slate-400">
                                                    {searchTerm ? `Nenhum ${targetType === 'employee' ? 'funcionário' : 'cliente'} encontrado com "${searchTerm}"` : 'Nenhum registro cadastrado.'}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* BANCO / DESTINO */}
                            {!isContaCasa && (
                                <div className="col-span-2 md:w-48">
                                    <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1 ml-1">Banco / Operadora</label>
                                    <select
                                        ref={bancoSelectRef}
                                        disabled={forma === 'Dinheiro'}
                                        value={banco}
                                        onChange={e => advanceFromBanco(e.target.value)}
                                        onFocus={() => {
                                            if (forma !== 'Dinheiro') {
                                                try {
                                                    bancoSelectRef.current?.showPicker();
                                                } catch (e) {}
                                            }
                                        }}
                                        onKeyDown={handleBancoKeyDown}
                                        className="w-full border border-zinc-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none bg-white disabled:opacity-60 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                    >
                                        {forma === 'Dinheiro' ? <option value="CAIXA">CAIXA</option> :
                                            BANCOS_NUMERADOS.map(b => (
                                                <option key={b.key} value={b.name}>
                                                    {b.display}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    {tipo === 'caixinha' && (
                        <>
                            <div className="col-span-2 md:flex-1">
                                <label className="text-[9px] font-black uppercase text-purple-600 block mb-1 ml-1">Para quem é a gorjeta?</label>
                                <input
                                    ref={paraQuemInputRef}
                                    type="text"
                                    required
                                    value={paraQuem}
                                    onChange={e => setParaQuem(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            formaSelectRef.current?.focus();
                                        }
                                    }}
                                    placeholder="Ex: João, Cozinha, Garçons..."
                                    className="w-full border border-purple-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                />
                            </div>
                            <div className="col-span-2 md:w-48">
                                <label className="text-[9px] font-black uppercase text-purple-600 block mb-1 ml-1">Forma de Pagamento</label>
                                <select
                                    ref={formaSelectRef}
                                    value={forma}
                                    onChange={e => setForma(e.target.value)}
                                    className="w-full border border-purple-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
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
                            className={`w-full md:w-auto h-[46px] md:h-[46px] px-6 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${currentConfig.btnStyle}`}
                        >
                            {currentConfig.icon}
                            <span>{currentConfig.btnLabel}</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
