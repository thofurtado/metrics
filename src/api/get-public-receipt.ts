import { api } from '@/lib/axios'

export interface PublicTransactionReceipt {
    id: string;
    operation: 'income' | 'expense' | 'transfer';
    description: string | null;
    amount: number;
    totalValue: number | null;
    data_vencimento: string;
    data_emissao: string;
    confirmed: boolean;
    payment_method: string;
    attachment_url: string | null;
    supplier: { name: string } | null;
    sectors: { name: string } | null;
}

export async function getPublicReceipt(id: string): Promise<PublicTransactionReceipt> {
    const response = await api.get(`/public/transactions/${id}/receipt`, {
        // Garantindo que não usa Auth Headers
        headers: {
            Authorization: '' 
        }
    });

    return response.data;
}
