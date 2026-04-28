import { api } from "@/lib/axios";

export interface ReadjustTransactionGroupParams {
    groupId: string;
    mode: 'renegotiate' | 'fix';
    installmentsCount: number;
    totalAmount?: number;
    firstDueDate: string; // ISO date
}

export async function readjustTransactionGroup({ groupId, ...data }: ReadjustTransactionGroupParams) {
    await api.put(`/financial/transaction-groups/${groupId}/readjust`, data);
}
