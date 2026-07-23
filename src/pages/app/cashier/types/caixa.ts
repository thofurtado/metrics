export interface Lancamento {
    id: number;
    mesa?: string;
    banco: string;
    formaPagamento: string;
    valor: number;
    isCaixinha: boolean;
    isSaida?: boolean;
    identificacao?: string;
    data: string;
}

export type StatusCaixa = 'pendente' | 'alerta' | 'conferido';

export interface LoteConferencia {
    id: string;
    dataReferencia: string;
    periodo: string;
    valorAbertura: number;
    status: StatusCaixa;
    lancamentos: Lancamento[];
}

export const BANCOS_DIGITAIS = ['SAFRA', 'PAGBANK', 'CIELO', 'IFOOD', 'STONE'];
export const FORMAS_BANCO = ['Pix', 'Voucher', 'Débito', 'Crédito'];
export const FORMAS_CASA = ['Funcionário', 'Pro-labore', 'Cortesia', 'Permuta'];