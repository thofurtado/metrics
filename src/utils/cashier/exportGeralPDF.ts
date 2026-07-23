import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';

export const exportarRelatorioGeralPDF = (lotes: any[]) => {
    // PDF em modo Paisagem (Landscape) para caber todas as colunas com folga
    const doc = new jsPDF('l', 'mm', 'a4');

    // Ordenação: Data decrescente (mais recente primeiro)
    const lotesOrdenados = [...lotes].sort((a, b) => {
        const dataA = new Date(a.dataReferencia).getTime();
        const dataB = new Date(b.dataReferencia).getTime();
        if (dataA !== dataB) return dataB - dataA;
        return a.periodo === 'Jantar' ? -1 : 1;
    });

    // --- ESTILIZAÇÃO DO CABEÇALHO ---
    doc.setFillColor(15, 23, 42); // Azul Marinho Escuro (Zinc-900)
    doc.rect(0, 0, 297, 25, 'F');
    
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('MARUJO - RELATÓRIO GERENCIAL CONSOLIDADO', 14, 12);
    
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Cinza azulado
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 18);

    // --- MAPEAMENTO DOS DADOS COM CORES ---
    const body: RowInput[] = lotesOrdenados.map(l => {
        const lanc = l.lancamentos || [];
        const abertura = Number(l.valorAbertura || 0);
        
        // Dinheiro que entrou (vendas - gorjetas em dinheiro)
        const entDin = lanc.filter((i: any) => !i.isSaida && i.formaPagamento === 'Dinheiro')
            .reduce((acc: number, i: any) => acc + (i.valor - (i.valorCaixinha || 0)), 0);
        
        const sai = lanc.filter((i: any) => i.isSaida).reduce((acc: number, i: any) => acc + i.valor, 0);
        
        const getSum = (forma: string) => lanc.filter((i: any) => !i.isSaida && i.formaPagamento === forma)
            .reduce((acc: number, i: any) => acc + i.valor, 0);

        const totalVendas = lanc.filter((i: any) => !i.isSaida).reduce((acc: number, i: any) => acc + i.valor, 0);
        
        const saldoGaveta = abertura + entDin - sai;

        return [
            l.dataReferencia.split('-').reverse().join('/'),
            { content: l.periodo.toUpperCase(), styles: { fontStyle: 'bold' as const } },
            abertura.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            entDin.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            { content: sai.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), styles: { textColor: [185, 28, 28] as any } }, // Vermelho para saídas
            { content: saldoGaveta.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' as const, textColor: [21, 128, 61] as any } }, // Verde para saldo físico
            getSum('PIX').toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            getSum('Débito').toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            getSum('Crédito').toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            getSum('Voucher').toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            getSum('Funcionário').toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            getSum('Pró-labore').toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            getSum('Permuta').toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            getSum('Cortesia').toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            { content: totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as any } }
        ];
    });

    autoTable(doc, {
        startY: 30,
        head: [[
            'DATA', 
            'TURNO', 
            'ABER.', 
            'DIN.', 
            'SANG.', 
            'SALDO', 
            'PIX', 
            'DÉB.', 
            'CRÉD.', 
            'VOUCH.', 
            'FUNC.', 
            'PRO.', 
            'PERM.', 
            'CORT.', 
            'TOTAL'
        ]],
        body: body,
        theme: 'striped',
        styles: { 
            fontSize: 6.5, 
            halign: 'center',
            cellPadding: 2,
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
        },
        headStyles: { 
            fillColor: [30, 41, 59], 
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7
        },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' },
            5: { fillColor: [240, 253, 244] }, // Fundo levemente esverdeado para o Saldo em Mão
            14: { fillColor: [239, 246, 255] } // Fundo levemente azulado para o Faturamento Total
        }
    });

    // Nota explicativa no rodapé
    const finalY = (doc as any).lastAutoTable.finalY || 30;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Legenda: SALDO GAVETA = (Abertura + Dinheiro Vendas - Sangrias). FATURAMENTO TOTAL = Soma de todas as formas de pagamento (exceto sangrias).', 14, finalY + 10);

    doc.save(`MARUJO_GERENCIAL_${new Date().getTime()}.pdf`);
};