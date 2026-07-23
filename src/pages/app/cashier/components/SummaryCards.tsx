"use client"
import { useState, useMemo } from 'react';
import { Banknote, CreditCard, Smartphone, Landmark, Heart, Ticket, Edit2, Check, X } from 'lucide-react';

const BANCOS_DIGITAIS = ['SAFRA', 'PAGBANK', 'CIELO', 'IFOOD', 'STONE'] as const;
const FORMAS_CASA = ['Funcionário', 'Pró-labore', 'Cortesia', 'Permuta'] as const;

export function SummaryCards({ resumo, onEditAbertura }: { resumo: any, onEditAbertura?: (valor: number) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempAbertura, setTempAbertura] = useState('');

  const safeGet = (obj: any, path: string) => {
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    return typeof value === 'number' ? value : 0;
  };

  const totalCaixinha = safeGet(resumo, 'GERAL.totalCaixinha');
  const abertura = safeGet(resumo, 'CAIXA.saldoAbertura');
  const entradasDinheiro = safeGet(resumo, 'CAIXA.entradasDinheiro');
  const saidasDinheiro = safeGet(resumo, 'CAIXA.totalSaidas');

  const totalPorForma = (forma: string) => {
    return BANCOS_DIGITAIS.reduce((acc, banco) => acc + safeGet(resumo, `${banco}.${forma}`), 0);
  };

  const { vendasLiquidas, totalGeralEmCaixa } = useMemo(() => {
    const cortesia = safeGet(resumo, 'CASA.Cortesia');
    const vLiquidas = safeGet(resumo, 'GERAL.entradas') - cortesia;
    const tGeral = (abertura + safeGet(resumo, 'GERAL.saldo')) - cortesia;

    return {
      vendasLiquidas: vLiquidas,
      totalGeralEmCaixa: tGeral
    };
  }, [resumo, abertura]);

  const saldoFinalDinheiro = abertura + entradasDinheiro - saidasDinheiro;

  const handleStartEdit = () => {
    setTempAbertura(abertura.toString());
    setIsEditing(true);
  };

  const handleSave = () => {
    const novoValor = parseFloat(tempAbertura);
    if (!isNaN(novoValor) && onEditAbertura) {
      onEditAbertura(novoValor);
    }
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10 justify-between">
          <div className="flex flex-wrap items-center gap-12 md:gap-16">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Vendas Líquidas</p>
              <p className="text-4xl md:text-2xl font-black tracking-tighter text-emerald-600">
                R$ {vendasLiquidas.toFixed(2)}
              </p>
            </div>

            <div className="hidden lg:block w-[2px] h-16 bg-slate-200" />

            <div>
              <p className="text-xs font-black text-pink-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Heart size={14} fill="currentColor" /> Caixinhas
              </p>
              <p className="text-3xl md:text-2xl font-black text-pink-600">R$ {totalCaixinha.toFixed(2)}</p>
            </div>

            <div className="hidden lg:block w-[2px] h-16 bg-slate-200" />

            <div>
              <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-2">Total Geral em Caixa</p>
              <p className="text-4xl md:text-2xl font-black tracking-tighter text-slate-900">
                R$ {totalGeralEmCaixa.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 lg:gap-10 border-t lg:border-t-0 lg:border-l border-slate-200 pt-8 lg:pt-0 lg:pl-12 w-full lg:w-auto">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2"><Smartphone size={14} /> Pix</span>
              <span className="text-xl font-mono font-black text-blue-600">{totalPorForma('PIX').toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2"><CreditCard size={14} /> Débito</span>
              <span className="text-xl font-mono font-black text-slate-600">{totalPorForma('Débito').toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2"><CreditCard size={14} /> Crédito</span>
              <span className="text-xl font-mono font-black text-slate-600">{totalPorForma('Crédito').toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-purple-500 uppercase mb-1 flex items-center gap-2"><Ticket size={14} /> Voucher</span>
              <span className="text-xl font-mono font-black text-purple-600">{totalPorForma('Voucher').toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-5 shadow-sm relative overflow-hidden group">
          <Banknote size={40} className="absolute -right-2 -top-2 opacity-10 text-emerald-600 rotate-12" />
          <h2 className="font-black text-emerald-700 text-xs mb-4 flex items-center gap-2 uppercase tracking-tight">
            Dinheiro (Espécie)
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-emerald-800 font-bold italic">
              <span className="underline decoration-emerald-200">Abertura</span>
              {isEditing ? (
                <div className="flex items-center gap-1 bg-white p-1 rounded shadow-inner border border-emerald-200">
                  <input
                    type="number"
                    value={tempAbertura}
                    onChange={(e) => setTempAbertura(e.target.value)}
                    className="w-16 bg-transparent outline-none font-mono text-emerald-900"
                    autoFocus
                  />
                  <button onClick={handleSave} className="text-emerald-600 hover:text-emerald-800"><Check size={14} /></button>
                  <button onClick={() => setIsEditing(false)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1 group/btn cursor-pointer" onClick={handleStartEdit}>
                  <span>{abertura.toFixed(2)}</span>
                  <Edit2 size={10} className="opacity-0 group-hover/btn:opacity-100 text-emerald-600" />
                </div>
              )}
            </div>
            <div className="flex justify-between text-xs text-emerald-800/60 font-medium"><span>Vendas</span><span>{entradasDinheiro.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs text-red-500 font-bold"><span>Saídas</span><span>-{saidasDinheiro.toFixed(2)}</span></div>
            <div className="pt-3 mt-2 border-t border-emerald-200 flex justify-between items-center">
              <span className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter">Saldo Físico</span>
              <span className="text-lg font-mono font-black text-emerald-700">{saldoFinalDinheiro.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {BANCOS_DIGITAIS.map(banco => (
          <div key={banco} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h2 className="font-black text-slate-400 text-xs mb-4 flex items-center gap-2 uppercase tracking-tight">
              <Landmark size={14} className="text-blue-500" /> {banco}
            </h2>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500"><span>Pix</span><span className="text-slate-900 font-mono font-bold">{safeGet(resumo, `${banco}.PIX`).toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Débito</span><span className="text-slate-900 font-mono font-bold">{safeGet(resumo, `${banco}.Débito`).toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Crédito</span><span className="text-slate-900 font-mono font-bold">{safeGet(resumo, `${banco}.Crédito`).toFixed(2)}</span></div>
              <div className="flex justify-between text-purple-600 font-medium"><span>Voucher</span><span className="font-mono font-bold">{safeGet(resumo, `${banco}.Voucher`).toFixed(2)}</span></div>
              {safeGet(resumo, `${banco}.caixinha`) > 0 && (
                <div className="flex justify-between text-pink-500 font-bold italic"><span>Gorjeta</span><span>{safeGet(resumo, `${banco}.caixinha`).toFixed(2)}</span></div>
              )}
              <div className="pt-3 mt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-300 uppercase">Líquido</span>
                <span className="text-lg font-mono font-black text-blue-600">{safeGet(resumo, `${banco}.total`).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-slate-100 border border-slate-200 rounded-3xl p-5 shadow-inner">
          <h2 className="font-black text-orange-600 text-xs mb-4 flex items-center gap-2 uppercase italic tracking-tight">
            Consumo Interno
          </h2>
          <div className="space-y-1.5 text-xs">
            {FORMAS_CASA.map(forma => (
              <div key={forma} className="flex justify-between text-slate-500 font-bold">
                <span>{forma}</span>
                <span className="text-slate-700 font-mono">{safeGet(resumo, `CASA.${forma}`).toFixed(2)}</span>
              </div>
            ))}
            <div className="pt-3 mt-2 border-t border-slate-200 flex justify-between items-center text-orange-600">
              <span className="text-[10px] font-black uppercase italic">Total</span>
              <span className="text-lg font-mono font-black italic">{safeGet(resumo, 'CASA.total').toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}