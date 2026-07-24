"use client"
import { useState, useEffect, useRef } from 'react';
import { Plus, ArrowLeft, TrendingDown, PlusCircle, Heart, CheckCircle2, UserCircle } from 'lucide-react';

export function TransactionForm({ onAdd }: { onAdd: (dados: any) => void }) {
    const [tipo, setTipo] = useState<'venda' | 'sangria' | 'suprimento' | 'caixinha'>('venda');
    const [valor, setValor] = useState('');
    const [paraQuem, setParaQuem] = useState('');
    const [forma, setForma] = useState('Dinheiro');
    const [banco, setBanco] = useState('CAIXA');
    
    // Origem: Mesa, Balcão ou Delivery
    const [tipoOrigem, setTipoOrigem] = useState<'Mesa' | 'Balcão' | 'Delivery'>('Mesa');
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

    const formasContaCasa = ['Funcionário', 'Pró-labore', 'Cortesia', 'Permuta'];
    const formasEletronicas = ['PIX', 'Débito', 'Crédito', 'Voucher'];
    const isContaCasa = formasContaCasa.includes(forma) && tipo === 'venda';

    const FORMAS_PAGAMENTO = [
        { key: '1', name: 'Dinheiro', display: '1 - Dinheiro' },
        { key: '2', name: 'PIX', display: '2 - PIX' },
        { key: '3', name: 'Débito', display: '3 - Débito' },
        { key: '4', name: 'Crédito', display: '4 - Crédito' },
        { key: '5', name: 'Voucher', display: '5 - Voucher' },
        { key: '6', name: 'Funcionário', display: '6 - Funcionário' },
        { key: '7', name: 'Pró-labore', display: '7 - Pró-labore' },
        { key: '8', name: 'Cortesia', display: '8 - Cortesia' },
        { key: '9', name: 'Permuta', display: '9 - Permuta' },
    ];

    const BANCOS_NUMERADOS = [
        { key: '1', name: 'SAFRA', display: '1 - SAFRA' },
        { key: '2', name: 'PAGBANK', display: '2 - PAGBANK' },
        { key: '3', name: 'CIELO', display: '3 - CIELO' },
        { key: '4', name: 'IFOOD', display: '4 - IFOOD' },
        { key: '5', name: 'STONE', display: '5 - STONE' },
    ];

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
            if (forma === 'Dinheiro') setBanco('CAIXA');
            else if (formasContaCasa.includes(forma)) setBanco('CONTA DA CASA');
            else if (formasEletronicas.includes(forma)) {
                if (banco === 'CAIXA' || banco === 'CONTA DA CASA') setBanco('SAFRA');
            }
        } else {
            setBanco('CAIXA');
        }
    }, [forma, tipo]);

    // Avança para o próximo campo com base na forma de pagamento selecionada
    const advanceFromForma = (formaSelecionada: string) => {
        setForma(formaSelecionada);

        if (formaSelecionada === 'Dinheiro') {
            setBanco('CAIXA');
            setTimeout(() => {
                submitBtnRef.current?.focus();
            }, 60);
        } else if (formasContaCasa.includes(formaSelecionada) && tipo === 'venda') {
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
        setTipoOrigem('Mesa');
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
            title: "Lançar Caixinha / Gorjeta",
            cardStyle: "bg-purple-50/40 border-purple-200",
            btnStyle: "bg-purple-600 hover:bg-purple-700",
            btnLabel: "Lançar Caixinha",
            icon: <Heart size={18} fill="currentColor" />
        }
    };

    const currentConfig = formConfig[tipo];

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
                <h2 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                    {currentConfig.title}
                </h2>

                {tipo === 'venda' ? (
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setTipo('sangria')}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 active:scale-95 shadow-sm"
                        >
                            <TrendingDown size={14} /> Registrar Sangria
                        </button>
                        <button
                            type="button"
                            onClick={() => setTipo('suprimento')}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 active:scale-95 shadow-sm"
                        >
                            <PlusCircle size={14} /> Registrar Suprimento
                        </button>
                        <button
                            type="button"
                            onClick={() => setTipo('caixinha')}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 active:scale-95 shadow-sm"
                        >
                            <Heart size={14} fill="currentColor" /> Registrar Caixinha
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setTipo('venda')}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200 active:scale-95 shadow-sm"
                    >
                        <ArrowLeft size={14} /> Voltar para Vendas
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className={`p-4 md:p-5 rounded-[1.5rem] md:rounded-3xl border shadow-sm flex flex-col transition-colors relative ${currentConfig.cardStyle}`}>

                {showTooltip && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 shadow-xl animate-in zoom-in duration-300 z-50">
                        <span className="flex items-center gap-2 whitespace-nowrap"><CheckCircle2 size={12} /> Lançamento Realizado!</span>
                    </div>
                )}

                <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4">
                    <div className="grid grid-cols-2 md:flex md:flex-row gap-4 flex-1">
                        {/* VALOR TOTAL / GORJETA */}
                        <div className="col-span-1 md:w-36">
                            <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1 ml-1">
                                {tipo === 'caixinha' ? 'Valor Gorjeta' : 'Valor Total'}
                            </label>
                            <input
                                ref={valorInputRef}
                                type="text"
                                inputMode="numeric"
                                required
                                value={valor}
                                onChange={e => setValor(formatCurrency(e.target.value))}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (tipo === 'venda') origemInputRef.current?.focus();
                                        else if (tipo === 'caixinha') paraQuemInputRef.current?.focus();
                                        else identificacaoInputRef.current?.focus();
                                    }
                                }}
                                placeholder="0,00"
                                className="w-full border border-zinc-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>

                        {tipo === 'venda' && (
                            <>
                                {/* ORIGEM (MESA / BALCÃO / DELIVERY) */}
                                <div className="col-span-1 md:w-36">
                                    <div className="flex items-center justify-between mb-1 ml-1">
                                        <label className="text-[9px] font-black uppercase text-zinc-400 block">
                                            Origem
                                        </label>
                                        <div className="flex gap-1 text-[8px] font-extrabold uppercase">
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
                                <div className="col-span-2 md:w-48">
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
                                            <UserCircle size={10} /> Nome do Consumidor
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
                                            placeholder="Quem consumiu?"
                                            className="w-full border-2 border-orange-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50/30 text-orange-700"
                                        />
                                    </div>
                                )}

                                {/* BANCO / DESTINO */}
                                {!isContaCasa && (
                                    <div className="col-span-2 md:w-40">
                                        <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1 ml-1">Banco / Destino</label>
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
                                    <label className="text-[9px] font-black uppercase text-purple-600 block mb-1 ml-1">Para quem é a caixinha?</label>
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
