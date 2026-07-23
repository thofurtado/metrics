export function exportarGeralCSV(lotes: any[]) {
    if (lotes.length === 0) return;

    // Ordenação: Data crescente e Período
    const lotesOrdenados = [...lotes].sort((a, b) => {
        const dataA = new Date(a.dataReferencia).getTime();
        const dataB = new Date(b.dataReferencia).getTime();
        if (dataA !== dataB) return dataA - dataB;
        return a.periodo === 'Almoço' ? -1 : 1;
    });

    const headers = [
        "Data", "Periodo", "Abertura", "Entradas Dinheiro", "Saidas",
        "Saldo em Dinheiro", "PIX", "Debito", "Credito", "Voucher",
        "Funcionario", "Pro Labore", "Permuta", "Cortesia",
        "Total Vendas", "Saldo Total"
    ];

    const rows = lotesOrdenados.map((l: any) => {
        const lanc = l.lancamentos || [];
        const abertura = Number(l.valorAbertura || 0);
        const entDin = lanc.filter((i: any) => !i.isSaida && i.formaPagamento === 'Dinheiro').reduce((acc: number, i: any) => acc + (i.valor - (i.valorCaixinha || 0)), 0);
        const sai = lanc.filter((i: any) => i.isSaida).reduce((acc: number, i: any) => acc + i.valor, 0);
        const getSum = (f: string) => lanc.filter((i: any) => !i.isSaida && i.formaPagamento === f).reduce((acc: number, i: any) => acc + i.valor, 0);
        
        const func = getSum('Funcionário');
        const pro = getSum('Pró-labore');
        const perm = getSum('Permuta');
        const cort = getSum('Cortesia');

        const totalVendas = lanc.filter((i: any) => !i.isSaida).reduce((acc: number, i: any) => acc + i.valor, 0);

        return [
            l.dataReferencia,
            l.periodo,
            abertura.toFixed(2).replace('.', ','),
            entDin.toFixed(2).replace('.', ','),
            sai.toFixed(2).replace('.', ','),
            (abertura + entDin - sai).toFixed(2).replace('.', ','),
            getSum('PIX').toFixed(2).replace('.', ','),
            getSum('Débito').toFixed(2).replace('.', ','),
            getSum('Crédito').toFixed(2).replace('.', ','),
            getSum('Voucher').toFixed(2).replace('.', ','),
            func.toFixed(2).replace('.', ','),
            pro.toFixed(2).replace('.', ','),
            perm.toFixed(2).replace('.', ','),
            cort.toFixed(2).replace('.', ','),
            totalVendas.toFixed(2).replace('.', ','),
            (totalVendas + abertura - sai).toFixed(2).replace('.', ',')
        ];
    });

    const csvContent = [headers.join(";"), ...rows.map(row => row.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", "marujo_relatorio_geral.csv");
    link.click();
}