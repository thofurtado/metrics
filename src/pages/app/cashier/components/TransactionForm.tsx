"use client"
import { useState, useEffect, useRef } from 'react';
import { Plus, ArrowLeft, TrendingDown, Heart, User, CheckCircle2, UserCircle } from 'lucide-react';

export function TransactionForm({ onAdd }: { onAdd: (dados: any) => void }) {
    const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
    const [valor, setValor] = useState('');
    const [valorCaixinha, setValorCaixinha] = useState('');
    const [paraQuem, setParaQuem] = useState('');
    const [forma, setForma] = useState('Dinheiro');
    const [banco, setBanco] = useState('CAIXA');
    
    // Origem: Mesa, Balcão ou Delivery
    const [tipoOrigem, setTipoOrigem] = useState<'Mesa' | 'Balcão' | 'Delivery'>('Mesa');
    const [numOrigem, setNumOrigem] = useState('');

    const [identificacao, setIdentificacao] = useState('');
    const [consumidorCasa, setConsumidorCasa] = useState('');
    const [isCaixinha, setIsCaixinha] = useState(false);

    const [showTooltip, setShowTooltip] = useState(false);

    // Refs para controle refinado do foco
    const valorInputRef = useRef<HTMLInputElement>(null);
    const origemInputRef = useRef<HTMLInputElement>(null);
    const formaSelectRef = useRef<HTMLSelectElement>(null);
    const consumidorInputRef = useRef<HTMLInputElement>(null);
    const bancoSelectRef = useRef<HTMLSelectElement>(null);
    const submitBtnRef = useRef<HTMLButtonElement>(null);

    const formasContaCasa = ['Funcionário', 'Pró-labore', 'Cortesia', 'Permuta'];
    const formasEletronicas = ['PIX', 'Débito', 'Crédito', 'Voucher'];
    const isContaCasa = formasContaCasa.includes(forma) && tipo === 'entrada';

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
        if (tipo === 'entrada') {
            if (forma === 'Dinheiro') setBanco('CAIXA');
            else if (formasContaCasa.includes(forma)) setBanco('CONTA DA CASA');
            else if (formasEletronicas.includes(forma)) {
                if (banco === 'CAIXA' || banco === 'CONTA DA CASA') setBanco('SAFRA');
            }
        } else {
            setBanco('CAIXA');
        }
    }, [forma, tipo]);

    // Avança para o próximo campo com base no estado atual da forma de pagamento
    const advanceFromForma = (formaSelecionada: string) => {
        if (formaSelecionada === 'Dinheiro') {
            setBanco('CAIXA');
            submitBtnRef.current?.focus();
        } else if (formasContaCasa.includes(formaSelecionada)) {
            consumidorInputRef.current?.focus();
        } else {
            bancoSelectRef.current?.focus();
        }
    };

    const handleFormaKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
        // Atalho por número 1 a 9
        const item = FORMAS_PAGAMENTO.find(f => f.key === e.key);
        if (item) {
            e.preventDefault();
            setForma(item.name);
            advanceFromForma(item.name);
            return;
        }

        // Enter no campo de Forma de Pagamento
        if (e.key === 'Enter') {
            e.preventDefault();
            advanceFromForma(forma);
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
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const valorNumerico = parseCurrencyToFloat(valor);
        if (valorNumerico <= 0) return;

        onAdd({
            valor: valorNumerico,
            valorCaixinha: isCaixinha ? parseCurrencyToFloat(valorCaixinha) : 0,
            paraQuem: isCaixinha ? paraQuem : '',
            formaPagamento: tipo === 'saida' ? 'Sangria' : forma,
            banco: banco,
            origin: tipo === 'saida' ? '' : tipoOrigem,
            mesa: tipo === 'saida' ? '' : (tipoOrigem === 'Mesa' ? numOrigem : ''),
            identificacao: tipo === 'saida' ? identificacao : (numOrigem ? `${tipoOrigem} ${numOrigem}` : tipoOrigem),
            consumidorCasa: isContaCasa ? consumidorCasa : '',
            isCaixinha: tipo === 'saida' ? false : isCaixinha,
            isSaida: tipo === 'saida'
        });

        setValor('');
        setValorCaixinha('');
        setParaQuem('');
        setTipoOrigem('Mesa');
        setNumOrigem('');
        setIdentificacao('');
        setConsumidorCasa('');
        setIsCaixinha(false);

        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2000);
        valorInputRef.current?.focus();
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
                <h2 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                    {tipo === 'entrada' ? "Lançar Venda" : "Lançar Sangria"}
                </h2>
                <button
                    type="button"
                    onClick={() => setTipo(tipo === 'entrada' ? 'saida' : 'entrada')}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${tipo === 'saida'
                        ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                        }`}
                >
                    {tipo === 'entrada' ? <><TrendingDown size={14} /> Registrar Sangria</> : <><ArrowLeft size={14} /> Voltar para Vendas</>}
                </button>
            </div>

            <form onSubmit={handleSubmit} className={`p-4 md:p-5 rounded-[1.5rem] md:rounded-3xl border shadow-sm flex flex-col transition-colors relative ${tipo === 'saida' ? 'bg-red-50/30 border-red-100' : 'bg-white border-zinc-200'}`}>

                {showTooltip && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 shadow-xl animate-in zoom-in duration-300 z-50">
                        <span className="flex items-center gap-2 whitespace-nowrap"><CheckCircle2 size={12} /> Lançamento Realizado!</span>
                    </div>
                )}

                <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4">
                    <div className="grid grid-cols-2 md:flex md:flex-row gap-4 flex-1">
                        {/* VALOR TOTAL */}
                        <div className="col-span-1 md:w-32">
                            <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1 ml-1">Valor Total</label>
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
                                        origemInputRef.current?.focus();
                                    }
                                }}
                                placeholder="0,00"
                                className="w-full border border-zinc-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-50/50"
                            />
                        </div>

                        {tipo === 'entrada' ? (
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
                                            className="w-full border border-zinc-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-50/50"
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
                                            setForma(e.target.value);
                                            advanceFromForma(e.target.value);
                                        }}
                                        onKeyDown={handleFormaKeyDown}
                                        className="w-full border border-zinc-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-50/50"
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
                                            onChange={e => setBanco(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    submitBtnRef.current?.focus();
                                                }
                                            }}
                                            className="w-full border border-zinc-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none bg-zinc-50/50 disabled:opacity-60 focus:ring-2 focus:ring-blue-500"
                                        >
                                            {forma === 'Dinheiro' ? <option value="CAIXA">CAIXA</option> :
                                                <>
                                                    <option value="SAFRA">SAFRA</option>
                                                    <option value="PAGBANK">PAGBANK</option>
                                                    <option value="CIELO">CIELO</option>
                                                    <option value="IFOOD">IFOOD</option>
                                                    <option value="STONE">STONE</option>
                                                </>
                                            }
                                        </select>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="col-span-2 flex-1">
                                <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1 ml-1">Motivo / Identificação</label>
                                <input
                                    type="text"
                                    required
                                    value={identificacao}
                                    onChange={e => setIdentificacao(e.target.value)}
                                    placeholder="Ex: Gás, Limpeza, etc."
                                    className="w-full border border-red-200 rounded-xl p-4 md:p-3 text-base md:text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 bg-red-50/50"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 mt-2 md:mt-0">
                        {tipo === 'entrada' && (
                            <label className={`flex items-center gap-2 cursor-pointer px-4 py-3 rounded-xl border transition-all w-full md:w-auto justify-center ${isCaixinha ? 'bg-pink-50 border-pink-200' : 'bg-zinc-50 border-zinc-100'}`}>
                                <input
                                    type="checkbox"
                                    checked={isCaixinha}
                                    onChange={e => setIsCaixinha(e.target.checked)}
                                    className="w-5 h-5 rounded-lg text-pink-600 focus:ring-0"
                                />
                                <span className={`text-[10px] font-black uppercase ${isCaixinha ? 'text-pink-600' : 'text-zinc-600'}`}>Caixinha?</span>
                            </label>
                        )}
                        <button
                            ref={submitBtnRef}
                            type="submit"
                            className={`w-full md:w-auto px-10 py-5 md:py-3 h-auto md:h-[46px] flex items-center justify-center gap-2 text-white font-black uppercase text-xs md:text-[10px] rounded-xl transition-all shadow-lg active:scale-95 focus:ring-2 focus:ring-blue-600 outline-none ${tipo === 'saida' ? 'bg-red-600' : 'bg-zinc-900'}`}
                        >
                            <Plus size={18} /> {tipo === 'saida' ? 'Lançar Sangria' : 'Adicionar'}
                        </button>
                    </div>
                </div>

                {tipo === 'entrada' && isCaixinha && (
                    <div className="mt-4 pt-4 border-t border-dashed border-pink-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                        <div>
                            <label className="text-[9px] font-black uppercase text-pink-500 block mb-1 ml-1 flex items-center gap-1"><Heart size={8} fill="currentColor" /> Valor Gorjeta</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                value={valorCaixinha}
                                onChange={e => setValorCaixinha(formatCurrency(e.target.value))}
                                placeholder="0,00"
                                className="w-full border-2 border-pink-200 rounded-xl p-3 text-sm font-black outline-none focus:ring-2 focus:ring-pink-500 bg-white text-pink-700"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1 ml-1 flex items-center gap-1"><User size={8} /> Para quem é a caixinha?</label>
                            <input type="text" value={paraQuem} onChange={e => setParaQuem(e.target.value)} placeholder="Ex: João, Cozinha, Garçons..." className="w-full border border-zinc-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-50/50" />
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}


