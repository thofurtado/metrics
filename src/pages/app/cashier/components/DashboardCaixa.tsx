"use client"
import { useState } from 'react';
import { Anchor, Plus, Clock, Trash2, Download, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { exportarRelatorioGeralPDF } from '../utils/exportGeralPDF';
import { exportarGeralCSV } from '../utils/exportGeralCSV';
import { exportarParaCSV } from '../utils/exportCSV';

interface DashboardProps {
    lotes: any[];
    onCriarNovo: (data: string, periodo: string, abertura: number) => void;
    onSelecionar: (id: string) => void;
    onApagar: (id: string) => void;
}

export function DashboardCaixa({ lotes, onCriarNovo, onSelecionar, onApagar }: DashboardProps) {
    const dataAtual = new Date();
    const [novaData, setNovaData] = useState(dataAtual.toISOString().split('T')[0]);
    const [novoPeriodo, setNovoPeriodo] = useState('Almoço');
    const [saldoAbertura, setSaldoAbertura] = useState('0.00');

    const [mesVisualizacao, setMesVisualizacao] = useState(dataAtual.getMonth());
    const [anoVisualizacao, setAnoVisualizacao] = useState(dataAtual.getFullYear());

    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const navegarMes = (direcao: number) => {
        let novoMes = mesVisualizacao + direcao;
        let novoAno = anoVisualizacao;
        if (novoMes < 0) { novoMes = 11; novoAno--; }
        else if (novoMes > 11) { novoMes = 0; novoAno++; }
        setMesVisualizacao(novoMes);
        setAnoVisualizacao(novoAno);
    };

    const lotesFiltradosEOrdenados = lotes
        .filter(l => {
            const dataLote = new Date(l.dataReferencia + 'T00:00:00');
            return dataLote.getMonth() === mesVisualizacao && dataLote.getFullYear() === anoVisualizacao;
        })
        .sort((a, b) => {
            const dataA = new Date(a.dataReferencia).getTime();
            const dataB = new Date(b.dataReferencia).getTime();
            if (dataA !== dataB) return dataB - dataA;
            return a.periodo === 'Jantar' ? -1 : 1;
        });

    const formatarDataBR = (dataString: string) => {
        const [ano, mes, dia] = dataString.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    const handleCriar = () => {
        const existe = lotes.find(l => l.dataReferencia === novaData && l.periodo === novoPeriodo);
        if (existe) {
            alert(`Já existe um caixa de ${novoPeriodo} para este dia.`);
            return;
        }
        onCriarNovo(novaData, novoPeriodo, parseFloat(saldoAbertura) || 0);
        setSaldoAbertura('0.00');
    };

    // Função para renderizar o ícone de status na lista
    const renderStatusIcon = (status: string) => {
        switch (status) {
            case 'conferido': return <CheckCircle2 size={18} className="text-green-500" />;
            case 'alerta': return <AlertCircle size={18} className="text-amber-500" />;
            default: return <Clock size={18} className="text-zinc-300" />;
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 p-4 md:p-6 text-zinc-900 flex flex-col">
            <div className="max-w-5xl mx-auto space-y-6 flex-1 w-full">
                <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-zinc-900 p-3 rounded-2xl text-white shadow-xl">
                            <Anchor size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">Marujo</h1>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Conferência</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.open('/api/backup/export', '_blank')}
                            className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-zinc-800 transition-colors flex items-center gap-2"
                        >
                            <Download size={14} /> Exportar Backup
                        </button>

                        <div className="relative">
                            <input
                                type="file"
                                id="import-backup"
                                className="hidden"
                                accept=".json"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    if (!window.confirm(`Você tem certeza que deseja restaurar o backup "${file.name}"? Isso irá sobrescrever/mesclar os dados atuais.`)) {
                                        e.target.value = ''; // Reset input
                                        return;
                                    }

                                    try {
                                        const fileContent = await file.text();
                                        const jsonData = JSON.parse(fileContent);

                                        const response = await fetch('/api/backup/import', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(jsonData)
                                        });

                                        if (response.ok) {
                                            alert('Backup restaurado com sucesso!');
                                            window.location.reload();
                                        } else {
                                            const errorData = await response.json();
                                            alert('Erro ao restaurar: ' + (errorData.error || 'Erro desconhecido'));
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert('Erro ao processar arquivo de backup.');
                                    }
                                    e.target.value = ''; // Reset import
                                }}
                            />
                            <label
                                htmlFor="import-backup"
                                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
                            >
                                <Clock size={14} /> Importar Backup
                            </label>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 bg-white p-6 rounded-[2rem] border shadow-sm self-start">
                        <h2 className="text-[10px] font-black uppercase text-zinc-400 mb-6 flex items-center gap-2">
                            <Plus size={14} className="text-blue-600" /> Abrir Novo Caixa
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-bold text-zinc-400 uppercase ml-2 mb-1 block">Data</label>
                                <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} className="w-full border rounded-xl p-3 font-bold bg-zinc-50 border-zinc-100 outline-none" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-zinc-400 uppercase ml-2 mb-1 block">Período</label>
                                <select value={novoPeriodo} onChange={e => setNovoPeriodo(e.target.value)} className="w-full border rounded-xl p-3 font-bold bg-zinc-50 border-zinc-100">
                                    <option value="Almoço">Almoço</option>
                                    <option value="Jantar">Jantar</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-zinc-400 uppercase ml-2 mb-1 block text-green-600">Abertura em Dinheiro</label>
                                <input type="number" value={saldoAbertura} onChange={e => setSaldoAbertura(e.target.value)} className="w-full border rounded-xl p-3 font-mono font-bold bg-zinc-50 border-zinc-100 outline-none text-green-700" />
                            </div>
                            <button onClick={handleCriar} className="w-full bg-blue-600 text-white font-black uppercase text-[10px] py-4 rounded-xl shadow-lg hover:opacity-90 transition-opacity">Iniciar Expediente</button>
                        </div>
                    </div>

                    <div className="lg:col-span-8 bg-white rounded-[2rem] border shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-zinc-50/50 px-6 py-4 border-b space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="font-black text-[10px] text-zinc-400 uppercase tracking-widest">Caixas do Mês</span>
                                <div className="flex gap-2">
                                    <button onClick={() => exportarRelatorioGeralPDF(lotesFiltradosEOrdenados)} className="flex items-center gap-2 text-[10px] font-black text-red-600 bg-white border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                        <FileText size={14} /> PDF
                                    </button>
                                    <button onClick={() => exportarGeralCSV(lotesFiltradosEOrdenados)} className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-white border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                                        <FileSpreadsheet size={14} /> Excel
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-white border rounded-xl p-2 shadow-sm">
                                <button onClick={() => navegarMes(-1)} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-900"><ChevronLeft size={20} /></button>
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase text-zinc-900">{nomesMeses[mesVisualizacao]} <span className="text-blue-600">{anoVisualizacao}</span></span>
                                </div>
                                <button onClick={() => navegarMes(1)} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-900"><ChevronRight size={20} /></button>
                            </div>
                        </div>

                        <div className="overflow-y-auto max-h-[500px] divide-y min-h-[200px]">
                            {lotesFiltradosEOrdenados.length > 0 ? (
                                lotesFiltradosEOrdenados.map(l => (
                                    <div key={l.id} className="px-6 py-4 flex justify-between items-center hover:bg-zinc-50 transition-colors group">
                                        <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => onSelecionar(l.id)}>
                                            {renderStatusIcon(l.status)}
                                            <div>
                                                <p className="font-black text-zinc-800 text-base">{formatarDataBR(l.dataReferencia)}</p>
                                                <div className="flex gap-2">
                                                    <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{l.periodo}</span>
                                                    <span className="text-[9px] font-bold text-zinc-400">Abertura: R$ {Number(l.valorAbertura).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); exportarParaCSV([l], `caixa-${l.dataReferencia}-${l.periodo}.csv`); }} className="text-zinc-300 hover:text-green-600 p-2 transition-colors"><Download size={18} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); onApagar(l.id); }} className="text-zinc-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center">
                                    <p className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">Nenhum caixa neste período</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}