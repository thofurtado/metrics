export function exportarParaCSV(lotes: any[], filename = "relatorio-caixas.csv") {
    if (lotes.length === 0) return;

    let csvContent = "";

    if (lotes.length === 1) {
        const l = lotes[0];

        // Cabeçalho solicitado: Categoria, Descrição, Forma, Banco, Valor
        const headers = ["Tipo", "Descrição/Caixinha", "Forma de Pagamento", "Banco", "Valor (R$)"];

        const rows = (l.lancamentos || []).map((item: any) => [
            item.isSaida ? "SANGRIA/SAÍDA" : "ENTRADA",
            item.descricao || "-",
            item.formaPagamento || "Dinheiro",
            item.banco || "-",
            item.valor.toFixed(2).replace('.', ',')
        ]);

        // Adicionando as caixinhas (se houver um array separado de caixinhas no seu objeto l)
        // Caso as caixinhas estejam dentro de lancamentos com uma flag, o map acima já resolve.
        // Se estiverem em l.caixinhas, descomente as linhas abaixo:
        /*
        if (l.caixinhas) {
            l.caixinhas.forEach((c: any) => {
                rows.push(["CAIXINHA", c.descricao, "Dinheiro", "-", c.valor.toFixed(2).replace('.', ',')]);
            });
        }
        */

        const abertura = Number(l.valorAbertura || 0);
        const entradas = l.lancamentos?.filter((i: any) => !i.isSaida).reduce((acc: number, i: any) => acc + i.valor, 0) || 0;
        const saidas = l.lancamentos?.filter((i: any) => i.isSaida).reduce((acc: number, i: any) => acc + i.valor, 0) || 0;

        const resumo = [
            [`RELATÓRIO DE MOVIMENTAÇÃO - MARUJO`],
            [`DATA: ${new Date(l.dataReferencia).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} | PERÍODO: ${l.periodo}`],
            [],
            ["RESUMO DO CAIXA", ""],
            [`Abertura em Dinheiro`, abertura.toFixed(2).replace('.', ',')],
            [`(+) Total Entradas`, entradas.toFixed(2).replace('.', ',')],
            [`(-) Total Sangrias/Saídas`, saidas.toFixed(2).replace('.', ',')],
            [`(=) SALDO FINAL`, (abertura + entradas - saidas).toFixed(2).replace('.', ',')],
            [],
            ["DETALHAMENTO DE ENTRADAS, SANGRIAS E CAIXINHAS"],
        ];

        csvContent = [
            ...resumo.map((r: string[]) => r.join(";")),
            headers.join(";"),
            ...rows.map((row: string[]) => row.join(";"))
        ].join("\n");

    } else {
        // Modo lista para múltiplos lotes
        const headers = ["Data", "Período", "Status", "Abertura (R$)", "Entradas (R$)", "Saídas (R$)", "Saldo (R$)"];
        const rows = lotes.map((l: any) => {
            const entradas = l.lancamentos?.filter((i: any) => !i.isSaida).reduce((acc: number, i: any) => acc + i.valor, 0) || 0;
            const saidas = l.lancamentos?.filter((i: any) => i.isSaida).reduce((acc: number, i: any) => acc + i.valor, 0) || 0;
            const abertura = Number(l.valorAbertura) || 0;
            return [
                new Date(l.dataReferencia).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                l.periodo,
                l.conferido ? "Conferido" : "Pendente",
                abertura.toFixed(2).replace('.', ','),
                entradas.toFixed(2).replace('.', ','),
                saidas.toFixed(2).replace('.', ','),
                (abertura + entradas - saidas).toFixed(2).replace('.', ',')
            ];
        });
        csvContent = [headers.join(";"), ...rows.map((row: string[]) => row.join(";"))].join("\n");
    }

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", filename);
    link.click();
}