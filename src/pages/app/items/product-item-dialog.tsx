import {
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog'
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
        <ResponsiveDialogContent className="fixed z-[9999] gap-0 p-0 bg-background w-full h-[100dvh] max-w-none shadow-none border-0 top-0 left-0 outline-none data-[state=open]:slide-in-from-bottom-0 sm:fixed sm:z-[9999] sm:left-[50%] sm:top-[50%] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-[800px] sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:border sm:shadow-2xl sm:data-[state=open]:slide-in-from-bottom-auto sm:data-[state=open]:slide-in-from-top-[48%] flex flex-col">

            <ResponsiveDialogHeader className="px-6 py-5 border-b shrink-0 bg-muted/40 text-left">
                <ResponsiveDialogTitle className="text-xl font-bold tracking-tight">
                    {isEdit ? `Editar ${typeLabels[type]}` : `Novo ${typeLabels[type]}`}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription className="text-sm text-muted-foreground">
                    {isEdit ? 'Atualize as informações do item abaixo.' : 'Preencha os dados abaixo para realizar o cadastro.'}
                </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            {type === 'PRODUCT' && (
                <ProductForm initialData={initialData} onSuccess={onSuccess} />
            )}
            {type === 'SERVICE' && (
                <ServiceForm initialData={initialData} onSuccess={onSuccess} />
            )}
            {type === 'SUPPLY' && (
                <SupplyForm initialData={initialData} onSuccess={onSuccess} />
            )}
        </ResponsiveDialogContent>
    )
}
