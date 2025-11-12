// src/pages/app/items/items.tsx

import { Helmet } from 'react-helmet-async'
import { Hammer, Ban, Construction } from 'lucide-react'

export function Items() {
    return (
        <>
            <Helmet title="Itens" />
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">

                <Ban className="h-16 w-16 text-red-500 mb-4 opacity-70" />
                <Construction className="h-12 w-12 text-yellow-500 mb-4" />

                <h1 className="text-3xl font-bold tracking-tight text-minsk-800 dark:text-minsk-200 sm:text-4xl">
                    Itens
                </h1>

                <p className="mt-4 text-lg text-minsk-600 dark:text-minsk-400 max-w-md">
                    Esta funcionalidade ainda está em desenvolvimento e não foi implementada.
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm text-minsk-500 dark:text-minsk-400">
                    <Hammer className="h-4 w-4" />
                    <p>Volte em breve para conferir as novidades!</p>
                </div>
            </div>
        </>
    )
}