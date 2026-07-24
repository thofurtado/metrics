"use client"
import { Heart, User, Trash2 } from 'lucide-react';

export function CaixinhasTable({ lancamentos = [], onRemoverLancamento }: { lancamentos?: any[]; onRemoverLancamento?: (id: string) => void }) {

    const listaSegura = Array.isArray(lancamentos) ? lancamentos : [];

    const caixinhas = listaSegura.filter(l => l && (l.valorCaixinha > 0 || l.isCaixinha));
    const totalGeral = caixinhas.reduce((acc, l) => acc + (l.valorCaixinha || l.valor || 0), 0);

    if (caixinhas.length === 0) return null;

    return (
        <div className="mt-8 bg-white rounded-[1.5rem] md:rounded-3xl border border-pink-100 overflow-hidden shadow-sm">
            <div className="bg-pink-50 px-6 py-4 border-b border-pink-100 flex justify-between items-center">
                <h3 className="text-pink-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <Heart size={14} fill="currentColor" /> Controle de Caixinhas (Gorjetas)
                </h3>
                <span className="bg-pink-600 text-white px-3 py-1 rounded-full font-mono text-xs font-black">
                    Total: R$ {totalGeral.toFixed(2)}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-50 text-[9px] font-black uppercase text-zinc-400">
                        <tr>
                            <th className="px-6 py-3">Para Quem?</th>
                            <th className="px-6 py-3 text-pink-600">Valor Caixinha</th>
                            <th className="px-6 py-3">Forma de Pagamento</th>
                            <th className="px-6 py-3 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {caixinhas.map((l, i) => {
                            const beneficiario = l.identificacao || l.paraQuem || (l.origin ? `${l.origin} ${l.mesa || ''}` : 'Geral');
                            return (
                                <tr key={l.id || i} className="text-xs font-bold text-zinc-600 hover:bg-pink-50/30 transition-colors">
                                    <td className="px-6 py-3 uppercase text-[11px]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                                                <User size={12} className="text-pink-500" />
                                            </div>
                                            <span className="font-bold text-zinc-800">{beneficiario}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-pink-600 font-mono font-black text-sm">
                                        R$ {(l.valorCaixinha || l.valor).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-3 uppercase text-[10px] font-bold text-zinc-500">
                                        {l.formaPagamento}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        {onRemoverLancamento && l.id && (
                                            <button
                                                onClick={() => onRemoverLancamento(l.id)}
                                                className="text-zinc-300 hover:text-red-500 p-1.5 rounded-lg transition-colors"
                                                title="Excluir caixinha"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}