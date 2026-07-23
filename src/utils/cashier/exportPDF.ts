import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';

const fmt = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatarDataBR = (dataString: string) => {
    if (!dataString) return '--/--/----';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
};

export const exportarLotePDF = (lote: any, resumo: any) => {
    if (!resumo) return;
    const doc = new jsPDF();
    const dataFormatada = formatarDataBR(lote.dataReferencia);

    // --- HEADER DESIGN ---
    doc.setFillColor(15, 23, 42); // Navy Dark
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('RELATÓRIO DE FECHAMENTO DE TURNO', 14, 15);

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`MARUJO - ${lote.periodo.toUpperCase()}`, 14, 28);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(dataFormatada, 196, 28, { align: 'right' });

    // --- DASHBOARD DE MÉTRICAS (KPIs) ---
    const saldoGaveta = resumo.CAIXA.entradasDinheiro + resumo.CAIXA.saldoAbertura - resumo.CAIXA.totalSaidas;
    const faturamentoTotal = (resumo.SAFRA.total + resumo.PAGBANK.total + resumo.CIELO.total + resumo.STONE.total + resumo.CAIXA.entradasDinheiro);

    // Cards Principais com Cores de Destaque
    doc.setFillColor(240, 253, 244); // Verde claro
    doc.roundedRect(14, 48, 85, 22, 2, 2, 'F');
    doc.setFontSize(7); doc.setTextColor(21, 128, 61);
    doc.text('DINHEIRO EM GAVETA (CONFERÊNCIA)', 18, 54);
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text(fmt(saldoGaveta), 18, 63);

    doc.setFillColor(239, 246, 255); // Azul claro
    doc.roundedRect(110, 48, 85, 22, 2, 2, 'F');
    doc.setFontSize(7); doc.setTextColor(29, 78, 216);
    doc.setFont("helvetica", "normal");
    doc.text('FATURAMENTO BRUTO TOTAL', 114, 54);
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text(fmt(faturamentoTotal), 114, 63);

    // Mini-Cards de Índices
    const consumoInterno = lote.lancamentos
        .filter((i: any) => !i.isSaida && ['Funcionário', 'Cortesia', 'Pró-labore'].includes(i.formaPagamento))
        .reduce((acc: number, i: any) => acc + i.valor, 0);

    const miniCards = [
        { label: 'ABERTURA', val: fmt(resumo.CAIXA.saldoAbertura) },
        { label: 'PIX', val: fmt(resumo.SAFRA.PIX + resumo.PAGBANK.PIX + resumo.CIELO.PIX + resumo.STONE.PIX) },
        { label: 'DÉBITO', val: fmt(resumo.SAFRA.Débito + resumo.PAGBANK.Débito + resumo.CIELO.Débito + resumo.STONE.Débito) },
        { label: 'CRÉDITO', val: fmt(resumo.SAFRA.Crédito + resumo.PAGBANK.Crédito + resumo.CIELO.Crédito + resumo.STONE.Crédito) },
        { label: 'GORJETAS', val: fmt(resumo.GERAL.totalCaixinha) },
        { label: 'CONSUMO', val: fmt(consumoInterno) }
    ];

    let startX = 14;
    let startY = 75;
    const cardWidth = 28.5;
    const cardHeight = 15;

    miniCards.forEach((card, index) => {
        doc.setFillColor(248, 250, 252);
        doc.rect(startX + (index * (cardWidth + 2.5)), startY, cardWidth, cardHeight, 'F');
        doc.setFontSize(6); doc.setTextColor(100); doc.setFont("helvetica", "normal");
        doc.text(card.label, startX + (index * (cardWidth + 2.5)) + 2, startY + 5);
        doc.setFontSize(7.5); doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "bold");
        doc.text(card.val, startX + (index * (cardWidth + 2.5)) + 2, startY + 11);
    });

    // --- TABELA DE VENDAS (DESIGN MELHORADO) ---
    const vendas = lote.lancamentos.filter((l: any) => !l.isSaida);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text('1. DETALHAMENTO DE VENDAS (CAIXA)', 14, 100);

    autoTable(doc, {
        startY: 104,
        head: [['Mesa', 'Forma Pagto', 'Valor Bruto', 'Gorjeta', 'Valor Líquido', 'Observações']],
        body: vendas.map((v: any) => [
            v.mesa || '--',
            v.formaPagamento,
            fmt(v.valor),
            fmt(v.valorCaixinha || 0),
            fmt(v.valor - (v.valorCaixinha || 0)),
            v.observacoes || ''
        ]),
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], halign: 'center' }, // Azul Marinho Escuro
        styles: { fontSize: 7.5, halign: 'center' },
        columnStyles: { 0: { fontStyle: 'bold' }, 5: { halign: 'left' } }
    });

    // --- SANGRIAS E SAÍDAS (DESIGN ALERTA) ---
    const sangrias = lote.lancamentos.filter((l: any) => l.isSaida);
    if (sangrias.length > 0) {
        const lastY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(153, 27, 27); // Vermelho escuro
        doc.text('2. SANGRIAS E SAÍDAS DE CAIXA', 14, lastY + 12);

        autoTable(doc, {
            startY: lastY + 16,
            head: [['Descrição / Identificação', 'Valor']],
            body: sangrias.map((s: any) => [s.identificacao || 'Saída de Caixa', fmt(s.valor)]),
            headStyles: { fillColor: [153, 27, 27] }, // Vermelho Alerta
            styles: { fontSize: 7.5, halign: 'center' },
            columnStyles: { 0: { halign: 'left' } }
        });
    }

    // --- RESUMO POR OPERADORA (DESIGN FINANCEIRO) ---
    const lastYFinal = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(21, 128, 61); // Verde escuro
    doc.text('3. CONSOLIDAÇÃO POR OPERADORA (BANCOS)', 14, lastYFinal + 12);

    const bodyBancos: RowInput[] = [
        ['SAFRA', fmt(resumo.SAFRA.PIX), fmt(resumo.SAFRA.Débito), fmt(resumo.SAFRA.Crédito), fmt(resumo.SAFRA.total)],
        ['PAGBANK', fmt(resumo.PAGBANK.PIX), fmt(resumo.PAGBANK.Débito), fmt(resumo.PAGBANK.Crédito), fmt(resumo.PAGBANK.total)],
        ['CIELO', fmt(resumo.CIELO.PIX), fmt(resumo.CIELO.Débito), fmt(resumo.CIELO.Crédito), fmt(resumo.CIELO.total)],
        ['STONE', fmt(resumo.STONE.PIX), fmt(resumo.STONE.Débito), fmt(resumo.STONE.Crédito), fmt(resumo.STONE.total)]
    ];

    autoTable(doc, {
        startY: lastYFinal + 16,
        head: [['Banco', 'PIX', 'Débito', 'Crédito', 'Total']],
        body: bodyBancos,
        theme: 'grid',
        headStyles: { fillColor: [21, 128, 61] }, // Verde Financeiro
        styles: { fontSize: 7.5, halign: 'center' }
    });

    // --- RODAPÉ ---
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
            `Marujo - Página ${i} de ${totalPages} - Gerado em: ${new Date().toLocaleString()}`,
            105,
            288,
            { align: 'center' }
        );
    }

    doc.save(`FECHAMENTO_${lote.periodo.toUpperCase()}_${dataFormatada}.pdf`);
};