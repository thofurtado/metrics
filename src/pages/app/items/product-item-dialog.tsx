import {
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { GetItemsResponse } from '@/api/get-items'
import { ProductForm } from './forms/product-form'
import { ServiceForm } from './forms/service-form'
import { SupplyForm } from './forms/supply-form'

type ItemData = GetItemsResponse['items'][0]

interface ProductItemDialogProps {
    initialData?: ItemData
    initialType?: 'PRODUCT' | 'SERVICE' | 'SUPPLY'
    onSuccess?: () => void
}

export function ProductItemDialog({ initialData, initialType, onSuccess }: ProductItemDialogProps) {
    const isEdit = !!initialData

    // Determine the type: priorize initialData type if editing, else initialType or default to PRODUCT
    let type = initialType ?? 'PRODUCT'
    if (initialData) {
        if (initialData.product) type = 'PRODUCT'
        else if (initialData.service) type = 'SERVICE'
        else if (initialData.supply) type = 'SUPPLY'
    }

    const typeLabels = {
        'PRODUCT': 'Produto',
        'SERVICE': 'Serviço',
        'SUPPLY': 'Insumo'
    }

    return (
        <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0 sm:max-w-[700px] overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b shrink-0 bg-muted/40">
                <DialogTitle>{isEdit ? `Editar ${typeLabels[type]}` : `Novo ${typeLabels[type]}`}</DialogTitle>
                <DialogDescription>
                    {isEdit ? 'Atualize as informações do item.' : 'Preencha os dados abaixo para cadastrar.'}
                </DialogDescription>
            </DialogHeader>

            {type === 'PRODUCT' && (
                <ProductForm initialData={initialData} onSuccess={onSuccess} />
            )}
            {type === 'SERVICE' && (
                <ServiceForm initialData={initialData} onSuccess={onSuccess} />
            )}
            {type === 'SUPPLY' && (
                <SupplyForm initialData={initialData} onSuccess={onSuccess} />
            )}
        </DialogContent>
    )
}
