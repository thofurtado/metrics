import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicReceipt, PublicTransactionReceipt } from '@/api/get-public-receipt';
import { FileText, Calendar, Wallet, CheckCircle, Tag, Building2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/axios';

// Utilizando api.defaults.baseURL ou variável de ambiente para montar URL do arquivo
const BASE_URL = import.meta.env.VITE_API_URL || '';

export function ReceiptPage() {
    const { transactionId } = useParams<{ transactionId: string }>();
    const [receipt, setReceipt] = useState<PublicTransactionReceipt | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!transactionId) return;

        getPublicReceipt(transactionId)
            .then(data => {
                setReceipt(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Comprovante não encontrado ou erro ao carregar.');
                setLoading(false);
            });
    }, [transactionId]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-32 w-full mt-4" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !receipt) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-destructive/50">
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                        <h2 className="text-xl font-bold mb-2">Ops!</h2>
                        <p className="text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isExpense = receipt.operation === 'expense';
    const isImage = receipt.attachment_url?.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const fullAttachmentUrl = receipt.attachment_url ? `${BASE_URL}${receipt.attachment_url}` : null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
            
            <div className="w-full max-w-xl">
                {/* Header Logo Area */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary rounded-lg text-primary-foreground">
                            <FileText size={24} />
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-foreground">Metrics</span>
                    </div>
                </div>

                <Card className="shadow-lg border-muted/50 overflow-hidden bg-white">
                    {/* Color Banner */}
                    <div className={`h-2 w-full ${isExpense ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl font-bold">Comprovante</CardTitle>
                        <CardDescription>Visualização segura de documento</CardDescription>
                    </CardHeader>

                    <CardContent className="pt-4 pb-6 space-y-6">
                        
                        <div className="flex justify-between items-center bg-muted/40 p-4 rounded-xl border border-border/50">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                                <div className="flex items-center">
                                    {receipt.confirmed ? (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Confirmado
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200">
                                            Pendente
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-muted-foreground mb-1">Valor Total</p>
                                <p className={`text-2xl font-bold tracking-tight ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {formatCurrency(receipt.totalValue || receipt.amount)}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="flex items-start">
                                    <Tag className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Descrição</p>
                                        <p className="font-medium text-sm">{receipt.description || 'Sem descrição'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <Building2 className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Fornecedor / Emitente</p>
                                        <p className="font-medium text-sm">{receipt.supplier?.name || '-'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex items-start">
                                    <Calendar className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Data Vencimento</p>
                                        <p className="font-medium text-sm">
                                            {receipt.data_vencimento ? format(new Date(receipt.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <Wallet className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Pagamento</p>
                                        <p className="font-medium text-sm uppercase">{receipt.payment_method}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="my-6 border-border" />

                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Documento Anexado</h3>
                            
                            {!fullAttachmentUrl ? (
                                <div className="flex flex-col items-center justify-center p-8 bg-muted/30 border border-dashed rounded-xl">
                                    <FileText className="w-10 h-10 text-muted-foreground/40 mb-2" />
                                    <p className="text-sm font-medium text-muted-foreground">Nenhum anexo disponível</p>
                                </div>
                            ) : (
                                <div className="rounded-xl overflow-hidden border shadow-sm">
                                    {isImage ? (
                                        <div className="bg-muted p-2">
                                            <img 
                                                src={fullAttachmentUrl} 
                                                alt="Comprovante" 
                                                className="w-full max-h-[600px] object-contain rounded-lg"
                                            />
                                        </div>
                                    ) : (
                                        <div className="aspect-auto h-[500px] w-full">
                                            <iframe 
                                                src={fullAttachmentUrl} 
                                                className="w-full h-full border-0"
                                                title="Comprovante PDF"
                                            />
                                        </div>
                                    )}
                                    <div className="bg-muted/50 p-3 border-t text-center">
                                        <a 
                                            href={fullAttachmentUrl} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-sm font-medium text-primary hover:underline inline-flex items-center"
                                        >
                                            <FileText className="w-4 h-4 mr-1" />
                                            Abrir arquivo em nova aba
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                
                <p className="text-center text-xs text-muted-foreground mt-8">
                    Gerado pelo Sistema Metrics • Este é um documento digital de uso institucional
                </p>
            </div>
        </div>
    );
}
