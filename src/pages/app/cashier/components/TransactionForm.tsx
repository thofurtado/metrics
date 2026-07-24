import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, ArrowLeft, TrendingDown, PlusCircle, Heart, CheckCircle2, UserCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useModules } from '@/context/module-context';
import { getPOSMachines } from '@/api/pos-machines';
import { getPaymentIdentifiers } from '@/api/payment-identifiers';
import { getAccounts } from '@/api/get-accounts';

export function TransactionForm({ onAdd }: { onAdd: (dados: any) => void }) {
    const { modules } = useModules();
    const [tipo, setTipo] = useState<'venda' | 'sangria' | 'suprimento' | 'caixinha'>('venda');
    const [valor, setValor] = useState('');
    const [paraQuem, setParaQuem] = useState('');
    const [forma, setForma] = useState('Dinheiro');
    const [banco, setBanco] = useState('CAIXA');

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

    // Origem: Mesa, Balcão ou Delivery (carrega das configurações)
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
    const consumidorInputRef = useRef<HTMLInputElement>(null);
    const bancoSelectRef = useRef<HTMLSelectElement>(null);
    const identificacaoInputRef = useRef<HTMLInputElement>(null);
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
            // Fallback padrão se ainda não carregou do banco
            base.push(
                { key: '6', name: 'Funcionário', display: '6 - Funcionário' },
                { key: '7', name: 'Pró-labore', display: '7 - Pró-labore' },
                { key: '8', name: 'Cortesia', display: '8 - Cortesia' },
                { key: '9', name: 'Permuta', display: '9 - Permuta' }
            );
        }

        return base;
    }, [dbIdentifiers]);

    // Identifica se a forma selecionada é Conta da Casa / Identificador (A Prazo ou Operacional)
    const isContaCasa = useMemo(() => {
        if (tipo !== 'venda') return false;
        
        // Verifica nos identificadores do banco
        if (dbIdentifiers && dbIdentifiers.length > 0) {
            const found = dbIdentifiers.find(i => i.name.toLowerCase() === forma.toLowerCase());
            if (found) return true;
        }

        // Padrão fallback
        const padraoContaCasa = ['funcionário', 'pró-labore', 'cortesia', 'permuta', 'a prazo'];
        return padraoContaCasa.includes(forma.toLowerCase());
    }, [forma, tipo, dbIdentifiers]);

    // Funções utilitárias de normalização de categoria
    const normalizeCategory = (str: string) =>
        str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

    // Monta lista dinâmica de BANCOS_NUMERADOS filtrados por modalidade
    const BANCOS_NUMERADOS = useMemo(() => {
        const formaNorm = normalizeCategory(forma);
        
        // Se houver maquininhas cadastradas no banco
        if (dbMachines && dbMachines.length > 0) {
            // Filtra maquininhas que possuem a taxa cadastrada para essa categoria
            const matchingMachines = dbMachines.filter(m => {
                if (!m.rates || m.rates.length === 0) return true; // Se não tem filtro de taxa, mostra
                return m.rates.some(r => normalizeCategory(r.payment_category) === formaNorm);
            });

            const machinesToUse = matchingMachines.length > 0 ? matchingMachines : dbMachines;

            return machinesToUse.map((m, idx) => ({
                key: (idx + 1).toString(),
                name: m.name,
                display: `${idx + 1} - ${m.name}`
            }));
        }

        // Fallback para contas bancárias gerais ou lista genérica
        if (dbAccounts && dbAccounts.accounts && dbAccounts.accounts.length > 0) {
            return dbAccounts.accounts.map((acc, idx) => ({
                key: (idx + 1).toString(),
                name: acc.name,
                display: `${idx + 1} - ${acc.name}`
            }));
        }

        // Fallback padrão fixo
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
                // Seleciona a primeira maquininha válida para aquela modalidade
                if (BANCOS_NUMERADOS.length > 0 && (banco === 'CAIXA' || banco === 'CONTA DA CASA')) {
                    setBanco(BANCOS_NUMERADOS[0].name);
                }
            }
        } else {
            setBanco('CAIXA');
        }
    }, [forma, tipo, isContaCasa, BANCOS_NUMERADOS]);

    // Avança para o próximo campo com base na forma de pagamento selecionada
    const advanceFromForma = (formaSelecionada: string) => {
        setForma(formaSelecionada);

        if (formaSelecionada === 'Dinheiro') {
            setBanco('CAIXA');
            setTimeout(() => {
                submitBtnRef.current?.focus();
            }, 60);
        } else if (isContaCasa && tipo === 'venda') {
            setBanco('CONTA DA CASA');
            setTimeout(() => {
                consumidorInputRef.current?.focus();
                consumidorInputRef.current?.select();
            }, 100);
        } else {
            setTimeout(() => {
                bancoSelectRef.current?.focus();
                try {
                    bancoSelectRef.current?.showPicker();
                } catch (e) {}
            }, 80);
        }
    };

    // Avança a partir da seleção do Banco
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
            consumidorCasa: (tipo === 'venda' && isContaCasa) ? consumidorCasa : '',
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
            icon: <PlusCircle size={18} />
        },
        caixinha: {
            title: "Lançar Gorjeta",
            cardStyle: "bg-purple-50/40 border-purple-200",
            btnStyle: "bg-purple-600 hover:bg-purple-700",
            btnLabel: "Lançar Gorjeta",
            icon: <Heart size={18} fill="currentColor" />
        }
    };

    const currentConfig = formConfig[tipo];

    return (
        <div className={`p-4 md:p-6 rounded-3xl border shadow-xl transition-all relative ${currentConfig.cardStyle}`}>
            {showTooltip && (
                <div className="absolute top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={16} /> Lançamento registrado com sucesso!
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="font-black text-zinc-900 text-lg md:text-xl uppercase tracking-tight">{currentConfig.title}</h3>
                </div>

                <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-2xl overflow-x-auto max-w-full">
                    <button
                        type="button"
                        onClick={() => setTipo('venda')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${tipo === 'venda' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
                    >
                        Venda
                    </button>
                    <button
                        type="button"
                        onClick={() => setTipo('sangria')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${tipo === 'sangria' ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-500 hover:text-red-600'}`}
                    >
                        Sangria
                    </button>
                    <button
                        type="button"
                        onClick={() => setTipo('suprimento')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${tipo === 'suprimento' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-500 hover:text-emerald-600'}`}
                    >
                        Suprimento
                    </button>
                    <button
                        type="button"
                        onClick={() => setTipo('caixinha')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${tipo === 'caixinha' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-500 hover:text-purple-600'}`}
                    >
                        Gorjeta
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 md:flex md:flex-wrap items-end gap-3 md:gap-4">
                        {/* VALOR */}
                        <div className="col-span-2 md:w-36">
                            <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1 ml-1">Valor (R$)</label>
                            <input
                                ref={valorInputRef}
                                type="text"
                                required
                                value={valor}
                                onChange={e => setValor(formatCurrency(e.target.value))}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (tipo === 'venda') {
                                            origemInputRef.current?.focus();
                                        } else if (tipo === 'caixinha') {
                                            paraQuemInputRef.current?.focus();
                                        } else {
                                            identificacaoInputRef.current?.focus();
                                        }
                                    }
                                }}
                                placeholder="0,00"
                                className="w-full border border-zinc-200 rounded-xl p-4 md:p-3 text-lg md:text-base font-black outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>

                        {tipo === 'venda' && (
                            <>
                                {/* ORIGEM DA VENDA (MESA, BALCÃO, DELIVERY) */}
                                <div className="col-span-2 md:w-48">
                                    <div className="flex items-center justify-between mb-1 px-1">
                                        <label className="text-[9px] font-black uppercase text-zinc-400 block">Origem</label>
                                        <div className="flex items-center gap-1 text-[9px]">
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setTipoOrigem('Mesa')}
                                                className={`px-1 rounded ${tipoOrigem === 'Mesa' ? 'bg-blue-100 text-blue-600 font-black' : 'text-zinc-400'}`}
                                                title="Mesa (Atalho: M)"
                                            >
                                                Mesa
                                            </button>
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setTipoOrigem('Balcão')}
                                                className={`px-1 rounded ${tipoOrigem === 'Balcão' ? 'bg-blue-100 text-blue-600 font-black' : 'text-zinc-400'}`}
                                                title="Balcão (Atalho: B)"
                                            >
                                                Balcão
                                            </button>
                                            <button
                                                type="button"
                                                tabIndex={-1}
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

                                {/* CONSUMIDOR CONTA CASA */}
                                {isContaCasa && (
                                    <div className="col-span-2 md:flex-1 animate-in slide-in-from-left-2">
                                        <label className="text-[9px] font-black uppercase text-orange-500 block mb-1 ml-1 flex items-center gap-1">
                                            <UserCircle size={10} /> Nome do Consumidor / Justificativa
                                        </label>
                                        <input
                                            ref={consumidorInputRef}
                                            type="text"
                                            required
                                            value={consumidorCasa}
                                            onChange={e => setConsumidorCasa(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    submitBtnRef.current?.focus();
                                                }
                                            }}
                                            placeholder="Ex: João Silva, Permuta Bar, Consumo Diretoria..."
                                            className="w-full border-2 border-orange-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50/30 text-orange-700"
                                        />
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
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                submitBtnRef.current?.focus();
                                            }
                                        }}
                                        className="w-full border border-purple-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                    >
                                        <option value="Dinheiro">Dinheiro</option>
                                        <option value="PIX">PIX</option>
                                        <option value="Débito">Débito</option>
                                        <option value="Crédito">Crédito</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {(tipo === 'sangria' || tipo === 'suprimento') && (
                            <div className="col-span-2 flex-1">
                                <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1 ml-1">Motivo / Identificação</label>
                                <input
                                    ref={identificacaoInputRef}
                                    type="text"
                                    required
                                    value={identificacao}
                                    onChange={e => setIdentificacao(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            submitBtnRef.current?.focus();
                                        }
                                    }}
                                    placeholder={tipo === 'sangria' ? "Ex: Gás, Limpeza, Retirada..." : "Ex: Troco inicial, Suprimento de caixa..."}
                                    className={`w-full border rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none bg-white ${tipo === 'sangria' ? 'border-red-200 focus:ring-2 focus:ring-red-500' : 'border-emerald-200 focus:ring-2 focus:ring-emerald-500'}`}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 mt-2 md:mt-0">
                        <button
                            ref={submitBtnRef}
                            type="submit"
                            className={`w-full md:w-auto px-10 py-5 md:py-3 h-auto md:h-[46px] flex items-center justify-center gap-2 text-white font-black uppercase text-xs md:text-[10px] rounded-xl transition-all shadow-lg active:scale-95 focus:ring-2 focus:ring-blue-600 outline-none ${currentConfig.btnStyle}`}
                        >
                            {currentConfig.icon} {currentConfig.btnLabel}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
